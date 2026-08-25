"""
M365HunterAgent — Microsoft 365 / Power Platform attack surface agent.
Uses power-pwn (https://github.com/mbrg/power-pwn) to discover and exploit
misconfigurations in Power Apps, Power Automate, Copilot Studio, and M365 Copilot.
Only activates when the target's scope includes *.microsoft.com, *.powerapps.com,
*.powerautomate.com, or when M365 is detected in the recon phase.
"""

import json
import subprocess
import sys
from pathlib import Path
from typing import Any

from .base import BaseAgent


M365_INDICATORS = [
    "microsoft.com", "powerapps.com", "powerautomate.com",
    "sharepoint.com", "onmicrosoft.com", "dynamics.com",
    "office.com", "azure.com", "microsoftonline.com",
]


def _detect_m365(state: Any) -> bool:
    """Return True if the target scope contains M365 assets."""
    scope = getattr(state, "scope", []) or []
    target = getattr(state, "target_url", "") or ""
    combined = " ".join(scope) + " " + target
    return any(ind in combined.lower() for ind in M365_INDICATORS)


def _run_powerpwn(module: str, args: list[str], timeout: int = 120) -> dict:
    """Run a power-pwn module and return parsed output."""
    cmd = [sys.executable, "-m", "powerpwn", module] + args
    try:
        result = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "returncode": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {"stdout": "", "stderr": "timed out", "returncode": -1}
    except FileNotFoundError:
        return {"stdout": "", "stderr": "powerpwn not installed — run: pip install powerpwn", "returncode": -1}


class M365HunterAgent(BaseAgent):
    """
    Hunts for vulnerabilities in Microsoft 365 and Power Platform targets.

    Modules used:
      - powerdump  : tenant-wide recon and data enumeration
      - copilot-hunter : find misconfigured Copilot Studio bots
      - power-pages : detect exposed Dataverse tables
      - llm-hound  : discover exposed MCP / AI middleware via Shodan
    """

    name = "m365_hunter"

    TOOLS = [
        {
            "name": "check_m365_scope",
            "description": "Verify target has M365/Power Platform assets before proceeding.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "tenant_domain": {"type": "string", "description": "Primary domain e.g. contoso.com"}
                },
                "required": ["tenant_domain"],
            },
        },
        {
            "name": "run_powerdump",
            "description": "Enumerate tenant data: apps, flows, connections, connectors, secrets.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "tenant_id": {"type": "string"},
                    "token": {"type": "string", "description": "Optional Bearer token if already obtained"},
                },
                "required": ["tenant_id"],
            },
        },
        {
            "name": "hunt_copilot_bots",
            "description": "Find publicly accessible / misconfigured Copilot Studio bots.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "tenant_domain": {"type": "string"}
                },
                "required": ["tenant_domain"],
            },
        },
        {
            "name": "check_power_pages",
            "description": "Detect Power Pages sites exposing Dataverse tables without auth.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "site_url": {"type": "string"}
                },
                "required": ["site_url"],
            },
        },
        {
            "name": "store_m365_finding",
            "description": "Record a confirmed M365/Power Platform finding.",
            "input_schema": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "severity": {"type": "string", "enum": ["critical", "high", "medium", "low"]},
                    "module": {"type": "string"},
                    "evidence": {"type": "string"},
                    "remediation": {"type": "string"},
                },
                "required": ["title", "severity", "module", "evidence"],
            },
        },
    ]

    def _system_prompt(self) -> str:
        return """You are an M365 and Power Platform security specialist.
Your job is to find real, exploitable misconfigurations in Microsoft cloud services.

Focus areas (in order of impact):
1. Unauthenticated Power Apps / Power Pages exposing sensitive Dataverse data
2. Overprivileged service principals and OAuth connections
3. Copilot Studio bots with no authentication that leak internal data
4. Power Automate flows with hardcoded credentials or exposed webhook URLs
5. M365 Copilot data oversharing (SharePoint permissions)

Rules:
- Only test assets explicitly in scope
- Never exfiltrate real data — prove access only
- Rate-limit to 5 requests/sec maximum
- Stop immediately if you hit production data containing PII
- Document every finding with reproduction steps
"""

    def _handle_tool(self, tool_name: str, tool_input: dict) -> str:
        if tool_name == "check_m365_scope":
            domain = tool_input["tenant_domain"]
            result = subprocess.run(
                ["nslookup", f"autodiscover.{domain}"],
                capture_output=True, text=True, timeout=10
            )
            m365 = "microsoft" in result.stdout.lower() or "office365" in result.stdout.lower()
            return json.dumps({"m365_detected": m365, "domain": domain, "dns_output": result.stdout[:500]})

        elif tool_name == "run_powerdump":
            out = _run_powerpwn("powerdump", [
                "--tenant-id", tool_input["tenant_id"],
                "--output-dir", f"/tmp/powerdump-{tool_input['tenant_id'][:8]}",
            ])
            return json.dumps(out)

        elif tool_name == "hunt_copilot_bots":
            out = _run_powerpwn("copilot-hunter", [
                "--tenant", tool_input["tenant_domain"],
                "--output", "json",
            ])
            return json.dumps(out)

        elif tool_name == "check_power_pages":
            out = _run_powerpwn("power-pages", [
                "--url", tool_input["site_url"],
                "--output", "json",
            ])
            return json.dumps(out)

        elif tool_name == "store_m365_finding":
            finding = {
                "type": "m365",
                "title": tool_input["title"],
                "severity": tool_input["severity"],
                "module": tool_input["module"],
                "evidence": tool_input["evidence"],
                "remediation": tool_input.get("remediation", ""),
            }
            findings_path = Path("/tmp/m365_findings.json")
            existing = json.loads(findings_path.read_text()) if findings_path.exists() else []
            existing.append(finding)
            findings_path.write_text(json.dumps(existing, indent=2))
            return json.dumps({"stored": True, "total": len(existing)})

        return json.dumps({"error": f"unknown tool: {tool_name}"})

    def run(self, state: Any) -> dict:
        if not _detect_m365(state):
            return {"skipped": True, "reason": "No M365 assets detected in scope"}

        target = getattr(state, "target_url", "") or getattr(state, "program_handle", "unknown")
        domain = target.replace("https://", "").replace("http://", "").split("/")[0]

        prompt = f"""
Target domain: {domain}
Scope: {getattr(state, 'scope', [])}

Begin M365/Power Platform assessment:
1. Confirm M365 presence via check_m365_scope
2. If confirmed, run powerdump for tenant enumeration
3. Hunt for exposed Copilot Studio bots
4. Check for Power Pages with unauthenticated Dataverse access
5. Store every confirmed finding with evidence and severity
6. Stop when all modules have run or you hit a blocker
"""
        return self._run_loop(prompt)
