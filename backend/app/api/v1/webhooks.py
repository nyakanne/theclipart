"""
Webhook endpoints — Mailgun inbound mail (honey-token hits).
"""
import hashlib
import hmac
import logging
import time

from fastapi import APIRouter, Request, HTTPException
from sqlalchemy import select
from app.core.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()
router = APIRouter(prefix='/webhooks', tags=['webhooks'])


def _verify_mailgun(token: str, timestamp: str, signature: str) -> bool:
    if abs(time.time() - int(timestamp)) > 300:
        return False
    expected = hmac.new(  # type: ignore[attr-defined]
        settings.MAILGUN_API_KEY.encode(),
        f'{timestamp}{token}'.encode(),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


@router.post('/mailgun/inbound')
async def mailgun_inbound(request: Request):
    if not settings.MAILGUN_API_KEY:
        raise HTTPException(503, 'Inbound email verification is not configured.')
    form = await request.form()
    token     = form.get('token', '')
    timestamp = form.get('timestamp', '')
    signature = form.get('signature', '')

    if not _verify_mailgun(str(token), str(timestamp), str(signature)):
        raise HTTPException(403, 'Invalid Mailgun signature')

    recipient = str(form.get('recipient', ''))
    sender    = str(form.get('sender', ''))
    subject   = str(form.get('subject', ''))

    log.info('Mailgun inbound received (recipient_fp=%s sender_fp=%s)', hashlib.sha256(recipient.encode()).hexdigest()[:12], hashlib.sha256(sender.encode()).hexdigest()[:12])

    from app.core.database import AsyncSessionLocal
    from app.models.scan import HoneyToken, HoneyTokenHit

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(HoneyToken).where(HoneyToken.alias == recipient))
        token_obj = result.scalar_one_or_none()
        if token_obj:
            hit = HoneyTokenHit(
                token_id=token_obj.id,
                hit_source=sender,
                context_snippet=f'Subject: {subject}',
            )
            db.add(hit)
            await db.commit()
            log.warning('HONEY TOKEN HIT recorded (recipient_fp=%s sender_fp=%s)', hashlib.sha256(recipient.encode()).hexdigest()[:12], hashlib.sha256(sender.encode()).hexdigest()[:12])

    return {'status': 'ok'}
