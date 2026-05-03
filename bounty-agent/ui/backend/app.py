"""
Bounty Agent UI — FastAPI backend
Accepts hunt targets, runs orchestrator subprocess, streams live updates via WebSocket.
"""

import asyncio
import json
import os
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="Bounty Agent")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

REPO_ROOT = Path(__file__).parent.parent.parent.parent
BOUNTY_DIR = Path(__file__).parent.parent
HUNTS_DIR = BOUNTY_DIR / "hunts"
HUNTS_DIR.mkdir(exist_ok=True)

# In-memory hunt registry
hunts: Dict[str, dict] = {}
# WebSocket connection pools per hunt
ws_pools: Dict[str, list[WebSocket]] = {}


class HuntRequest(BaseModel):
    target: str          # H1 program handle OR domain URL
    mode: str = "auto"   # auto | dry_run
    min_bounty: float = 100


class HuntEvent(BaseModel):
    hunt_id: str
    type: str      # phase | log | finding | stat | complete | error
    data: dict


async def broadcast(hunt_id: str, event: dict):
    """Send event to all connected WebSocket clients for this hunt."""
    dead = []
    for ws in ws_pools.get(hunt_id, []):
        try:
            await ws.send_json(event)
        except Exception:
            dead.append(ws)
    for ws in dead:
        ws_pools.get(hunt_id, []).remove(ws)


def make_event(hunt_id: str, type: str, **data) -> dict:
    return {
        "hunt_id": hunt_id,
        "type": type,
        "ts": datetime.now(timezone.utc).isoformat(),
        "data": data,
    }


async def run_hunt(hunt_id: str, request: HuntRequest):
    """Run orchestrator subprocess and stream its output."""
    hunt = hunts[hunt_id]
    hunt["status"] = "running"

    PHASES = ["discovery", "recon", "hunting", "triage", "reporting"]
    phase_idx = 0

    await broadcast(hunt_id, make_event(hunt_id, "phase",
        phase="discovery", status="active", phases=PHASES))

    # Build command
    orch = BOUNTY_DIR / "orchestrator.py"
    cmd = [sys.executable, str(orch)]
    if request.target and not request.target.startswith("http"):
        cmd += ["--program", request.target]
    elif request.target.startswith("http"):
        cmd += ["--target-url", request.target]
    if request.mode == "dry_run":
        cmd += ["--dry-run"]
    cmd += ["--min-bounty", str(request.min_bounty)]

    env = {**os.environ, "PYTHONPATH": str(BOUNTY_DIR), "PYTHONUNBUFFERED": "1"}

    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT,
            cwd=str(BOUNTY_DIR), env=env,
        )
        hunt["pid"] = proc.pid

        async for raw_line in proc.stdout:
            line = raw_line.decode(errors="replace").rstrip()
            if not line:
                continue

            hunt["logs"].append(line)

            # Detect phase transitions from log output
            for i, phase in enumerate(PHASES):
                if f"phase complete" in line.lower() and phase in line.lower():
                    phase_idx = i + 1
                    if phase_idx < len(PHASES):
                        await broadcast(hunt_id, make_event(hunt_id, "phase",
                            phase=PHASES[phase_idx], status="active", phases=PHASES,
                            completed=PHASES[:phase_idx]))

            # Detect findings
            if "hunt: [" in line:
                sev = "high"
                for s in ["CRITICAL", "HIGH", "MEDIUM", "LOW"]:
                    if f"[{s}]" in line.upper():
                        sev = s.lower()
                        break
                title = line.split("]")[-1].strip(" —").split("—")[0].strip()
                url = line.split("—")[-1].strip() if "—" in line else ""
                finding = {"severity": sev, "title": title, "url": url}
                hunt["findings"].append(finding)
                await broadcast(hunt_id, make_event(hunt_id, "finding", **finding))

            # Detect stats
            if "subdomains" in line or "live hosts" in line:
                import re
                nums = re.findall(r"\d+", line)
                if nums:
                    stat_key = "subdomains" if "subdomain" in line else "live_hosts"
                    hunt["stats"][stat_key] = int(nums[0])
                    await broadcast(hunt_id, make_event(hunt_id, "stat",
                        key=stat_key, value=int(nums[0])))

            await broadcast(hunt_id, make_event(hunt_id, "log", line=line))

        await proc.wait()
        hunt["status"] = "done" if proc.returncode == 0 else "error"
        await broadcast(hunt_id, make_event(hunt_id, "complete",
            status=hunt["status"],
            findings_count=len(hunt["findings"]),
            branch=hunt.get("branch", ""),
        ))

    except Exception as e:
        hunt["status"] = "error"
        await broadcast(hunt_id, make_event(hunt_id, "error", message=str(e)))


# ── REST API ──────────────────────────────────────────────────────────────────

@app.post("/api/hunts")
async def start_hunt(request: HuntRequest, background_tasks=None):
    hunt_id = str(uuid.uuid4())[:8]
    hunts[hunt_id] = {
        "id": hunt_id,
        "target": request.target,
        "status": "queued",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "logs": [],
        "findings": [],
        "stats": {"subdomains": 0, "live_hosts": 0, "cost_usd": 0},
        "branch": f"hunt/h1-{request.target.strip('/'  ).split('/')[-1]}-{datetime.now().strftime('%Y%m%d')}",
        "pid": None,
    }
    ws_pools[hunt_id] = []
    asyncio.create_task(run_hunt(hunt_id, request))
    return {"hunt_id": hunt_id, "status": "queued"}


@app.get("/api/hunts")
def list_hunts():
    return list(hunts.values())


@app.get("/api/hunts/{hunt_id}")
def get_hunt(hunt_id: str):
    return hunts.get(hunt_id, {"error": "not found"})


@app.delete("/api/hunts/{hunt_id}")
async def stop_hunt(hunt_id: str):
    hunt = hunts.get(hunt_id)
    if hunt and hunt.get("pid"):
        import signal
        try:
            os.kill(hunt["pid"], signal.SIGTERM)
        except Exception:
            pass
        hunt["status"] = "stopped"
        await broadcast(hunt_id, make_event(hunt_id, "complete", status="stopped"))
    return {"status": "stopped"}


# ── WebSocket ─────────────────────────────────────────────────────────────────

@app.websocket("/ws/{hunt_id}")
async def websocket_endpoint(ws: WebSocket, hunt_id: str):
    await ws.accept()
    ws_pools.setdefault(hunt_id, []).append(ws)

    # Send current state to new connection
    hunt = hunts.get(hunt_id)
    if hunt:
        await ws.send_json(make_event(hunt_id, "init",
            hunt=hunt, logs=hunt["logs"][-200:]))

    try:
        while True:
            await ws.receive_text()  # keep-alive
    except WebSocketDisconnect:
        if hunt_id in ws_pools and ws in ws_pools[hunt_id]:
            ws_pools[hunt_id].remove(ws)


# ── Serve frontend ────────────────────────────────────────────────────────────

frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=7331, reload=True)
