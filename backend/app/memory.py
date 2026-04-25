"""Memory engine: embed, store, and search memory chunks using pgvector."""

import logging
import uuid
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import Memory, MemoryChunk, MemoryType

logger = logging.getLogger(__name__)
settings = get_settings()

# ── Embedding ──────────────────────────────────────────────────────────────────

_openai_client = None
_local_model = None


def _get_openai():
    global _openai_client
    if _openai_client is None:
        from openai import OpenAI
        _openai_client = OpenAI(api_key=settings.OPENAI_API_KEY)
    return _openai_client


def _get_local_model():
    global _local_model
    if _local_model is None:
        from sentence_transformers import SentenceTransformer
        _local_model = SentenceTransformer(settings.LOCAL_EMBED_MODEL)
    return _local_model


def embed(text_input: str) -> list[float]:
    if settings.EMBED_PROVIDER == "openai":
        resp = _get_openai().embeddings.create(model=settings.EMBED_MODEL, input=text_input)
        return resp.data[0].embedding
    else:
        model = _get_local_model()
        return model.encode(text_input, normalize_embeddings=True).tolist()


# ── Storage ────────────────────────────────────────────────────────────────────

def _chunk_text(text_input: str, chunk_size: int = 300, overlap: int = 30) -> list[str]:
    words = text_input.split()
    chunks: list[str] = []
    start = 0
    while start < len(words):
        end = start + chunk_size
        chunk = " ".join(words[start:end])
        if chunk.strip():
            chunks.append(chunk)
        start = end - overlap
    return chunks


async def store_memory(
    session: AsyncSession,
    title: str,
    content: str,
    memory_type: MemoryType = MemoryType.note,
    tags: list[str] | None = None,
    source: str | None = None,
    source_document_id: uuid.UUID | None = None,
    metadata: dict[str, Any] | None = None,
    chunk_size: int = 300,
) -> Memory:
    mem = Memory(
        id=uuid.uuid4(),
        title=title,
        content=content,
        memory_type=memory_type,
        tags=tags or [],
        source=source,
        source_document_id=source_document_id,
        metadata_=metadata or {},
    )
    session.add(mem)
    await session.flush()

    chunks = _chunk_text(content, chunk_size=chunk_size)
    for i, chunk_text in enumerate(chunks):
        try:
            vec = embed(chunk_text)
        except Exception as exc:
            logger.warning("Embedding failed for chunk %d: %s", i, exc)
            vec = [0.0] * settings.EMBED_DIM

        chunk = MemoryChunk(
            id=uuid.uuid4(),
            memory_id=mem.id,
            content=chunk_text,
            embedding=vec,
            chunk_index=i,
        )
        session.add(chunk)

    await session.commit()
    await session.refresh(mem)
    return mem


async def search_chunks(
    session: AsyncSession,
    query: str,
    k: int = 5,
    threshold: float = 0.3,
) -> list[tuple[MemoryChunk, float]]:
    try:
        query_vec = embed(query)
    except Exception as exc:
        logger.error("Embedding query failed: %s", exc)
        return []

    # pgvector cosine distance; lower = more similar, so we negate for score
    result = await session.execute(
        text(
            """
            SELECT mc.id, 1 - (mc.embedding <=> CAST(:vec AS vector)) AS score
            FROM memory_chunks mc
            WHERE 1 - (mc.embedding <=> CAST(:vec AS vector)) >= :threshold
            ORDER BY score DESC
            LIMIT :k
            """
        ),
        {"vec": str(query_vec), "threshold": threshold, "k": k},
    )
    rows = result.fetchall()

    chunks: list[tuple[MemoryChunk, float]] = []
    for row in rows:
        chunk_result = await session.execute(
            select(MemoryChunk).where(MemoryChunk.id == row[0])
        )
        chunk = chunk_result.scalar_one_or_none()
        if chunk:
            chunks.append((chunk, float(row[1])))

    return chunks


async def get_memory(session: AsyncSession, memory_id: uuid.UUID) -> Memory | None:
    result = await session.execute(select(Memory).where(Memory.id == memory_id))
    return result.scalar_one_or_none()


async def list_memories(
    session: AsyncSession,
    memory_type: str | None = None,
    tags: list[str] | None = None,
    limit: int = 50,
) -> list[Memory]:
    q = select(Memory).order_by(Memory.created_at.desc()).limit(limit)
    if memory_type:
        q = q.where(Memory.memory_type == memory_type)
    result = await session.execute(q)
    return list(result.scalars().all())


async def delete_memory(session: AsyncSession, memory_id: uuid.UUID) -> bool:
    mem = await get_memory(session, memory_id)
    if mem is None:
        return False
    await session.delete(mem)
    await session.commit()
    return True
