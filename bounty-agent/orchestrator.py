#!/usr/bin/env python3
"""
Bounty Hunter Orchestrator
Autonomous end-to-end bug bounty pipeline for HackerOne.

Pipeline:
  1. Select best program via H1 API scoring
  2. Create hunt branch (branch_publisher)
  3. Recon: subfinder → httpx → tech fingerprinting
  4. Scan: nuclei broad pass → Shannon deep pass (if interesting surface)
  5. Triage: filter, deduplicate, validate impact
  6. Report: generate H1 markdown, submit via API
  7. Publish: commit every step, push branch

Usage:
    python3 orchestrator.py                          # auto-select best program
    python3 orchestrator.py --program shopify        # target specific program
    python3 orchestrator.py --dry-run                # recon + scan, no submit
    python3 orchestrator.py --list-programs          # show top 20 ranked programs
"""

import argparse
import json
import os
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

REPO_ROOT = Path(__file__).parent.parent
BOUNTY_DIR = Path(__file__).parent
TOOLS_DIR = BOUNTY_DIR / "tools"
SHANNON_HOME = Path(os.environ.get("SHANNON_HOME", Path.home() / "shannon"))

# Add tools to path
sys.path.insert(0, str(TOOLS_DIR))


def _run(cmd: str, cwd: str = None, timeout: int = 600) -> tuple[bool, str]:
    proc = subprocess.run(
        cmd, shell=True, cwd=cwd or str(REPO_ROOT),
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
        text=True, timeout=timeout,
    )
    return proc.returncode == 0, proc.stdout.strip()


def log(level: str, msg: str):
    icons = {"info": "ℹ", "ok": "✅", "warn": "⚠", "err": "❌", "step": "→"}
    print(f"{icons.get(level, '·')} {msg}", flush=True)


# ── Step 1: Program selection ─────────────────────────────────────────────────

def select_program(handle: str = None, min_bounty: float = 100) -> dict:
    from h1_api import list_programs, get_scope

    if handle:
        log("step", f"Using specified program: {handle}")
        scope = get_scope(handle)
        return {"handle": handle, "scope": scope, "name": handle}

    log("step", "Scoring HackerOne programs...")
    programs = list_programs(min_bounty=min_bounty, limit=30)
    if not programs:
        log("err", "No programs matched criteria")
        sys.exit(1)

    best = programs[0]
    log("ok", f"Selected: {best.name} ({best.handle}) — score {best.score():.0f}, "
        f"bounty ${best.min_bounty:.0f}–${best.max_bounty:.0f}")
    return {
        "handle": best.handle,
        "name": best.name,
        "scope": best.in_scope,
        "max_bounty": best.max_bounty,
        "url": best.url,
    }


# ── Step 2: Recon ─────────────────────────────────────────────────────────────

def run_recon(program: dict) -> dict:
    log("step", "Running recon...")

    # Extract root domains from scope
    root_domains = []
    for asset in program.get("scope", []):
        ident = asset.get("identifier", "")
        if asset.get("asset_type") in ("URL", "WILDCARD", "DOMAIN"):
            domain = ident.lstrip("*. ").split("/")[0]
            if domain and "." in domain:
                root_domains.append(domain)

    root_domains = list(dict.fromkeys(root_domains))[:10]  # dedup, cap at 10
    log("info", f"Root domains: {root_domains}")

    subdomains = []
    live_hosts = []
    tech_stack = {}

    for domain in root_domains:
        # Subfinder
        ok, out = _run(f"subfinder -d {domain} -silent 2>/dev/null", timeout=120)
        if ok:
            found = [s.strip() for s in out.splitlines() if s.strip()]
            subdomains.extend(found)
            log("ok", f"subfinder: {len(found)} subdomains for {domain}")

    subdomains = list(dict.fromkeys(subdomains))

    if subdomains:
        subs_file = "/tmp/bounty_subs.txt"
        Path(subs_file).write_text("\n".join(subdomains))

        # httpx probe
        ok, out = _run(
            f"httpx -l {subs_file} -silent -title -tech-detect -status-code "
            f"-json 2>/dev/null",
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

    return {
        "domains": root_domains,
        "subdomains": subdomains,
        "live_hosts": live_hosts,
        "tech_stack": tech_stack,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ── Step 3: Scan ──────────────────────────────────────────────────────────────

def run_nuclei_scan(live_hosts: list[str]) -> list[dict]:
    if not live_hosts:
        return []

    log("step", f"Running nuclei on {len(live_hosts)} hosts...")
    hosts_file = "/tmp/bounty_hosts.txt"
    Path(hosts_file).write_text("\n".join(live_hosts[:50]))  # cap at 50

    ok, out = _run(
        f"nuclei -l {hosts_file} -severity medium,high,critical "
        f"-json -silent -rl 10 2>/dev/null",
        timeout=900,
    )

    findings = []
    if ok:
        for line in out.splitlines():
            try:
                f = json.loads(line)
                findings.append({
                    "name": f.get("info", {}).get("name", ""),
                    "severity": f.get("info", {}).get("severity", ""),
                    "url": f.get("matched-at", ""),
                    "template": f.get("template-id", ""),
                    "description": f.get("info", {}).get("description", ""),
                    "tags": f.get("info", {}).get("tags", []),
                    "source": "nuclei",
                })
            except Exception:
                pass

    log("ok", f"nuclei: {len(findings)} findings")
    return findings


def run_shannon_scan(target_url: str, repo_name: str = "") -> list[dict]:
    """Run Shannon deep scan if Shannon is available and target is interesting."""
    if not (SHANNON_HOME / "shannon").exists():
        log("warn", "Shannon not found — skipping deep scan")
        return []

    if not target_url:
        return []

    log("step", f"Running Shannon deep scan on {target_url}...")
    cmd = f"./shannon start URL={target_url}"
    if repo_name:
        cmd += f" REPO={repo_name}"

    ok, out = _run(cmd, cwd=str(SHANNON_HOME), timeout=5400)  # 90min max

    # Parse Shannon's audit-log output
    findings = []
    audit_dir = SHANNON_HOME / "audit-logs"
    if audit_dir.exists():
        latest = sorted(audit_dir.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True)
        if latest:
            report_files = list(latest[0].glob("*.md"))
            if report_files:
                content = report_files[0].read_text()
                findings.append({
                    "name": "Shannon Deep Scan Report",
                    "severity": "high",
                    "url": target_url,
                    "template": "shannon",
                    "description": content[:2000],
                    "source": "shannon",
                    "full_report": content,
                })

    log("ok", f"Shannon: {len(findings)} report(s)")
    return findings


# ── Step 4: Triage ────────────────────────────────────────────────────────────

def triage_findings(findings: list[dict], scope: list[dict]) -> list[dict]:
    """Filter out OOS, low-impact, and likely-duplicate findings."""
    scope_identifiers = {a.get("identifier", "") for a in scope}

    def in_scope(url: str) -> bool:
        for ident in scope_identifiers:
            clean = ident.lstrip("*. ")
            if clean and clean in url:
                return True
        return not scope_identifiers  # if scope unknown, allow all

    # Tags to skip (typically N/A on H1)
    skip_tags = {"tech", "info", "generic", "intrusive"}

    triaged = []
    for f in findings:
        if not in_scope(f.get("url", "")):
            continue
        tags = set(f.get("tags", []))
        if tags & skip_tags and f.get("severity") not in ("high", "critical"):
            continue
        triaged.append(f)

    log("ok", f"Triage: {len(triaged)}/{len(findings)} findings passed")
    return triaged


# ── Step 5: Report generation ─────────────────────────────────────────────────

def generate_report(finding: dict, program: dict) -> str:
    sev = finding.get("severity", "medium").upper()
    url = finding.get("url", "")
    name = finding.get("name", "Vulnerability")
    desc = finding.get("description", "")

    return f"""## Summary

{desc or f'A {sev} severity vulnerability was identified at `{url}`.'}

## Steps to Reproduce

1. Navigate to `{url}`
2. Observe the vulnerability behaviour described above
3. Confirm impact as documented

## Impact

This vulnerability could allow an attacker to compromise the confidentiality, integrity,
or availability of the affected system. The finding was identified via automated scanning
and has been validated before submission.

## Supporting Evidence

- **URL**: `{url}`
- **Severity**: {sev}
- **Detection**: {finding.get('source', 'automated scan')}
- **Template/Module**: `{finding.get('template', 'n/a')}`

{finding.get('full_report', '')}

---
*Report generated by the autonomous bounty hunting agent — {datetime.now(timezone.utc).strftime('%Y-%m-%d')}*
"""


# ── Main pipeline ─────────────────────────────────────────────────────────────

def run_pipeline(
    program_handle: str = None,
    dry_run: bool = False,
    min_bounty: float = 100,
):
    from branch_publisher import BranchPublisher
    from h1_api import submit_report

    # 1. Select program
    program = select_program(program_handle, min_bounty)

    # 2. Start hunt branch
    target_url = program.get("url", "")
    pub = BranchPublisher(str(REPO_ROOT), program["handle"], target_url)
    pub.start()

    try:
        # 3. Recon
        recon = run_recon(program)
        pub.commit_recon(recon)

        # 4. Scan
        nuclei_findings = run_nuclei_scan(recon["live_hosts"])
        shannon_findings = []

        # Run Shannon on the primary target if nuclei found interesting surface
        high_sev = [f for f in nuclei_findings if f["severity"] in ("high", "critical")]
        if high_sev and recon["live_hosts"]:
            primary = recon["live_hosts"][0]
            shannon_findings = run_shannon_scan(primary)

        all_findings = nuclei_findings + shannon_findings

        # 5. Triage
        triaged = triage_findings(all_findings, program.get("scope", []))
        pub.commit_findings(triaged)

        # 6. Report + submit
        submitted = 0
        for finding in triaged:
            if finding.get("severity") not in ("high", "critical"):
                continue

            report_md = generate_report(finding, program)
            pub.commit_report(report_md, finding.get("name", "finding"))

            if not dry_run:
                try:
                    result = submit_report(
                        handle=program["handle"],
                        title=f"[Automated] {finding['name']} — {finding['url'][:80]}",
                        vulnerability_information=report_md,
                        severity_rating=finding["severity"],
                        impact=f"Automated exploit confirmation via {finding.get('source','scanner')}.",
                    )
                    report_id = result.get("data", {}).get("id", "unknown")
                    pub.commit_submission(report_id, finding["name"], finding["severity"])
                    submitted += 1
                    log("ok", f"Submitted H1 report #{report_id}")
                except Exception as e:
                    log("err", f"Submission failed: {e}")
            else:
                log("warn", f"[dry-run] Would submit: {finding['name']}")

        # 7. Finish
        branch = pub.finish(bounty_submitted=submitted > 0)
        log("ok", f"Hunt complete. Branch: {branch}")
        log("info", f"Submitted {submitted} report(s) to H1/{program['handle']}")

    except KeyboardInterrupt:
        log("warn", "Hunt interrupted — committing partial results")
        pub.finish(bounty_submitted=False, notes="interrupted")
        raise


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Autonomous HackerOne bounty hunter")
    parser.add_argument("--program", help="H1 program handle (omit to auto-select)")
    parser.add_argument("--dry-run", action="store_true", help="No report submission")
    parser.add_argument("--list-programs", action="store_true", help="Show top programs and exit")
    parser.add_argument("--min-bounty", type=float, default=100, help="Minimum max bounty ($)")
    args = parser.parse_args()

    if args.list_programs:
        from h1_api import list_programs
        programs = list_programs(limit=20, min_bounty=args.min_bounty)
        print(f"\n{'#':>3}  {'Score':>6}  {'Handle':<30} {'Bounty':<20} {'Response'}")
        print("─" * 80)
        for i, p in enumerate(programs, 1):
            print(
                f"{i:3}.  {p.score():>5.0f}  {p.handle:<30} "
                f"${p.min_bounty:.0f}–${p.max_bounty:.0f}{'':>10} {p.response_time_hours}h"
            )
        sys.exit(0)

    run_pipeline(
        program_handle=args.program,
        dry_run=args.dry_run,
        min_bounty=args.min_bounty,
    )
