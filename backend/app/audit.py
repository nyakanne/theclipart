"""Audit log: immutable record of all system events."""

import logging
import uuid
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import AuditLog

logger = logging.getLogger(__name__)


async def log_event(
    session: AsyncSession,
    event_type: str,
    actor: str,
    resource_type: Optional[str] = None,
    resource_id: Optional[str] = None,
    reasoning: Optional[str] = None,
    source_memory_ids: list[str] | None = None,
    payload: dict[str, Any] | None = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    entry = AuditLog(
        id=uuid.uuid4(),
        event_type=event_type,
        actor=actor,
        resource_type=resource_type,
        resource_id=resource_id,
        reasoning=reasoning,
        source_memory_ids=source_memory_ids or [],
        payload=payload or {},
        ip_address=ip_address,
    )
    session.add(entry)
    await session.commit()
    logger.info("[audit] %s by %s on %s/%s", event_type, actor, resource_type, resource_id)
    return entry


async def get_logs(
    session: AsyncSession,
    event_type: Optional[str] = None,
    actor: Optional[str] = None,
    resource_type: Optional[str] = None,
    limit: int = 100,
) -> list[AuditLog]:
    q = select(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit)
    if event_type:
        q = q.where(AuditLog.event_type == event_type)
    if actor:
        q = q.where(AuditLog.actor == actor)
    if resource_type:
        q = q.where(AuditLog.resource_type == resource_type)
    result = await session.execute(q)
    return list(result.scalars().all())
