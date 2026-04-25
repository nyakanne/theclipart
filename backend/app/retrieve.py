"""Retrieval engine: semantic search with source citation and fact labeling."""

import logging
from dataclasses import dataclass
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.memory import search_chunks
from app.models import Memory, MemoryChunk

logger = logging.getLogger(__name__)


@dataclass
class RetrievalHit:
    chunk_id: str
    memory_id: str
    memory_title: str
    content: str
    score: float
    source: Optional[str]


@dataclass
class RetrievalResult:
    query: str
    hits: list[RetrievalHit]
    context_block: str


async def retrieve(
    session: AsyncSession,
    query: str,
    k: int = 5,
    threshold: float = 0.3,
) -> RetrievalResult:
    raw_hits = await search_chunks(session, query, k=k, threshold=threshold)

    hits: list[RetrievalHit] = []
    for chunk, score in raw_hits:
        mem_result = await session.execute(
            select(Memory).where(Memory.id == chunk.memory_id)
        )
        mem = mem_result.scalar_one_or_none()
        if mem is None:
            continue
        hits.append(RetrievalHit(
            chunk_id=str(chunk.id),
            memory_id=str(mem.id),
            memory_title=mem.title,
            content=chunk.content,
            score=score,
            source=mem.source,
        ))

    if hits:
        parts = [
            f"[Memory: {h.memory_title} | Score: {h.score:.2f} | Source: {h.source or 'unknown'}]\n{h.content}"
            for h in hits
        ]
        context_block = "\n\n---\n\n".join(parts)
    else:
        context_block = ""

    return RetrievalResult(query=query, hits=hits, context_block=context_block)


async def retrieve_context_string(
    session: AsyncSession,
    query: str,
    k: int = 5,
    threshold: float = 0.3,
) -> str:
    result = await retrieve(session, query, k=k, threshold=threshold)
    return result.context_block


async def retrieve_sources(
    session: AsyncSession,
    query: str,
    k: int = 5,
) -> list[str]:
    result = await retrieve(session, query, k=k)
    return [h.source for h in result.hits if h.source]
