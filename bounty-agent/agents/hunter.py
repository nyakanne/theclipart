"""
HuntingAgent — the exploitation core.
Runs nuclei, Shannon, and targeted manual tests. Commits each confirmed finding.
Knowledge from top OSINT repos is injected into the system prompt.
"""

import json
import os
from pathlib import Path

from agents.base import BaseAgent
from knowledge.loader import build_hunter_context
from orchestrator.state import Finding, HuntState


class HuntingAgent(BaseAgent):
    name = "hunter"
    max_turns = 40

    def get_system_prompt(self) -> str:
        base = super().get_system_prompt()
        knowledge = build_hunter_context(self.state)
        return base + "\n\n---\n\n## OSINT Knowledge Base\n\n" + knowledge

    def get_tools(self) -> list[dict]:
        return [
            {
                "name": "run_nuclei",
                "description": "Run nuclei template scanner against a list of hosts",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "hosts": {"type": "array", "items": {"type": "string"}},
                        "severity": {"type": "string", "default": "medium,high,critical"},
                        "tags": {"type": "string", "default": ""},
                    },
                    "required": ["hosts"],
                },
            },
            {
                "name": "run_shannon",
                "description": "Run Shannon deep pentest against a target URL (takes 60-90min)",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "target_url": {"type": "string"},
                        "repo_name": {"type": "string", "default": "target"},
                    },
                    "required": ["target_url"],
                },
            },
            {
                "name": "send_request",
                "description": "Send an HTTP request to test a potential vulnerability",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "method": {"type": "string"},
                        "url": {"type": "string"},
                        "headers": {"type": "object"},
                        "body": {"type": "string"},
                    },
                    "required": ["method", "url"],
                },
            },
            {
                "name": "store_finding",
                "description": "Record a confirmed vulnerability finding",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "severity": {"type": "string"},
                        "title": {"type": "string"},
                        "url": {"type": "string"},
                        "description": {"type": "string"},
                        "request": {"type": "string"},
                        "response_snippet": {"type": "string"},
                        "poc": {"type": "string"},
                        "cwe": {"type": "string"},
                        "source": {"type": "string"},
                        "template": {"type": "string"},
                    },
                    "required": ["severity", "title", "url", "description"],
                },
            },
        ]

    def build_user_message(self) -> str:
        techs = list(self.state.recon.get("technologies", {}).values())[:5]
        live_hosts = self.state.recon.get("live_hosts", [])[:20]
        return (
            f"Hunt for vulnerabilities in {self.state.program_handle}. "
            f"Live hosts: {live_hosts}. "
            f"Detected technologies: {techs}. "
            f"Max bounty: ${self.state.max_bounty}. "
            "Steps:\n"
            "1. Run nuclei on all live hosts (medium/high/critical severity)\n"
            "2. For the top 3 most interesting hosts, run targeted manual tests "
            "(IDOR, auth bypass, SSRF, business logic)\n"
            "3. If a host has a login/API, consider running Shannon for deep analysis\n"
            "4. Store every confirmed finding immediately\n"
            "Focus on HIGH and CRITICAL. Kill low-confidence findings fast."
        )

    def tool_run_nuclei(self, hosts: list, severity: str = "medium,high,critical", tags: str = "") -> list:
        if not hosts:
            return []
        hosts_file = "/tmp/hunt_hosts.txt"
        Path(hosts_file).write_text("\n".join(hosts[:50]))
        tag_flag = f"-tags {tags}" if tags else ""
        out = self.tool_run_shell(
            f"nuclei -l {hosts_file} -severity {severity} {tag_flag} "
            f"-json -silent -rl 10 -timeout 10 2>/dev/null",
            timeout=900,
        )
        findings = []
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
                })
            except Exception:
                pass
        return findings

    def tool_run_shannon(self, target_url: str, repo_name: str = "target") -> dict:
        shannon_home = os.environ.get("SHANNON_HOME", str(Path.home() / "shannon"))
        shannon_bin = Path(shannon_home) / "shannon"
        if not shannon_bin.exists():
            return {"error": "Shannon not installed at " + shannon_home}

        out = self.tool_run_shell(
            f"cd {shannon_home} && ./shannon start URL={target_url} REPO={repo_name}",
            timeout=5400,
        )
        audit_dir = Path(shannon_home) / "audit-logs"
        if audit_dir.exists():
            latest = sorted(audit_dir.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True)
            if latest:
                reports = list(latest[0].glob("*.md"))
                if reports:
                    return {"report": reports[0].read_text()[:5000], "path": str(reports[0])}
        return {"output": out[:2000]}

    def tool_send_request(
        self,
        method: str,
        url: str,
        headers: dict = None,
        body: str = "",
    ) -> dict:
        import urllib.request, urllib.error
        try:
            data = body.encode() if body else None
            req = urllib.request.Request(url, data=data, method=method.upper(),
                                         headers=headers or {})
            with urllib.request.urlopen(req, timeout=15) as resp:
                return {
                    "status": resp.status,
                    "headers": dict(resp.headers),
                    "body": resp.read(2000).decode(errors="replace"),
                }
        except urllib.error.HTTPError as e:
            return {"status": e.code, "body": e.read(500).decode(errors="replace")}
        except Exception as e:
            return {"error": str(e)}

    def tool_store_finding(
        self,
        severity: str,
        title: str,
        url: str,
        description: str,
        request: str = "",
        response_snippet: str = "",
        poc: str = "",
        cwe: str = "",
        source: str = "manual",
        template: str = "",
    ) -> str:
        from datetime import datetime, timezone
        finding_id = f"F{len(self.state.findings) + 1:03d}"
        finding = Finding(
            id=finding_id,
            severity=severity,
            title=title,
            url=url,
            description=description,
            request=request,
            response_snippet=response_snippet,
            poc=poc,
            cwe=cwe,
            source=source,
            template=template,
            committed_at=datetime.now(timezone.utc).isoformat(),
        )
        self.state.add_finding(finding)

        findings_file = Path(self.state.hunt_dir) / "findings.json"
        findings_file.write_text(
            json.dumps([vars(f) if not hasattr(f, '__dataclass_fields__') else
                        {k: getattr(f, k) for k in f.__dataclass_fields__}
                        for f in self.state.findings], indent=2)
        )

        if self.branch_manager:
            self.branch_manager.commit_finding(
                finding_id, title, severity, self.state.hunt_dir
            )
        return f"Stored {finding_id}: [{severity.upper()}] {title}"
