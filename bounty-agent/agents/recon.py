"""
ReconAgent — maps the attack surface of the chosen program.
Runs subfinder, httpx, nmap, endpoint crawling against in-scope assets.
"""

import json
from pathlib import Path

from agents.base import BaseAgent
from orchestrator.state import HuntState


class ReconAgent(BaseAgent):
    name = "recon"
    max_turns = 25

    def get_tools(self) -> list[dict]:
        return [
            {
                "name": "run_subfinder",
                "description": "Enumerate subdomains for a domain",
                "input_schema": {
                    "type": "object",
                    "properties": {"domain": {"type": "string"}},
                    "required": ["domain"],
                },
            },
            {
                "name": "run_httpx",
                "description": "Probe live hosts from a list, detect tech stack and status codes",
                "input_schema": {
                    "type": "object",
                    "properties": {"hosts": {"type": "array", "items": {"type": "string"}}},
                    "required": ["hosts"],
                },
            },
            {
                "name": "run_nmap",
                "description": "Port scan a host for open services",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "host": {"type": "string"},
                        "ports": {"type": "string", "default": "80,443,8080,8443"},
                    },
                    "required": ["host"],
                },
            },
            {
                "name": "save_recon",
                "description": "Save completed recon data to state",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "subdomains": {"type": "array", "items": {"type": "string"}},
                        "live_hosts": {"type": "array", "items": {"type": "string"}},
                        "technologies": {"type": "object"},
                        "endpoints": {"type": "array", "items": {"type": "string"}},
                    },
                },
            },
        ]

    def build_user_message(self) -> str:
        scope_urls = [
            a.get("identifier", "") for a in self.state.scope
            if a.get("asset_type") in ("URL", "WILDCARD", "DOMAIN")
        ]
        return (
            f"Run full recon on {self.state.program_handle}. "
            f"In-scope assets: {scope_urls[:10]}. "
            f"Out of scope: {self.state.out_of_scope[:5]}. "
            "1. Extract root domains from scope. "
            "2. Run subfinder on each domain. "
            "3. Probe live hosts with httpx. "
            "4. Save results. Be thorough but stay in scope."
        )

    def tool_run_subfinder(self, domain: str) -> list[str]:
        out = self.tool_run_shell(f"subfinder -d {domain} -silent 2>/dev/null", timeout=120)
        results = [s.strip() for s in out.splitlines() if s.strip() and "." in s]
        return results[:200]

    def tool_run_httpx(self, hosts: list[str]) -> list[dict]:
        if not hosts:
            return []
        hosts_file = "/tmp/recon_hosts.txt"
        Path(hosts_file).write_text("\n".join(hosts[:100]))
        out = self.tool_run_shell(
            f"httpx -l {hosts_file} -silent -title -tech-detect -status-code -json 2>/dev/null",
            timeout=180,
        )
        results = []
        for line in out.splitlines():
            try:
                h = json.loads(line)
                results.append({
                    "url": h.get("url", ""),
                    "status": h.get("status-code", 0),
                    "title": h.get("title", ""),
                    "tech": h.get("tech", []),
                })
            except Exception:
                pass
        return results

    def tool_run_nmap(self, host: str, ports: str = "80,443,8080,8443") -> str:
        return self.tool_run_shell(
            f"nmap -p {ports} --open -sV --script=http-title {host} 2>/dev/null",
            timeout=60,
        )

    def tool_save_recon(
        self,
        subdomains: list = None,
        live_hosts: list = None,
        technologies: dict = None,
        endpoints: list = None,
    ) -> str:
        self.state.recon["subdomains"] = subdomains or []
        self.state.recon["live_hosts"] = live_hosts or []
        self.state.recon["technologies"] = technologies or {}
        self.state.recon["endpoints"] = endpoints or []
        self.state.save()

        # Write recon.json alongside state for easy reading
        recon_file = Path(self.state.hunt_dir) / "recon.json"
        recon_file.write_text(json.dumps(self.state.recon, indent=2))
        return (
            f"Recon saved: {len(subdomains or [])} subdomains, "
            f"{len(live_hosts or [])} live hosts"
        )
