"""Outbound call approval: all outbound calls require explicit user approval."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ActionStatus, OutboundCallRequest


async def request_outbound_call(
    session: AsyncSession,
    to_number: str,
    purpose: str,
    to_name: Optional[str] = None,
    script_draft: Optional[str] = None,
) -> OutboundCallRequest:
    req = OutboundCallRequest(
        id=uuid.uuid4(),
        to_number=to_number,
        to_name=to_name,
        purpose=purpose,
        script_draft=script_draft,
        status=ActionStatus.pending,
    )
    session.add(req)
    await session.commit()
    await session.refresh(req)
    return req


async def approve_outbound_call(
    session: AsyncSession,
    request_id: uuid.UUID,
    reviewer: str,
) -> Optional[OutboundCallRequest]:
    result = await session.execute(
        select(OutboundCallRequest).where(OutboundCallRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if req is None or req.status != ActionStatus.pending:
        return None
    req.status = ActionStatus.approved
    req.reviewer = reviewer
    req.approved_at = datetime.utcnow()
    await session.commit()
    await session.refresh(req)
    return req


async def reject_outbound_call(
    session: AsyncSession,
    request_id: uuid.UUID,
    reviewer: str,
) -> Optional[OutboundCallRequest]:
    result = await session.execute(
        select(OutboundCallRequest).where(OutboundCallRequest.id == request_id)
    )
    req = result.scalar_one_or_none()
    if req is None or req.status != ActionStatus.pending:
        return None
    req.status = ActionStatus.rejected
    req.reviewer = reviewer
    await session.commit()
    await session.refresh(req)
    return req


async def get_pending_outbound(session: AsyncSession) -> list[OutboundCallRequest]:
    result = await session.execute(
        select(OutboundCallRequest)
        .where(OutboundCallRequest.status == ActionStatus.pending)
        .order_by(OutboundCallRequest.created_at.desc())
    )
    return list(result.scalars().all())
