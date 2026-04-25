"""Store call notes and important details into the memory engine."""

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.memory import store_memory
from app.models import Memory, MemoryType


async def store_call_memory(
    session: AsyncSession,
    call_id: uuid.UUID,
    caller_name: str,
    summary: str,
    key_points: list[str],
    tags: list[str] | None = None,
) -> Memory:
    content = f"Phone call with {caller_name}.\n\nSummary: {summary}"
    if key_points:
        content += "\n\nKey points:\n" + "\n".join(f"- {p}" for p in key_points)

    return await store_memory(
        session,
        title=f"Call with {caller_name}",
        content=content,
        memory_type=MemoryType.event,
        tags=tags or ["call", "phone"],
        source=f"call:{call_id}",
        metadata={"call_id": str(call_id), "caller_name": caller_name},
    )
