"""Ingestion pipeline: text, PDF, DOCX, Markdown, and URL sources."""

import logging
import os
import pathlib
import re
import uuid
from typing import Any

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.memory import store_memory
from app.models import Document, Memory, MemoryType

logger = logging.getLogger(__name__)
settings = get_settings()


# ── Text extraction ────────────────────────────────────────────────────────────

def _extract_pdf(path: str) -> str:
    from pypdf import PdfReader
    reader = PdfReader(path)
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def _extract_docx(path: str) -> str:
    from docx import Document as DocxDoc
    doc = DocxDoc(path)
    return "\n".join(p.text for p in doc.paragraphs)


def _extract_markdown(path: str) -> str:
    with open(path, encoding="utf-8", errors="ignore") as f:
        return f.read()


def _extract_text(path: str) -> str:
    with open(path, encoding="utf-8", errors="ignore") as f:
        return f.read()


def _strip_html(html: str) -> str:
    text = re.sub(r"<[^>]+>", " ", html)
    return re.sub(r"\s+", " ", text).strip()


def extract_text_from_file(path: str, content_type: str) -> str:
    ext = pathlib.Path(path).suffix.lower()
    if ext == ".pdf" or "pdf" in content_type:
        return _extract_pdf(path)
    elif ext in (".docx", ".doc") or "word" in content_type:
        return _extract_docx(path)
    elif ext in (".md", ".markdown"):
        return _extract_markdown(path)
    else:
        return _extract_text(path)


# ── Ingest functions ───────────────────────────────────────────────────────────

async def ingest_uploaded_file(
    session: AsyncSession,
    file_bytes: bytes,
    filename: str,
    content_type: str,
    tags: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
    chunk_size: int = 300,
) -> tuple[Document, Memory]:
    upload_dir = pathlib.Path(settings.UPLOAD_DIR)
    upload_dir.mkdir(parents=True, exist_ok=True)
    file_id = uuid.uuid4()
    ext = pathlib.Path(filename).suffix
    file_path = upload_dir / f"{file_id}{ext}"
    file_path.write_bytes(file_bytes)

    doc = Document(
        id=file_id,
        filename=filename,
        content_type=content_type,
        file_path=str(file_path),
        tags=tags or [],
        metadata_=metadata or {},
    )
    session.add(doc)
    await session.flush()

    try:
        raw_text = extract_text_from_file(str(file_path), content_type)
        doc.raw_text = raw_text
        doc.ingested = True
    except Exception as exc:
        logger.error("Text extraction failed for %s: %s", filename, exc)
        raw_text = ""

    mem = await store_memory(
        session,
        title=filename,
        content=raw_text or f"[Binary file: {filename}]",
        memory_type=MemoryType.note,
        tags=tags or [],
        source=str(file_path),
        source_document_id=doc.id,
        metadata={"filename": filename, "content_type": content_type, **(metadata or {})},
        chunk_size=chunk_size,
    )
    doc.source_document_id = doc.id  # self-reference not needed; stored on memory
    await session.commit()
    return doc, mem


async def ingest_text(
    session: AsyncSession,
    title: str,
    content: str,
    source: str = "manual",
    memory_type: MemoryType = MemoryType.note,
    tags: list[str] | None = None,
    metadata: dict[str, Any] | None = None,
    chunk_size: int = 300,
) -> Memory:
    return await store_memory(
        session,
        title=title,
        content=content,
        memory_type=memory_type,
        tags=tags or [],
        source=source,
        metadata=metadata or {},
        chunk_size=chunk_size,
    )


async def ingest_url(
    session: AsyncSession,
    url: str,
    tags: list[str] | None = None,
    chunk_size: int = 300,
) -> Memory:
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        raw = resp.text

    text = _strip_html(raw)
    title = url.split("/")[-1][:100] or url

    return await store_memory(
        session,
        title=title,
        content=text,
        memory_type=MemoryType.note,
        tags=tags or ["url"],
        source=url,
        metadata={"url": url},
        chunk_size=chunk_size,
    )
