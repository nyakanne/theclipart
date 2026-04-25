"""Agent router: classify intent and dispatch to the right agent."""

import json
import logging
import uuid
from datetime import datetime
from typing import Any

import anthropic

from app.config import get_settings
from app.agents.prompts import (
    ARCHIVIST_SYSTEM, BRIEFING_SYSTEM, REFLECTION_SYSTEM,
    RESEARCHER_SYSTEM, STRATEGIST_SYSTEM, OPERATOR_SYSTEM,
    REVIEWER_SYSTEM, WATCHER_SYSTEM,
    build_chat_prompt,
)

logger = logging.getLogger(__name__)
settings = get_settings()

ROUTER_SYSTEM = """Classify the user's intent into one of these agent types:
researcher | archivist | strategist | operator | reflection | watcher

Respond with JSON only:
{
  "agent": "researcher|archivist|strategist|operator|reflection|watcher",
  "confidence": 0.0-1.0,
  "summary": "brief description"
}

Use:
- researcher: questions, lookups, "what do I know about X"
- archivist: storing new information, "remember this", "save this"
- strategist: planning, "help me plan", "how should I approach"
- operator: drafting emails/documents/messages
- reflection: patterns, "what have I been working on", "what trends do you see"
- watcher: risk/deadline scans, "what am I missing", "what's urgent"
"""


def _client() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)


async def classify_intent(message: str) -> dict[str, Any]:
    if not settings.ANTHROPIC_API_KEY:
        return {"agent": "researcher", "confidence": 0.5, "summary": message}
    try:
        resp = await _client().messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=256,
            system=ROUTER_SYSTEM,
            messages=[{"role": "user", "content": message}],
        )
        return json.loads(resp.content[0].text.strip())
    except Exception as exc:
        logger.warning("Intent classification failed: %s", exc)
        return {"agent": "researcher", "confidence": 0.5, "summary": message}


async def run_researcher(
    message: str,
    context: str,
    history: list[dict],
) -> str:
    if not settings.ANTHROPIC_API_KEY:
        return "ANTHROPIC_API_KEY not configured. Please add it to your .env file."

    prompt = build_chat_prompt(context, message)
    messages = [{"role": m["role"], "content": m["content"]} for m in history]
    messages.append({"role": "user", "content": prompt})

    resp = await _client().messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=2048,
        system=RESEARCHER_SYSTEM,
        messages=messages,
    )
    return resp.content[0].text.strip()


async def run_archivist(content: str) -> dict[str, Any]:
    if not settings.ANTHROPIC_API_KEY:
        return {"title": "Untitled", "memory_type": "note", "tags": [], "summary": content[:200], "confidence": "low"}

    resp = await _client().messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=1024,
        system=ARCHIVIST_SYSTEM,
        messages=[{"role": "user", "content": f"Analyze and archive this content:\n\n{content}"}],
    )
    try:
        return json.loads(resp.content[0].text.strip())
    except json.JSONDecodeError:
        return {"title": content[:60], "memory_type": "note", "tags": [], "summary": content[:200], "confidence": "low"}


async def run_strategist(goal: str, context: str) -> dict[str, Any]:
    if not settings.ANTHROPIC_API_KEY:
        return {"goal": goal, "phases": [], "risks": [], "proposed_actions": []}

    prompt = f"Goal: {goal}\n\nMemory context:\n{context}" if context else f"Goal: {goal}"
    resp = await _client().messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=2048,
        system=STRATEGIST_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )
    try:
        return json.loads(resp.content[0].text.strip())
    except json.JSONDecodeError:
        return {"goal": goal, "phases": [], "risks": [], "raw": resp.content[0].text}


async def run_operator(task: str, context: str) -> dict[str, Any]:
    if not settings.ANTHROPIC_API_KEY:
        return {"draft": f"[DRAFT]\n{task}", "content_type": "document", "warnings": ["API key not configured"]}

    prompt = f"Task: {task}\n\nContext:\n{context}" if context else f"Task: {task}"
    resp = await _client().messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=2048,
        system=OPERATOR_SYSTEM,
        messages=[{"role": "user", "content": prompt}],
    )
    try:
        return json.loads(resp.content[0].text.strip())
    except json.JSONDecodeError:
        return {"draft": resp.content[0].text, "content_type": "document", "warnings": []}


async def run_watcher(memory_summaries: list[str]) -> dict[str, Any]:
    if not settings.ANTHROPIC_API_KEY:
        return {"observations": [], "urgent": [], "risks": [], "proposed_actions": []}

    content = "\n".join(f"- {s}" for s in memory_summaries[:50])
    resp = await _client().messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=2048,
        system=WATCHER_SYSTEM,
        messages=[{"role": "user", "content": f"Scan these memory items:\n{content}"}],
    )
    try:
        return json.loads(resp.content[0].text.strip())
    except json.JSONDecodeError:
        return {"observations": [resp.content[0].text], "urgent": [], "risks": [], "proposed_actions": []}


async def run_reflection(memory_summaries: list[str]) -> dict[str, Any]:
    if not settings.ANTHROPIC_API_KEY:
        return {"patterns": [], "insights": []}

    content = "\n".join(f"- {s}" for s in memory_summaries[:100])
    resp = await _client().messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=2048,
        system=REFLECTION_SYSTEM,
        messages=[{"role": "user", "content": f"Reflect on these memories:\n{content}"}],
    )
    try:
        return json.loads(resp.content[0].text.strip())
    except json.JSONDecodeError:
        return {"patterns": [], "raw": resp.content[0].text}


async def run_briefing_scan(session) -> dict[str, Any]:
    """Run all proactive scans and generate today's daily briefing."""
    from sqlalchemy import select
    from app.models import Memory, ProposedAction, ActionStatus, DailyBriefing

    # Collect recent memory summaries
    result = await session.execute(
        select(Memory).order_by(Memory.created_at.desc()).limit(50)
    )
    memories = result.scalars().all()
    summaries = [f"{m.title}: {m.content[:100]}" for m in memories]

    # Run watcher and reflection in parallel
    watcher_result = await run_watcher(summaries)
    reflection_result = await run_reflection(summaries)

    # Collect pending proposed actions
    pa_result = await session.execute(
        select(ProposedAction).where(ProposedAction.status == ActionStatus.pending)
    )
    pending = pa_result.scalars().all()

    # Create proposed actions from watcher findings
    for item in watcher_result.get("proposed_actions", []):
        action = ProposedAction(
            id=uuid.uuid4(),
            title=item.get("title", "Watcher alert"),
            action_type=item.get("action_type", "remind"),
            reason=item.get("reason", ""),
            risk_level=item.get("risk_level", "low"),
            reversible=item.get("reversible", True),
            proposed_by="watcher",
        )
        session.add(action)

    # Build and save the briefing
    briefing_data = {
        "noticed": watcher_result.get("observations", []),
        "organized": [f"Scanned {len(memories)} memories"],
        "recommendations": reflection_result.get("insights", []),
        "pending_approvals": [f"{a.title} ({a.id})" for a in pending],
    }

    briefing = DailyBriefing(
        id=uuid.uuid4(),
        date=datetime.utcnow(),
        noticed=briefing_data["noticed"],
        organized=briefing_data["organized"],
        recommendations=briefing_data["recommendations"],
        pending_approvals=briefing_data["pending_approvals"],
    )
    session.add(briefing)
    await session.commit()
    return briefing_data
