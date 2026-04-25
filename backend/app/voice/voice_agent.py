"""Voice agent: conducts AI conversations during phone calls."""

import logging
from typing import Optional

import anthropic

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

VOICE_AGENT_SYSTEM = """You are an AI assistant answering a phone call on behalf of the user.

Important rules:
- Introduce yourself as an AI assistant at the start of every call
- Ask for consent before any recording or transcription
- Be brief, clear, and helpful
- Never claim to be the user or a human
- Never make legal, medical, or financial commitments
- Never execute any external action without approval
- If the caller asks for something requiring approval, say you'll pass it along
- Keep responses concise — this is a phone call, not a chat

Opening: "Hello, I'm an AI assistant. I help manage [user]'s communications.
May I ask who's calling and how I can help you today?"
"""


async def generate_voice_response(
    transcript_so_far: list[dict],
    caller_context: str,
    caller_name: Optional[str] = None,
) -> str:
    if not settings.ANTHROPIC_API_KEY:
        return "I'm sorry, I'm having trouble connecting. Please call back later."

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    system = VOICE_AGENT_SYSTEM
    if caller_context:
        system += f"\n\nContext about this caller:\n{caller_context}"
    if caller_name:
        system += f"\n\nCaller identified as: {caller_name}"

    messages = [
        {"role": m["role"], "content": m["content"]}
        for m in transcript_so_far
        if m["role"] in ("user", "assistant")
    ]

    try:
        resp = await client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=256,
            system=system,
            messages=messages or [{"role": "user", "content": "Hello"}],
        )
        return resp.content[0].text.strip()
    except Exception as exc:
        logger.error("Voice agent response failed: %s", exc)
        return "I'm experiencing a technical issue. I'll have someone follow up with you shortly."


async def extract_call_actions(transcript: list[dict]) -> list[dict]:
    """Extract proposed follow-up actions from a completed call transcript."""
    if not settings.ANTHROPIC_API_KEY or not transcript:
        return []

    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
    text = "\n".join(f"{t['speaker']}: {t['content']}" for t in transcript)

    resp = await client.messages.create(
        model=settings.CLAUDE_MODEL,
        max_tokens=1024,
        system="""Extract proposed follow-up actions from this call transcript.
Return JSON: {"actions": [{"title": "...", "action_type": "...", "reason": "...", "risk_level": "low|medium|high"}]}
Only include actions that genuinely need follow-up. Return empty array if none.""",
        messages=[{"role": "user", "content": f"Transcript:\n{text}"}],
    )
    import json
    try:
        return json.loads(resp.content[0].text.strip()).get("actions", [])
    except Exception:
        return []
