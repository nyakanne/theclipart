"""
HuntState — single source of truth for a bounty hunt.
Written atomically to hunt_state.json. Every agent reads/writes through this.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


@dataclass
class Finding:
    id: str
    severity: str        # critical | high | medium | low | info
    title: str
    url: str
    description: str
    request: str = ""
    response_snippet: str = ""
    poc: str = ""
    cwe: str = ""
    cvss_score: float = 0.0
    source: str = ""     # nuclei | shannon | manual
    template: str = ""
    approved: bool = False
    false_positive: bool = False
    h1_report_id: str = ""
    committed_at: str = ""


@dataclass
class HuntState:
    hunt_id: str
    platform: str = "hackerone"
    program_handle: str = ""
    program_name: str = ""
    program_url: str = ""
    branch: str = ""
    started_at: str = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    ended_at: str = ""
    phase: str = "init"   # init | discovery | recon | hunting | triage | reporting | done
    phases_completed: list[str] = field(default_factory=list)

    # Per-phase data
    scope: list[dict] = field(default_factory=list)
    out_of_scope: list[str] = field(default_factory=list)
    max_bounty: float = 0.0
    policy_text: str = ""

    recon: dict = field(default_factory=lambda: {
        "domains": [], "subdomains": [], "live_hosts": [], "endpoints": [],
        "technologies": {}, "parameters": {}, "js_findings": [],
    })

    findings: list[Finding] = field(default_factory=list)
    triage: dict = field(default_factory=dict)
    submissions: list[dict] = field(default_factory=list)

    total_api_cost_usd: float = 0.0
    notes: str = ""
    hunt_dir: str = ""

    # ── Persistence ───────────────────────────────────────────────────────────

    def save(self) -> Path:
        path = Path(self.hunt_dir) / "hunt_state.json"
        tmp = path.with_suffix(".tmp")
        tmp.write_text(json.dumps(self._to_dict(), indent=2))
        os.replace(tmp, path)
        return path

    @classmethod
    def load(cls, hunt_dir: str | Path) -> "HuntState":
        path = Path(hunt_dir) / "hunt_state.json"
        data = json.loads(path.read_text())
        findings = [Finding(**f) for f in data.pop("findings", [])]
        state = cls(**{k: v for k, v in data.items() if k != "findings"})
        state.findings = findings
        state.hunt_dir = str(hunt_dir)
        return state

    @classmethod
    def create(cls, program_handle: str, hunt_dir: str | Path, **kwargs) -> "HuntState":
        from datetime import datetime, timezone
        date_str = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M")
        hunt_id = f"h1-{program_handle}-{date_str}"
        Path(hunt_dir).mkdir(parents=True, exist_ok=True)
        state = cls(hunt_id=hunt_id, program_handle=program_handle, hunt_dir=str(hunt_dir), **kwargs)
        state.save()
        return state

    def _to_dict(self) -> dict:
        d = asdict(self)
        d["findings"] = [asdict(f) for f in self.findings]
        return d

    # ── Helpers ───────────────────────────────────────────────────────────────

    def add_finding(self, finding: Finding):
        existing_ids = {f.id for f in self.findings}
        if finding.id not in existing_ids:
            self.findings.append(finding)
            self.save()

    def approved_findings(self) -> list[Finding]:
        return [f for f in self.findings if f.approved and not f.false_positive]

    def complete_phase(self, phase: str):
        if phase not in self.phases_completed:
            self.phases_completed.append(phase)
        self.phase = phase
        self.save()
