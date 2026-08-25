"""
BaseAgent — all agents inherit from this.
Wraps Anthropic messages API with a tool-call loop, state r/w, and git commit.
"""

from __future__ import annotations

import json
import subprocess
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Any

import anthropic

from orchestrator.state import HuntState

MODEL = "claude-sonnet-4-6"
PROMPTS_DIR = Path(__file__).parent.parent / "prompts"

_SHARED_PROMPT = """
You are an autonomous bug bounty hunting agent. You operate as part of a multi-agent
pipeline targeting HackerOne programs. You ONLY act on systems explicitly listed as
in-scope. You never target production without authorization. You always confirm findings
before reporting them.
""".strip()


def _load_prompt(name: str) -> str:
    shared_parts = []
    shared_dir = PROMPTS_DIR / "shared"
    if shared_dir.exists():
        for f in sorted(shared_dir.glob("*.md")):
            shared_parts.append(f.read_text().strip())

    agent_prompt_path = PROMPTS_DIR / f"{name}.md"
    agent_part = agent_prompt_path.read_text().strip() if agent_prompt_path.exists() else ""

    base = _SHARED_PROMPT
    if shared_parts:
        base += "\n\n---\n\n" + "\n\n---\n\n".join(shared_parts)
    if agent_part:
        base += "\n\n---\n\n" + agent_part
    return base


class BaseAgent(ABC):
    name: str = "base"
    max_turns: int = 20

    def __init__(self, state: HuntState, branch_manager=None):
        self.state = state
        self.branch_manager = branch_manager
        self.client = anthropic.Anthropic()

    @abstractmethod
    def get_tools(self) -> list[dict]: ...

    @abstractmethod
    def build_user_message(self) -> str: ...

    def get_system_prompt(self) -> str:
        return _load_prompt(self.name)

    def call_tool(self, tool_name: str, tool_input: dict) -> Any:
        method = getattr(self, f"tool_{tool_name}", None)
        if method is None:
            return {"error": f"Tool '{tool_name}' not implemented on {self.name}"}
        try:
            return method(**tool_input)
        except Exception as e:
            return {"error": str(e)}

    def run(self) -> HuntState:
        messages = [{"role": "user", "content": self.build_user_message()}]
        tools = self.get_tools()

        for _ in range(self.max_turns):
            response = self.client.messages.create(
                model=MODEL,
                max_tokens=8096,
                system=self.get_system_prompt(),
                tools=tools if tools else anthropic.NOT_GIVEN,
                messages=messages,
            )

            # Rough cost tracking ($3/M input, $15/M output for Sonnet)
            self.state.total_api_cost_usd += (
                response.usage.input_tokens  * 0.000003 +
                response.usage.output_tokens * 0.000015
            )

            if response.stop_reason == "end_turn":
                break

            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = self.call_tool(block.name, block.input)
                    tool_results.append({
                        "type":        "tool_result",
                        "tool_use_id": block.id,
                        "content":     json.dumps(result) if not isinstance(result, str) else result,
                    })

            messages.append({"role": "assistant", "content": response.content})
            if tool_results:
                messages.append({"role": "user", "content": tool_results})
            else:
                break

        self.state.complete_phase(self.name)
        self._commit()
        return self.state

    def _commit(self):
        if self.branch_manager:
            self.branch_manager.commit_phase(
                self.name,
                [self.state.hunt_dir],
                f"{self.name}: phase complete for {self.state.program_handle}",
            )

    def tool_run_shell(self, command: str, timeout: int = 300) -> str:
        try:
            result = subprocess.run(
                command, shell=True, capture_output=True, text=True, timeout=timeout
            )
            return (result.stdout or result.stderr or "")[:4000]
        except subprocess.TimeoutExpired:
            return "timed out"
        except Exception as e:
            return f"error: {e}"
