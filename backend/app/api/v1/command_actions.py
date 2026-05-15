from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user_id
from app.core.database import get_db
from app.models.scan import CommandAction
from app.schemas.command import CommandActionIn, CommandActionOut, CommandActionUpdate

router = APIRouter(prefix='/command/actions', tags=['command'])


@router.get('', response_model=list[CommandActionOut])
async def list_actions(
    feature: str | None = None,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    stmt = select(CommandAction).order_by(CommandAction.created_at.desc()).limit(100)
    if user_id is not None:
        stmt = stmt.where(CommandAction.user_id == user_id)
    if feature:
        stmt = stmt.where(CommandAction.feature == feature)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post('', response_model=CommandActionOut, status_code=201)
async def create_action(
    body: CommandActionIn,
    db: AsyncSession = Depends(get_db),
    user_id: str | None = Depends(get_current_user_id),
):
    action = CommandAction(
        user_id=user_id,
        feature=body.feature,
        title=body.title,
        status=body.status,
        payload=body.payload,
    )
    db.add(action)
    await db.flush()
    await db.refresh(action)
    return action


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
    if user_id is not None and action.user_id != user_id:
        raise HTTPException(404, 'Command action not found')
    if body.status is not None:
        action.status = body.status
    if body.payload is not None:
        action.payload = body.payload
    await db.flush()
    await db.refresh(action)
    return action
