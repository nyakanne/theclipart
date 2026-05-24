from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

from app.models.scan import CommandAction


MANUAL_EVIDENCE_FEATURE = 'manual-evidence-capture'


def _action_visible_to_user(action: CommandAction, user_id: str | None) -> bool:
    if user_id is None:
        return action.user_id is None
    return action.user_id == user_id


def _payload_matches_scan(action: CommandAction, scan_id: str) -> bool:
    return str((action.payload or {}).get('scan_id') or '') == scan_id


def manual_evidence_action_to_item(action: CommandAction) -> dict:
    payload = action.payload or {}
    evidence = payload.get('evidence') or {}
    captured_at = str(evidence.get('captured_at') or action.created_at.isoformat() or datetime.now(timezone.utc).isoformat())
    source_category = str(evidence.get('source_category') or 'manual_capture')
    action_label = str(evidence.get('action_label') or 'Open source page')
    return {
        'id': f'manual:{action.id}',
        'kind': 'manual_capture',
        'title': str(evidence.get('title') or action.title),
        'source_name': str(evidence.get('source_name') or 'Manual capture'),
        'source_category': source_category,
        'source_url': str(evidence.get('source_url') or ''),
        'detail': str(evidence.get('detail') or 'Manually captured source evidence.'),
        'risk_level': str(evidence.get('risk_level') or 'medium'),
        'confidence': str(evidence.get('confidence') or 'manual_capture'),
        'captured_at': captured_at,
        'exposed_fields': [str(field) for field in evidence.get('exposed_fields') or [] if str(field).strip()],
        'action_label': action_label,
    }


async def list_manual_evidence_for_scan(db: AsyncSession, scan_id: str, user_id: str | None) -> list[dict]:
    result = await db.execute(
        select(CommandAction)
        .where(CommandAction.feature == MANUAL_EVIDENCE_FEATURE)
        .order_by(CommandAction.created_at.desc())
        .limit(200)
    )
    actions = result.scalars().all()
    return [
        manual_evidence_action_to_item(action)
        for action in actions
        if _action_visible_to_user(action, user_id) and _payload_matches_scan(action, scan_id)
    ]


def list_manual_evidence_for_scan_sync(db: Session, scan_id: str, user_id: str | None) -> list[dict]:
    actions = (
        db.query(CommandAction)
        .filter(CommandAction.feature == MANUAL_EVIDENCE_FEATURE)
        .order_by(CommandAction.created_at.desc())
        .limit(200)
        .all()
    )
    return [
        manual_evidence_action_to_item(action)
        for action in actions
        if _action_visible_to_user(action, user_id) and _payload_matches_scan(action, scan_id)
    ]
