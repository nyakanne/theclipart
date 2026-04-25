"""Voice gateway: handles inbound/outbound call lifecycle via LiveKit or Twilio."""

import logging
import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.models import Call, CallAuditLog, CallDirection, CallStatus

logger = logging.getLogger(__name__)
settings = get_settings()


async def create_inbound_call(
    session: AsyncSession,
    caller_number: str,
    provider: str = "livekit",
    provider_call_id: Optional[str] = None,
) -> Call:
    call = Call(
        id=uuid.uuid4(),
        direction=CallDirection.inbound,
        status=CallStatus.ringing,
        caller_number=caller_number,
        provider=provider,
        provider_call_id=provider_call_id,
        started_at=datetime.utcnow(),
    )
    session.add(call)
    await session.commit()
    await session.refresh(call)

    await _log_call_event(session, call.id, "call.inbound.started", "gateway", {"caller": caller_number})
    return call


async def update_call_status(
    session: AsyncSession,
    call: Call,
    status: CallStatus,
    duration_seconds: Optional[int] = None,
) -> Call:
    call.status = status
    if status == CallStatus.ended:
        call.ended_at = datetime.utcnow()
        if duration_seconds:
            call.duration_seconds = duration_seconds
    await session.commit()
    await _log_call_event(session, call.id, f"call.status.{status}", "gateway", {"status": status})
    return call


async def _log_call_event(
    session: AsyncSession,
    call_id: uuid.UUID,
    event_type: str,
    actor: str,
    details: dict,
) -> None:
    entry = CallAuditLog(
        id=uuid.uuid4(),
        call_id=call_id,
        event_type=event_type,
        actor=actor,
        details=details,
    )
    session.add(entry)
    await session.commit()


def build_livekit_token(room_name: str, participant_name: str) -> Optional[str]:
    """Generate a LiveKit access token for a call room (livekit-api v1.x)."""
    if not settings.LIVEKIT_API_KEY or not settings.LIVEKIT_API_SECRET:
        logger.warning("LiveKit credentials not configured")
        return None
    try:
        from livekit import api as livekit_api
        token = (
            livekit_api.AccessToken(settings.LIVEKIT_API_KEY, settings.LIVEKIT_API_SECRET)
            .with_identity(participant_name)
            .with_name(participant_name)
            .with_grants(livekit_api.VideoGrants(room_join=True, room=room_name))
        )
        # to_jwt() is sync in livekit-api v1.x
        return token.to_jwt()
    except ImportError:
        logger.warning("livekit package not installed — voice calls will not connect")
        return None
    except Exception as exc:
        logger.error("LiveKit token generation failed: %s", exc)
        return None
