"""Manage call transcript records."""

import uuid
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Call, CallTranscript


async def add_transcript_line(
    session: AsyncSession,
    call_id: uuid.UUID,
    speaker: str,
    content: str,
    timestamp_offset: Optional[float] = None,
) -> CallTranscript:
    line = CallTranscript(
        id=uuid.uuid4(),
        call_id=call_id,
        speaker=speaker,
        content=content,
        timestamp_offset=timestamp_offset,
    )
    session.add(line)
    await session.commit()
    return line


async def get_transcript(
    session: AsyncSession,
    call_id: uuid.UUID,
) -> list[CallTranscript]:
    result = await session.execute(
        select(CallTranscript)
        .where(CallTranscript.call_id == call_id)
        .order_by(CallTranscript.created_at)
    )
    return list(result.scalars().all())


async def get_transcript_as_dicts(
    session: AsyncSession,
    call_id: uuid.UUID,
) -> list[dict]:
    lines = await get_transcript(session, call_id)
    return [{"speaker": l.speaker, "content": l.content} for l in lines]
