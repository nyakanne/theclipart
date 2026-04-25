"""Call router: identifies callers and routes calls to the voice agent."""

import logging
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Contact, VoiceContact

logger = logging.getLogger(__name__)


async def identify_caller(
    session: AsyncSession,
    phone_number: str,
) -> dict:
    # Check voice contacts first
    result = await session.execute(
        select(VoiceContact).where(VoiceContact.phone_number == phone_number)
    )
    vc = result.scalar_one_or_none()
    if vc:
        return {
            "known": True,
            "name": vc.name,
            "allowed_inbound": vc.allowed_inbound,
            "voice_contact_id": str(vc.id),
            "contact_id": str(vc.contact_id) if vc.contact_id else None,
        }

    # Check contacts by phone
    result = await session.execute(
        select(Contact).where(Contact.phone == phone_number)
    )
    contact = result.scalar_one_or_none()
    if contact:
        return {
            "known": True,
            "name": contact.name,
            "allowed_inbound": True,
            "contact_id": str(contact.id),
        }

    return {"known": False, "name": None, "allowed_inbound": True}


async def is_inbound_allowed(session: AsyncSession, phone_number: str) -> bool:
    caller_info = await identify_caller(session, phone_number)
    return caller_info.get("allowed_inbound", True)


async def get_caller_context(session: AsyncSession, phone_number: str) -> str:
    """Retrieve relevant memory context for an identified caller."""
    from app.retrieve import retrieve_context_string
    caller_info = await identify_caller(session, phone_number)
    if not caller_info.get("name"):
        return ""
    query = f"information about {caller_info['name']}"
    return await retrieve_context_string(session, query, k=3)
