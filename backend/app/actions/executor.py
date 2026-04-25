"""Executor: runs ONLY approved actions. Verifies approval status before every execution."""

import logging
import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.actions import registry
from app.models import ActionStatus, ExecutedAction, ProposedAction

logger = logging.getLogger(__name__)


class ApprovalError(Exception):
    """Raised when an action is not in approved status."""


async def execute_approved_action(
    session: AsyncSession,
    action: ProposedAction,
    executor_agent: str = "executor",
) -> dict:
    # Hard check: status MUST be approved
    if action.status != ActionStatus.approved:
        raise ApprovalError(
            f"Action {action.id} has status '{action.status}', not 'approved'. Execution blocked."
        )

    action_def = registry.get(action.action_type)
    if action_def is None:
        raise ValueError(f"Unknown action type: {action.action_type}")

    # Extract payload from stored result field or build from action fields
    payload = {}
    if action.result and "payload" in action.result:
        payload = action.result["payload"]

    logger.info("[executor] Executing approved action %s (type=%s)", action.id, action.action_type)

    try:
        result = await action_def.handler(**payload)
        action.status = ActionStatus.executed
        action.result = result
        action.executed_at = datetime.utcnow()
        action.updated_at = datetime.utcnow()

        log = ExecutedAction(
            id=uuid.uuid4(),
            action_id=action.id,
            executor_agent=executor_agent,
            result=result,
            success=True,
        )
        session.add(log)
        await session.commit()
        logger.info("[executor] Action %s executed successfully.", action.id)
        return result

    except Exception as exc:
        logger.exception("[executor] Action %s failed: %s", action.id, exc)
        action.status = ActionStatus.failed
        action.result = {"error": str(exc)}
        action.updated_at = datetime.utcnow()

        log = ExecutedAction(
            id=uuid.uuid4(),
            action_id=action.id,
            executor_agent=executor_agent,
            result={"error": str(exc)},
            success=False,
            error=str(exc),
        )
        session.add(log)
        await session.commit()
        raise
