"""Generate call summaries after a call ends."""

import json
import logging
import uuid
from typing import Optional

import anthropic

from app.config import get_settings
from app.models import CallSummary
from app.voice.call_transcripts import get_transcript_as_dicts

logger = logging.getLogger(__name__)
settings = get_settings()

SUMMARY_SYSTEM = """Summarize this phone call transcript concisely.
Return JSON:
{
  "summary": "2-3 sentence summary",
  "key_points": ["bullet points of important information"],
  "action_items": ["things that need follow-up"],
  "sentiment": "positive|neutral|negative|urgent"
}"""


async def generate_call_summary(
    session,
    call_id: uuid.UUID,
) -> Optional[CallSummary]:
    transcript = await get_transcript_as_dicts(session, call_id)
    if not transcript:
        return None

    if not settings.ANTHROPIC_API_KEY:
        return None

    text = "\n".join(f"{t['speaker']}: {t['content']}" for t in transcript)
    client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)

    try:
        resp = await client.messages.create(
            model=settings.CLAUDE_MODEL,
            max_tokens=1024,
            system=SUMMARY_SYSTEM,
            messages=[{"role": "user", "content": f"Transcript:\n{text}"}],
        )
        data = json.loads(resp.content[0].text.strip())
    except Exception as exc:
        logger.error("Call summary generation failed: %s", exc)
        data = {"summary": "Summary unavailable", "key_points": [], "action_items": [], "sentiment": "neutral"}

    summary = CallSummary(
        id=uuid.uuid4(),
        call_id=call_id,
        summary=data.get("summary", ""),
        key_points=data.get("key_points", []),
        action_items=data.get("action_items", []),
        sentiment=data.get("sentiment"),
    )
    session.add(summary)
    await session.commit()
    await session.refresh(summary)
    return summary
