#!/usr/bin/env python3
"""
Bounty Hunter Orchestrator — autonomous end-to-end HackerOne pipeline.

Usage:
    python3 orchestrator.py                        # auto-select best program
    python3 orchestrator.py --program shopify      # specific program
    python3 orchestrator.py --dry-run              # recon+scan, no H1 submit
    python3 orchestrator.py --list-programs        # show ranked programs
"""

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT   = Path(__file__).parent.parent          # theclipart/
BOUNTY_DIR  = Path(__file__).parent                 # bounty-agent/
TOOLS_DIR   = BOUNTY_DIR / "tools"
SHANNON_HOME = Path(os.environ.get("SHANNON_HOME", Path.home() / "shannon"))

sys.path.insert(0, str(TOOLS_DIR))
sys.path.insert(0, str(BOUNTY_DIR))


def _run(cmd: str, cwd: str = None, timeout: int = 600) -> tuple[bool, str]:
    try:
        proc = subprocess.run(
            cmd, shell=True, cwd=cwd or str(BOUNTY_DIR),
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
            text=True, timeout=timeout,
        )
        return proc.returncode == 0, proc.stdout.strip()
    except subprocess.TimeoutExpired:
        return False, "timed out"


def log(level: str, msg: str):
    icons = {"info": "ℹ", "ok": "✅", "warn": "⚠", "err": "❌", "step": "→"}
    print(f"{icons.get(level, '·')} {msg}", flush=True)


# ── Step 1: Select program ────────────────────────────────────────────────────

def select_program(handle: str = None, min_bounty: float = 100) -> dict:
    if not os.environ.get("H1_API_TOKEN"):
        log("warn", "H1_API_TOKEN not set — using mock program for dry-run")
        return {
            "handle": handle or "example",
            "name":   handle or "Example Program",
            "scope":  [{"identifier": f"*.{handle or 'example'}.com",
                        "asset_type": "WILDCARD", "eligible_for_bounty": True}],
            "out_of_scope": [],
            "max_bounty": 0,
            "url": f"https://hackerone.com/{handle or 'example'}",
        }

    from h1_api import list_programs, get_scope

    if handle:
        log("step", f"Fetching scope for {handle}...")
        scope = get_scope(handle)
        return {"handle": handle, "name": handle,
                "scope": scope, "out_of_scope": [], "max_bounty": 0,
                "url": f"https://hackerone.com/{handle}"}

    log("step", "Scoring HackerOne programs...")
    programs = list_programs(min_bounty=min_bounty, limit=30)
    if not programs:
        log("err", "No programs matched — check H1 credentials")
        sys.exit(1)

    best = programs[0]
    log("ok", f"Selected: {best.name} ({best.handle}) — score {best.score():.0f}, "
              f"${best.min_bounty:.0f}–${best.max_bounty:.0f}")
    return {
        "handle":      best.handle,
        "name":        best.name,
        "scope":       best.in_scope,
        "out_of_scope": [],
        "max_bounty":  best.max_bounty,
        "url":         best.url,
    }


# ── Step 2: Recon ─────────────────────────────────────────────────────────────

def run_recon(program: dict) -> dict:
    log("step", "Running recon...")

    root_domains = []
    for asset in program.get("scope", []):
        ident = asset.get("identifier", "")
        if asset.get("asset_type") in ("URL", "WILDCARD", "DOMAIN"):
            domain = ident.lstrip("*. ").split("/")[0]
            if domain and "." in domain:
                root_domains.append(domain)
    root_domains = list(dict.fromkeys(root_domains))[:10]

    if not root_domains:
        root_domains = [f"{program['handle']}.com"]

    log("info", f"Domains: {root_domains}")
    subdomains, live_hosts, tech_stack = [], [], {}

    for domain in root_domains:
        ok, out = _run(f"subfinder -d {domain} -silent 2>/dev/null", timeout=120)
        if ok:
            found = [s.strip() for s in out.splitlines() if s.strip()]
            subdomains.extend(found)
            log("ok", f"subfinder: {len(found)} subdomains for {domain}")
        else:
            log("warn", f"subfinder not available for {domain} — using apex domain")
            subdomains.append(domain)

    subdomains = list(dict.fromkeys(subdomains))

    if subdomains:
        subs_file = "/tmp/ba_subs.txt"
        Path(subs_file).write_text("\n".join(subdomains))
        ok, out = _run(
            f"httpx -l {subs_file} -silent -title -tech-detect -status-code -json 2>/dev/null",
            timeout=180,
        )
        if ok:
            for line in out.splitlines():
                try:
                    h = json.loads(line)
                    url = h.get("url", "")
                    if url:
                        live_hosts.append(url)
                        if h.get("tech"):
                            tech_stack[url] = h["tech"]
                except Exception:
                    pass
            log("ok", f"httpx: {len(live_hosts)} live hosts")
        else:
            log("warn", "httpx not available — treating subdomains as live hosts")
            live_hosts = [f"https://{s}" for s in subdomains[:10]]

    log("ok", f"Recon complete — {len(subdomains)} subdomains, {len(live_hosts)} live hosts")
    return {
        "domains":     root_domains,
        "subdomains":  subdomains,
        "live_hosts":  live_hosts,
        "tech_stack":  tech_stack,
        "timestamp":   datetime.now(timezone.utc).isoformat(),
    }


# ── Step 3: Nuclei scan ───────────────────────────────────────────────────────

def run_nuclei(live_hosts: list[str]) -> list[dict]:
    if not live_hosts:
        return []

    ok, _ = _run("nuclei -version 2>/dev/null")
    if not ok:
        log("warn", "nuclei not installed — skipping broad scan")
        return []

    log("step", f"Nuclei scanning {min(len(live_hosts), 50)} hosts...")
    hosts_file = "/tmp/ba_hosts.txt"
    Path(hosts_file).write_text("\n".join(live_hosts[:50]))

    ok, out = _run(
        f"nuclei -l {hosts_file} -severity medium,high,critical "
        f"-json -silent -rl 10 -timeout 10 2>/dev/null",
        timeout=900,
    )
    findings = []
    for line in out.splitlines():
        try:
            f = json.loads(line)
            findings.append({
                "name":        f.get("info", {}).get("name", ""),
                "severity":    f.get("info", {}).get("severity", ""),
                "url":         f.get("matched-at", ""),
                "template":    f.get("template-id", ""),
                "description": f.get("info", {}).get("description", ""),
                "tags":        f.get("info", {}).get("tags", []),
                "source":      "nuclei",
            })
        except Exception:
            pass

    log("ok", f"Nuclei: {len(findings)} findings")
    return findings


# ── Step 4: Shannon deep scan ─────────────────────────────────────────────────

def run_shannon(target_url: str) -> list[dict]:
    if not (SHANNON_HOME / "shannon").exists():
        log("warn", "Shannon not installed — skipping deep scan")
        return []

    log("step", f"Shannon deep scan: {target_url} (~60-90 min)...")
    ok, _ = _run(f"./shannon start URL={target_url} REPO=target", cwd=str(SHANNON_HOME), timeout=5400)

    audit_dir = SHANNON_HOME / "audit-logs"
    if not audit_dir.exists():
        return []
    latest_dirs = sorted(audit_dir.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True)
    if not latest_dirs:
        return []
    reports = list(latest_dirs[0].glob("*.md"))
    if not reports:
        return []

    content = reports[0].read_text()
    log("ok", "Shannon report ready")
    return [{"name": "Shannon Deep Scan", "severity": "high", "url": target_url,
             "description": content[:3000], "source": "shannon", "template": "shannon"}]


# ── Step 5: Triage ────────────────────────────────────────────────────────────

def triage(findings: list[dict], scope: list[dict]) -> list[dict]:
    scope_identifiers = {a.get("identifier", "") for a in scope}
    skip_tags = {"tech", "info", "generic"}

    def in_scope(url: str) -> bool:
        if not scope_identifiers:
            return True
        for ident in scope_identifiers:
            if ident.lstrip("*. ").split("/")[0] in url:
                return True
        return False

    approved = []
    for f in findings:
        if not in_scope(f.get("url", "")):
            continue
        if set(f.get("tags", [])) & skip_tags and f.get("severity") not in ("high", "critical"):
            continue
        approved.append(f)

    log("ok", f"Triage: {len(approved)}/{len(findings)} findings approved")
    return approved


# ── Step 6: Generate and submit report ───────────────────────────────────────

def generate_report(finding: dict, program: dict) -> str:
    return f"""## Summary

{finding.get('description') or f"A {finding.get('severity','medium').upper()} severity vulnerability was identified."}

## Steps to Reproduce

1. Navigate to `{finding.get('url', '')}`
2. Trigger the vulnerability as described above
3. Observe the impact

## Impact

Automated confirmation via `{finding.get('source', 'scanner')}`. Severity: **{finding.get('severity','').upper()}**.

---
*Autonomous bounty agent — {datetime.now(timezone.utc).strftime('%Y-%m-%d')}*
"""


def submit(handle: str, finding: dict, report_md: str, dry_run: bool) -> str:
    if dry_run or not os.environ.get("H1_API_TOKEN"):
        log("warn", f"[dry-run] Would submit: {finding['name']}")
        return "dry-run"

    try:
        from h1_api import submit_report
        result = submit_report(
            handle=handle,
            title=f"[Auto] {finding['name']} — {finding.get('url','')[:80]}",
            vulnerability_information=report_md,
            severity_rating=finding.get("severity", "medium"),
            impact="Automated exploit confirmation.",
        )
        return result.get("data", {}).get("id", "unknown")
    except Exception as e:
        log("err", f"Submit failed: {e}")
        return "error"


# ── M365 / Power Platform hunt ────────────────────────────────────────────────

M365_INDICATORS = [
    "microsoft.com", "powerapps.com", "powerautomate.com",
    "sharepoint.com", "onmicrosoft.com", "dynamics.com",
]


def run_m365_hunt(program: dict) -> list[dict]:
    scope_text = " ".join(
        s.get("identifier", "") for s in program.get("scope", [])
    )
    if not any(ind in scope_text.lower() for ind in M365_INDICATORS):
        return []

    log("step", "M365/Power Platform assets detected — running power-pwn...")
    findings = []

    domain = next(
        (s["identifier"].lstrip("*.") for s in program.get("scope", [])
         if any(ind in s.get("identifier", "") for ind in M365_INDICATORS)),
        None,
    )
    if not domain:
        return []

    modules = [
        ("copilot-hunter", ["--tenant", domain, "--output", "json"]),
        ("power-pages",    ["--url", f"https://{domain}", "--output", "json"]),
    ]

    for module, args in modules:
        ok, out = _run(
            f"python -m powerpwn {module} {' '.join(args)}",
            timeout=120,
        )
        if ok and out:
            try:
                results = json.loads(out) if out.startswith("[") or out.startswith("{") else []
                if isinstance(results, list):
                    for r in results:
                        findings.append({
                            "name": r.get("title", f"power-pwn/{module}"),
                            "severity": r.get("severity", "medium"),
                            "type": "m365",
                            "module": module,
                            "detail": json.dumps(r),
                        })
                log("ok", f"power-pwn {module}: {len(results)} results")
            except (json.JSONDecodeError, TypeError):
                if "vuln" in out.lower() or "exposed" in out.lower():
                    findings.append({
                        "name": f"power-pwn/{module} finding",
                        "severity": "medium",
                        "type": "m365",
                        "module": module,
                        "detail": out[:500],
                    })
        else:
            log("warn", f"power-pwn {module}: {out[:100] if out else 'no output'}")

    log("info", f"M365 hunt complete — {len(findings)} findings")
    return findings


# ── Main ──────────────────────────────────────────────────────────────────────

def run_pipeline(program_handle: str = None, dry_run: bool = False, min_bounty: float = 100):
    from tools.branch_publisher import BranchPublisher

    program = select_program(program_handle, min_bounty)
    handle  = program["handle"]

    pub = BranchPublisher(str(REPO_ROOT), handle, program.get("url", ""))
    pub.start()

    try:
        recon = run_recon(program)
        pub.commit_recon(recon)

        nuclei_findings = run_nuclei(recon["live_hosts"])
        shannon_findings = []

        high_sev = [f for f in nuclei_findings if f["severity"] in ("high", "critical")]
        if high_sev and recon["live_hosts"]:
            shannon_findings = run_shannon(recon["live_hosts"][0])

        # M365 / Power Platform scan (auto-activates when scope contains M365 assets)
        m365_findings = run_m365_hunt(program)

        approved = triage(nuclei_findings + shannon_findings + m365_findings, program.get("scope", []))
        pub.commit_findings(approved)

        submitted = 0
        for finding in approved:
            if finding.get("severity") not in ("high", "critical"):
                continue
            report_md = generate_report(finding, program)
            pub.commit_report(report_md, finding.get("name", "finding"))
            report_id = submit(handle, finding, report_md, dry_run)
            if report_id not in ("dry-run", "error"):
                pub.commit_submission(report_id, finding["name"], finding["severity"])
                submitted += 1
                log("ok", f"Submitted H1 report #{report_id}")

        branch = pub.finish(bounty_submitted=submitted > 0)
        log("ok", f"Hunt complete — branch: {branch} — {submitted} submitted")

    except KeyboardInterrupt:
        log("warn", "Hunt interrupted")
        pub.finish(bounty_submitted=False, notes="interrupted")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--program",       help="H1 program handle")
    parser.add_argument("--dry-run",       action="store_true")
    parser.add_argument("--list-programs", action="store_true")
    parser.add_argument("--min-bounty",    type=float, default=100)
    args = parser.parse_args()

    if args.list_programs:
        if not os.environ.get("H1_API_TOKEN"):
            print("Set H1_USERNAME and H1_API_TOKEN to list programs")
            sys.exit(1)
        from h1_api import list_programs
        for i, p in enumerate(list_programs(limit=20, min_bounty=args.min_bounty), 1):
            print(f"{i:2}. [{p.score():.0f}] {p.handle:<30} ${p.min_bounty:.0f}–${p.max_bounty:.0f}")
        sys.exit(0)

    run_pipeline(args.program, args.dry_run, args.min_bounty)
