"""Approval workflow: create, approve, and reject proposed actions."""

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import ActionStatus, Approval, ProposedAction, RiskLevel


async def propose_action(
    session: AsyncSession,
    title: str,
    action_type: str,
    reason: str,
    proposed_by: str = "system",
    target: Optional[str] = None,
    proposed_content: Optional[str] = None,
    source_memory_ids: list[str] | None = None,
    risk_level: str = "medium",
    reversible: bool = False,
    payload: dict | None = None,
) -> ProposedAction:
    action = ProposedAction(
        id=uuid.uuid4(),
        title=title,
        action_type=action_type,
        target=target,
        proposed_content=proposed_content,
        reason=reason,
        source_memory_ids=source_memory_ids or [],
        risk_level=RiskLevel(risk_level),
        approval_required=True,
        reversible=reversible,
        status=ActionStatus.pending,
        proposed_by=proposed_by,
    )
    if payload:
        action.result = {"payload": payload}
    session.add(action)
    await session.commit()
    await session.refresh(action)
    return action


async def approve_action(
    session: AsyncSession,
    action_id: uuid.UUID,
    reviewer: str,
    reason: Optional[str] = None,
) -> Optional[ProposedAction]:
    result = await session.execute(
        select(ProposedAction).where(ProposedAction.id == action_id)
    )
    action = result.scalar_one_or_none()
    if action is None or action.status != ActionStatus.pending:
        return None

    action.status = ActionStatus.approved
    action.reviewer = reviewer
    action.approved_at = datetime.utcnow()
    action.updated_at = datetime.utcnow()

    approval = Approval(
        id=uuid.uuid4(),
        action_id=action.id,
        decision="approved",
        reviewer=reviewer,
        reason=reason,
    )
    session.add(approval)
    await session.commit()
    await session.refresh(action)
    return action


async def reject_action(
    session: AsyncSession,
    action_id: uuid.UUID,
    reviewer: str,
    reason: str = "",
) -> Optional[ProposedAction]:
    result = await session.execute(
        select(ProposedAction).where(ProposedAction.id == action_id)
    )
    action = result.scalar_one_or_none()
    if action is None or action.status != ActionStatus.pending:
        return None

    action.status = ActionStatus.rejected
    action.reviewer = reviewer
    action.rejection_reason = reason
    action.updated_at = datetime.utcnow()

    approval = Approval(
        id=uuid.uuid4(),
        action_id=action.id,
        decision="rejected",
        reviewer=reviewer,
        reason=reason,
    )
    session.add(approval)
    await session.commit()
    await session.refresh(action)
    return action


async def get_pending_actions(session: AsyncSession) -> list[ProposedAction]:
    result = await session.execute(
        select(ProposedAction)
        .where(ProposedAction.status == ActionStatus.pending)
        .order_by(ProposedAction.created_at.desc())
    )
    return list(result.scalars().all())


async def get_all_actions(session: AsyncSession, limit: int = 50) -> list[ProposedAction]:
    result = await session.execute(
        select(ProposedAction).order_by(ProposedAction.created_at.desc()).limit(limit)
    )
    return list(result.scalars().all())


async def get_action(session: AsyncSession, action_id: uuid.UUID) -> Optional[ProposedAction]:
    result = await session.execute(
        select(ProposedAction).where(ProposedAction.id == action_id)
    )
    return result.scalar_one_or_none()
