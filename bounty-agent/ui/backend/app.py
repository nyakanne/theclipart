"""
Bounty Agent UI — FastAPI backend
Runs on Railway / Render / any VPS. Netlify frontend talks to this via VITE_API_URL.

Real-time updates use SSE (EventSource) instead of WebSockets — works across
origins, CDNs, and serverless proxies without special upgrade handling.
"""

import asyncio
import json
import os
import signal
import subprocess
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import AsyncIterator, Dict

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

app = FastAPI(title="Bounty Agent")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],       # tighten to your Netlify domain in prod
    allow_methods=["*"],
    allow_headers=["*"],
)

BOUNTY_DIR = Path(__file__).parent.parent.parent
HUNTS_DIR  = BOUNTY_DIR / "hunts"
HUNTS_DIR.mkdir(exist_ok=True)

# In-memory state (resets on restart — wire up a DB/Redis for persistence)
hunts: Dict[str, dict] = {}
# Per-hunt async queues for SSE broadcast
hunt_queues: Dict[str, list[asyncio.Queue]] = {}


class HuntRequest(BaseModel):
    target: str
    mode: str = "auto"
    min_bounty: float = 100


# ── Helpers ───────────────────────────────────────────────────────────────────

def make_event(hunt_id: str, type: str, **data) -> dict:
    return {
        "hunt_id": hunt_id,
        "type": type,
        "ts": datetime.now(timezone.utc).isoformat(),
        "data": data,
    }


async def broadcast(hunt_id: str, event: dict):
    for q in hunt_queues.get(hunt_id, []):
        try:
            q.put_nowait(event)
        except asyncio.QueueFull:
            pass


def sse_format(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


# ── Hunt runner ───────────────────────────────────────────────────────────────

async def run_hunt(hunt_id: str, req: HuntRequest):
    hunt = hunts[hunt_id]
    hunt["status"] = "running"

    PHASES = ["discovery", "recon", "hunting", "triage", "reporting"]
    await broadcast(hunt_id, make_event(hunt_id, "phase",
        phase="discovery", status="active", phases=PHASES, completed=[]))

    orch = BOUNTY_DIR / "orchestrator.py"
    cmd = [sys.executable, str(orch)]
    if req.target and not req.target.startswith("http"):
        cmd += ["--program", req.target]
    elif req.target.startswith("http"):
        cmd += ["--target-url", req.target]
    if req.mode == "dry_run":
        cmd += ["--dry-run"]
    cmd += ["--min-bounty", str(req.min_bounty)]

    env = {**os.environ, "PYTHONPATH": str(BOUNTY_DIR), "PYTHONUNBUFFERED": "1"}

    import re
    try:
        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.STDOUT,
            cwd=str(BOUNTY_DIR),
            env=env,
        )
        hunt["pid"] = proc.pid

        async for raw in proc.stdout:
            line = raw.decode(errors="replace").rstrip()
            if not line:
                continue

            hunt["logs"].append(line)
            await broadcast(hunt_id, make_event(hunt_id, "log", line=line))

            # Phase transitions
            for i, phase in enumerate(PHASES):
                if "phase complete" in line.lower() and phase in line.lower():
                    completed = PHASES[:i + 1]
                    next_phase = PHASES[i + 1] if i + 1 < len(PHASES) else None
                    if next_phase:
                        await broadcast(hunt_id, make_event(hunt_id, "phase",
                            phase=next_phase, status="active",
                            phases=PHASES, completed=completed))

            # Findings
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

            # Stats
            nums = re.findall(r"\d+", line)
            if nums:
                if "subdomain" in line:
                    hunt["stats"]["subdomains"] = int(nums[0])
                    await broadcast(hunt_id, make_event(hunt_id, "stat",
                        key="subdomains", value=int(nums[0])))
                elif "live host" in line:
                    hunt["stats"]["live_hosts"] = int(nums[0])
                    await broadcast(hunt_id, make_event(hunt_id, "stat",
                        key="live_hosts", value=int(nums[0])))

        await proc.wait()
        final_status = "done" if proc.returncode == 0 else "error"
        hunt["status"] = final_status
        await broadcast(hunt_id, make_event(hunt_id, "complete",
            status=final_status,
            findings_count=len(hunt["findings"]),
            branch=hunt.get("branch", ""),
        ))

    except Exception as e:
        hunt["status"] = "error"
        await broadcast(hunt_id, make_event(hunt_id, "error", message=str(e)))
    finally:
        # Drain all subscriber queues with a sentinel
        for q in hunt_queues.get(hunt_id, []):
            try:
                q.put_nowait(None)
            except asyncio.QueueFull:
                pass


# ── REST endpoints ────────────────────────────────────────────────────────────

@app.post("/api/hunts")
async def start_hunt(req: HuntRequest):
    hunt_id = str(uuid.uuid4())[:8]
    date_str = datetime.now().strftime("%Y%m%d")
    safe_target = req.target.strip("/").split("/")[-1].replace("https:", "").strip(".")
    hunts[hunt_id] = {
        "id":         hunt_id,
        "target":     req.target,
        "status":     "queued",
        "started_at": datetime.now(timezone.utc).isoformat(),
        "logs":       [],
        "findings":   [],
        "stats":      {"subdomains": 0, "live_hosts": 0, "cost_usd": 0.0},
        "branch":     f"hunt/h1-{safe_target}-{date_str}",
        "pid":        None,
    }
    hunt_queues[hunt_id] = []
    asyncio.create_task(run_hunt(hunt_id, req))
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
        try:
            os.kill(hunt["pid"], signal.SIGTERM)
        except ProcessLookupError:
            pass
        hunt["status"] = "stopped"
        await broadcast(hunt_id, make_event(hunt_id, "complete", status="stopped"))
    return {"status": "stopped"}


# ── SSE stream ────────────────────────────────────────────────────────────────

@app.get("/api/hunts/{hunt_id}/stream")
async def stream_hunt(hunt_id: str, request: Request):
    """
    Server-Sent Events endpoint. The browser's EventSource connects here.
    Works across origins (CORS headers set above), CDN proxies, Netlify redirects.
    """
    hunt = hunts.get(hunt_id)
    if not hunt:
        return {"error": "not found"}

    q: asyncio.Queue = asyncio.Queue(maxsize=500)
    hunt_queues.setdefault(hunt_id, []).append(q)

    async def event_generator() -> AsyncIterator[str]:
        # Replay recent history to the new subscriber
        yield sse_format(make_event(hunt_id, "init",
            hunt={k: v for k, v in hunt.items() if k != "logs"},
            logs=hunt["logs"][-200:],
        ))

        try:
            while True:
                if await request.is_disconnected():
                    break
                try:
                    event = await asyncio.wait_for(q.get(), timeout=25.0)
                    if event is None:   # sentinel — hunt finished
                        break
                    yield sse_format(event)
                except asyncio.TimeoutError:
                    yield ": keepalive\n\n"   # prevent proxy timeout
        finally:
            try:
                hunt_queues[hunt_id].remove(q)
            except (KeyError, ValueError):
                pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control":    "no-cache",
            "X-Accel-Buffering": "no",   # disable nginx buffering
            "Connection":       "keep-alive",
        },
    )


# ── Health check ──────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "hunts": len(hunts)}


# ── Serve built frontend (production single-binary mode) ──────────────────────

frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/", StaticFiles(directory=str(frontend_dist), html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7331))
    uvicorn.run("app:app", host="0.0.0.0", port=port, reload=False)
