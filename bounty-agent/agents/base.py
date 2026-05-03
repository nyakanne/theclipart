"""
BaseAgent — all agents inherit from this.
Wraps the Anthropic Claude Agent SDK query() loop with tool execution,
state read/write, and git commit on completion.
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


def _load_prompt(name: str) -> str:
    path = PROMPTS_DIR / f"{name}.md"
    shared = []
    for shared_file in (PROMPTS_DIR / "shared").glob("*.md"):
        shared.append(shared_file.read_text())
    return "\n\n---\n\n".join(shared) + "\n\n---\n\n" + path.read_text()


class BaseAgent(ABC):
    name: str = "base"
    max_turns: int = 20

    def __init__(self, state: HuntState, branch_manager=None):
        self.state = state
        self.branch_manager = branch_manager
        self.client = anthropic.Anthropic()

    @abstractmethod
    def get_tools(self) -> list[dict]:
        """Return list of tool defs for this agent."""
        ...

    @abstractmethod
    def build_user_message(self) -> str:
        """Build the user-turn message that kicks off the agent."""
        ...

    def get_system_prompt(self) -> str:
        return _load_prompt(self.name)

    def call_tool(self, tool_name: str, tool_input: dict) -> Any:
        method = getattr(self, f"tool_{tool_name}", None)
        if method is None:
            return {"error": f"Tool {tool_name} not found"}
        try:
            return method(**tool_input)
        except Exception as e:
            return {"error": str(e)}

    def run(self) -> HuntState:
        """Execute the agent loop until it stops calling tools."""
        messages = [{"role": "user", "content": self.build_user_message()}]
        tools = self.get_tools()

        for _ in range(self.max_turns):
            response = self.client.messages.create(
                model=MODEL,
                max_tokens=8096,
                system=self.get_system_prompt(),
                tools=tools,
                messages=messages,
            )

            # Track cost (rough estimate)
            self.state.total_api_cost_usd += (
                response.usage.input_tokens * 0.000003 +
                response.usage.output_tokens * 0.000015
            )

            if response.stop_reason == "end_turn":
                break

            # Process tool calls
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = self.call_tool(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": json.dumps(result) if not isinstance(result, str) else result,
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
                f"{self.name}: phase complete",
            )

    # ── Shared tool: write state ──────────────────────────────────────────────

    def tool_update_state(self, **kwargs) -> str:
        for k, v in kwargs.items():
            if hasattr(self.state, k):
                setattr(self.state, k, v)
        self.state.save()
        return "state updated"

    def tool_run_shell(self, command: str, timeout: int = 300) -> str:
        try:
            result = subprocess.run(
                command, shell=True, capture_output=True, text=True, timeout=timeout
            )
            return result.stdout[:4000] or result.stderr[:2000]
        except subprocess.TimeoutExpired:
            return "command timed out"
        except Exception as e:
            return f"error: {e}"
