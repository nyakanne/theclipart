"""Call-specific audit logging."""

import uuid
from typing import Any, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CallAuditLog


async def log_call_event(
    session: AsyncSession,
    event_type: str,
    actor: str,
    call_id: Optional[uuid.UUID] = None,
    details: dict[str, Any] | None = None,
) -> CallAuditLog:
    entry = CallAuditLog(
        id=uuid.uuid4(),
        call_id=call_id,
        event_type=event_type,
        actor=actor,
        details=details or {},
    )
    session.add(entry)
    await session.commit()
    return entry


async def get_call_audit_logs(
    session: AsyncSession,
    call_id: Optional[uuid.UUID] = None,
    limit: int = 100,
) -> list[CallAuditLog]:
    q = select(CallAuditLog).order_by(CallAuditLog.created_at.desc()).limit(limit)
    if call_id:
        q = q.where(CallAuditLog.call_id == call_id)
    result = await session.execute(q)
    return list(result.scalars().all())
