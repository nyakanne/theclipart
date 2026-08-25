#!/usr/bin/env python3
"""
Hunt branch publisher.

Creates a dedicated git branch for each bounty hunt and commits
findings as they arrive — recon, scan results, triage decisions,
final report. Gives a full auditable trail per hunt.

Branch naming: hunt/h1-{program_handle}-{YYYYMMDD}-{short_id}

Usage:
    publisher = BranchPublisher(repo_path, program_handle)
    publisher.start()                        # creates branch, commits manifest
    publisher.commit_recon(data)             # commits recon output
    publisher.commit_findings(findings)      # commits scan/triage findings
    publisher.commit_report(report_md)       # commits final report
    publisher.finish(bounty_submitted=True)  # commits summary, pushes
"""

import json
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path


def _run(cmd: str, cwd: str) -> tuple[bool, str]:
    result = subprocess.run(
        cmd, shell=True, cwd=cwd,
        stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True
    )
    return result.returncode == 0, result.stdout.strip()


class BranchPublisher:
    def __init__(self, repo_path: str, program_handle: str, target_url: str = ""):
        self.repo = repo_path
        self.handle = program_handle
        self.target_url = target_url
        self.started_at = datetime.now(timezone.utc)
        date_str = self.started_at.strftime("%Y%m%d")
        short_id = self.started_at.strftime("%H%M")
        self.branch = f"hunt/h1-{program_handle}-{date_str}-{short_id}"
        self.hunt_dir = Path(repo_path) / "hunts" / self.branch.replace("/", "-")
        self.commit_count = 0

    def _commit(self, message: str, files: list[str] = None):
        if files:
            for f in files:
                _run(f'git add "{f}"', self.repo)
        else:
            _run("git add -A", self.repo)
        ok, out = _run(f'git commit -m "{message}"', self.repo)
        if ok:
            self.commit_count += 1
            print(f"[publisher] committed: {message}")
        else:
            print(f"[publisher] commit skipped (nothing to commit): {message}")

    def start(self):
        """Create hunt branch and commit the initial manifest."""
        # Ensure we're on a clean base
        _run("git fetch origin", self.repo)
        ok, _ = _run(f"git checkout -b {self.branch}", self.repo)
        if not ok:
            # Branch may already exist locally
            _run(f"git checkout {self.branch}", self.repo)

        self.hunt_dir.mkdir(parents=True, exist_ok=True)

        manifest = {
            "branch": self.branch,
            "program": self.handle,
            "target_url": self.target_url,
            "started_at": self.started_at.isoformat(),
            "platform": "hackerone",
            "status": "started",
            "commits": [],
        }
        (self.hunt_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))

        self._commit(
            f"hunt: start {self.handle} @ {self.started_at.strftime('%Y-%m-%d %H:%M')} UTC",
            [str(self.hunt_dir / "manifest.json")],
        )
        print(f"[publisher] branch created: {self.branch}")

    def commit_recon(self, recon_data: dict):
        """Commit recon output (subdomains, live hosts, tech stack)."""
        out_file = self.hunt_dir / "recon.json"
        out_file.write_text(json.dumps(recon_data, indent=2))

        summary_lines = [
            f"# Recon: {self.handle}",
            f"Target: {self.target_url}",
            f"Time: {datetime.now(timezone.utc).isoformat()}",
            "",
            f"## Subdomains ({len(recon_data.get('subdomains', []))})",
        ]
        for s in recon_data.get("subdomains", [])[:50]:
            summary_lines.append(f"- {s}")
        summary_lines += ["", f"## Live Hosts ({len(recon_data.get('live_hosts', []))})"]
        for h in recon_data.get("live_hosts", [])[:30]:
            summary_lines.append(f"- {h}")

        (self.hunt_dir / "recon.md").write_text("\n".join(summary_lines))
        self._commit(
            f"hunt: recon complete — {len(recon_data.get('subdomains', []))} subdomains, "
            f"{len(recon_data.get('live_hosts', []))} live hosts",
        )

    def commit_findings(self, findings: list[dict]):
        """Commit triage-filtered findings from nuclei/scanner."""
        out_file = self.hunt_dir / "findings.json"
        out_file.write_text(json.dumps(findings, indent=2))

        sev_counts = {}
        for f in findings:
            s = f.get("severity", "info")
            sev_counts[s] = sev_counts.get(s, 0) + 1

        lines = [
            f"# Findings: {self.handle}",
            f"Total: {len(findings)}",
            "",
            "| Severity | Count |",
            "|----------|-------|",
        ]
        for sev in ["critical", "high", "medium", "low", "info"]:
            if sev in sev_counts:
                lines.append(f"| {sev.capitalize()} | {sev_counts[sev]} |")
        lines += ["", "## Findings"]
        for f in findings:
            lines.append(
                f"- [{f.get('severity','?').upper()}] {f.get('name','Unknown')} "
                f"— {f.get('url','')}"
            )

        (self.hunt_dir / "findings.md").write_text("\n".join(lines))
        self._commit(
            f"hunt: {len(findings)} findings — "
            f"crit={sev_counts.get('critical',0)} "
            f"high={sev_counts.get('high',0)} "
            f"med={sev_counts.get('medium',0)}",
        )

    def commit_report(self, report_md: str, finding_title: str = ""):
        """Commit the final H1-formatted report."""
        slug = finding_title.lower().replace(" ", "-")[:40] if finding_title else "report"
        report_file = self.hunt_dir / f"{slug}.md"
        report_file.write_text(report_md)
        self._commit(f"hunt: report ready — {finding_title or 'vulnerability report'}")

    def commit_submission(self, report_id: str, title: str, severity: str):
        """Commit submission confirmation after H1 API call."""
        record = {
            "report_id": report_id,
            "title": title,
            "severity": severity,
            "submitted_at": datetime.now(timezone.utc).isoformat(),
            "url": f"https://hackerone.com/reports/{report_id}",
        }
        submissions_file = self.hunt_dir / "submissions.json"
        existing = []
        if submissions_file.exists():
            existing = json.loads(submissions_file.read_text())
        existing.append(record)
        submissions_file.write_text(json.dumps(existing, indent=2))
        self._commit(f"hunt: submitted H1 report #{report_id} [{severity}] {title}")

    def finish(self, bounty_submitted: bool = False, notes: str = ""):
        """Write summary and push branch to origin."""
        ended_at = datetime.now(timezone.utc)
        duration = ended_at - self.started_at

        summary = {
            "program": self.handle,
            "branch": self.branch,
            "started_at": self.started_at.isoformat(),
            "ended_at": ended_at.isoformat(),
            "duration_minutes": int(duration.total_seconds() / 60),
            "commits": self.commit_count,
            "bounty_submitted": bounty_submitted,
            "notes": notes,
        }
        (self.hunt_dir / "summary.json").write_text(json.dumps(summary, indent=2))
        self._commit(
            f"hunt: finished — {int(duration.total_seconds()/60)}m, "
            f"{'bounty submitted' if bounty_submitted else 'no submission'}"
        )

        ok, out = _run(f"git push -u origin {self.branch}", self.repo)
        if ok:
            print(f"[publisher] pushed: {self.branch}")
        else:
            print(f"[publisher] push failed: {out}", file=sys.stderr)

        return self.branch


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", default=".", help="Path to git repo")
    parser.add_argument("--program", required=True, help="H1 program handle")
    parser.add_argument("--target", default="", help="Target URL")
    parser.add_argument("--action", choices=["start", "finish"], default="start")
    args = parser.parse_args()

    pub = BranchPublisher(args.repo, args.program, args.target)
    if args.action == "start":
        pub.start()
        print(f"Branch: {pub.branch}")
    elif args.action == "finish":
        pub.finish()
