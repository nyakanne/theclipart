"""
Honey-Token Sentinel
Seeds unique aliases (email/phone/name/address) per scan.
Mailgun catch-all webhook records any inbound mail to sentinel addresses.
"""
import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import generate_honey_alias, hash_identifier
from app.models.scan import HoneyToken, HoneyTokenHit

log = logging.getLogger(__name__)


SEED_TYPES = ['email', 'phone', 'name']


async def seed_honey_tokens(scan_id: str, query: dict, db: AsyncSession) -> list[HoneyToken]:
    """Create one sentinel alias per identifier type present in the query."""
    tokens: list[HoneyToken] = []

    for ttype in SEED_TYPES:
        seed_value = query.get(ttype) or query.get('full_name' if ttype == 'name' else ttype)
        if not seed_value:
            continue
        alias = generate_honey_alias(seed_value, ttype)
        token = HoneyToken(
            scan_id=scan_id,
            token_type=ttype,
            alias=alias,
            seed_hash=hash_identifier(seed_value),
        )
        db.add(token)
        tokens.append(token)

    await db.flush()
    log.info('Seeded %d honey tokens for scan %s', len(tokens), scan_id)
    return tokens


async def record_hit(alias: str, source: str, context: str | None, db: AsyncSession) -> HoneyTokenHit | None:
    """Called by Mailgun/webhook handler when a sentinel address receives mail."""
    result = await db.execute(select(HoneyToken).where(HoneyToken.alias == alias))
    token = result.scalar_one_or_none()
    if not token:
        return None

    hit = HoneyTokenHit(
        token_id=token.id,
        hit_source=source,
        hit_timestamp=datetime.now(timezone.utc),
        context_snippet=context,
    )
    db.add(hit)
    await db.flush()
    log.warning('Honey-token hit! alias=%s source=%s', alias, source)
    return hit


async def get_hits_for_scan(scan_id: str, db: AsyncSession) -> list[dict]:
    result = await db.execute(
        select(HoneyToken).where(HoneyToken.scan_id == scan_id)
    )
    tokens = result.scalars().all()
    hits = []
    for token in tokens:
        for h in token.hits:
            hits.append({
                'id': h.id,
                'token_id': token.id,
                'token_type': token.token_type,
                'hit_source': h.hit_source,
                'hit_timestamp': h.hit_timestamp,
                'context_snippet': h.context_snippet,
            })
    return hits
