"""
ProgramDiscoveryAgent — selects the best HackerOne program to hunt.
Queries H1 API, scores programs, writes selection to state.
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "tools"))

from agents.base import BaseAgent
from orchestrator.state import HuntState


class ProgramDiscoveryAgent(BaseAgent):
    name = "discovery"
    max_turns = 10

    def __init__(self, state: HuntState, branch_manager=None, forced_handle: str = ""):
        super().__init__(state, branch_manager)
        self.forced_handle = forced_handle

    def get_tools(self) -> list[dict]:
        return [
            {
                "name": "list_programs",
                "description": "List and score HackerOne programs by attack surface quality and bounty size",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "min_bounty": {"type": "number", "description": "Minimum max bounty in USD"},
                        "limit": {"type": "integer", "description": "Max programs to return"},
                    },
                },
            },
            {
                "name": "get_scope",
                "description": "Get detailed scope for a specific program handle",
                "input_schema": {
                    "type": "object",
                    "properties": {"handle": {"type": "string"}},
                    "required": ["handle"],
                },
            },
            {
                "name": "select_program",
                "description": "Confirm program selection and write to hunt state",
                "input_schema": {
                    "type": "object",
                    "properties": {
                        "handle": {"type": "string"},
                        "name": {"type": "string"},
                        "max_bounty": {"type": "number"},
                        "scope": {"type": "array", "items": {"type": "object"}},
                        "out_of_scope": {"type": "array", "items": {"type": "string"}},
                        "policy_text": {"type": "string"},
                    },
                    "required": ["handle", "scope"],
                },
            },
        ]

    def build_user_message(self) -> str:
        if self.forced_handle:
            return (
                f"Select the HackerOne program with handle '{self.forced_handle}'. "
                f"Get its scope, policy, and write the selection to state."
            )
        return (
            "Find the best HackerOne program to hunt right now. "
            f"Minimum bounty: ${self.state.total_api_cost_usd or 100}. "
            "Score programs by: scope breadth (web assets preferred), bounty size, "
            "response time. Select the top scorer and write it to state."
        )

    def tool_list_programs(self, min_bounty: float = 100, limit: int = 20) -> list:
        from h1_api import list_programs
        programs = list_programs(min_bounty=min_bounty, limit=limit)
        return [
            {
                "handle": p.handle,
                "name": p.name,
                "score": round(p.score(), 1),
                "max_bounty": p.max_bounty,
                "min_bounty": p.min_bounty,
                "response_time_hours": p.response_time_hours,
                "asset_count": len(p.in_scope),
                "url": p.url,
            }
            for p in programs
        ]

    def tool_get_scope(self, handle: str) -> list:
        from h1_api import get_scope
        return get_scope(handle)

    def tool_select_program(
        self,
        handle: str,
        name: str = "",
        max_bounty: float = 0,
        scope: list = None,
        out_of_scope: list = None,
        policy_text: str = "",
    ) -> str:
        self.state.program_handle = handle
        self.state.program_name = name or handle
        self.state.program_url = f"https://hackerone.com/{handle}"
        self.state.max_bounty = max_bounty
        self.state.scope = scope or []
        self.state.out_of_scope = out_of_scope or []
        self.state.policy_text = policy_text
        self.state.save()
        return f"Selected program: {handle}"
