from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models.scan import CommandAction
from app.schemas.command import CommandActionIn, CommandActionOut, CommandActionUpdate
from app.core.rate_limit import enforce_api_rate_limit
from app.core.security import decrypt_json_payload, encrypt_json_payload

router = APIRouter(prefix='/command/actions', tags=['command'], dependencies=[Depends(enforce_api_rate_limit)])
RESERVED_FEATURES = {'manual-evidence-capture', 'report-package'}


def _assert_user_managed_feature(feature: str) -> None:
    if feature in RESERVED_FEATURES:
        raise HTTPException(403, 'This action type is managed by a dedicated protected workflow.')


def _action_out(action: CommandAction) -> dict:
    return {
        'id': action.id,
        'user_id': action.user_id,
        'feature': action.feature,
        'title': action.title,
        'status': action.status,
        'payload': decrypt_json_payload(action.payload),
        'created_at': action.created_at,
        'updated_at': action.updated_at,
    }


@router.get('', response_model=list[CommandActionOut])
async def list_actions(
    feature: str | None = None,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    stmt = select(CommandAction).order_by(CommandAction.created_at.desc()).limit(100)
    if user_id is not None:
        stmt = stmt.where(CommandAction.user_id == user_id)
    else:
        stmt = stmt.where(CommandAction.user_id.is_(None))
    if feature:
        stmt = stmt.where(CommandAction.feature == feature)
    result = await db.execute(stmt)
    return [_action_out(action) for action in result.scalars().all()]


@router.post('', response_model=CommandActionOut, status_code=201)
async def create_action(
    body: CommandActionIn,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    _assert_user_managed_feature(body.feature)
    action = CommandAction(
        user_id=user_id,
        feature=body.feature,
        title=body.title,
        status=body.status,
        payload=encrypt_json_payload(body.payload),
    )
    db.add(action)
    await db.flush()
    await db.commit()
    await db.refresh(action)
    return _action_out(action)


@router.patch('/{action_id}', response_model=CommandActionOut)
async def update_action(
    action_id: str,
    body: CommandActionUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    result = await db.execute(select(CommandAction).where(CommandAction.id == action_id))
    action = result.scalar_one_or_none()
    if not action:
        raise HTTPException(404, 'Command action not found')
    _assert_user_managed_feature(action.feature)
    if action.user_id is not None and user_id is None:
        raise HTTPException(404, 'Command action not found')
    if user_id is not None and action.user_id != user_id:
        raise HTTPException(404, 'Command action not found')
    if body.status is not None:
        action.status = body.status
    if body.payload is not None:
        action.payload = encrypt_json_payload(body.payload)
    await db.flush()
    await db.commit()
    await db.refresh(action)
    return _action_out(action)
