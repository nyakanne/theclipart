from __future__ import annotations

import hashlib
import logging
import time

from fastapi import Depends, HTTPException, Request
from redis.asyncio import Redis
from redis.exceptions import RedisError

from app.core.auth import get_current_user_id
from app.core.config import get_settings

log = logging.getLogger(__name__)
settings = get_settings()

_redis: Redis | None = None
_local_windows: dict[str, tuple[int, float]] = {}


def _client_key(request: Request, user_id: str | None) -> str:
    identity = f'user:{user_id}' if user_id else f'ip:{request.client.host if request.client else "unknown"}'
    return hashlib.sha256(identity.encode()).hexdigest()[:32]


async def _consume(scope: str, identity: str, limit: int, window_seconds: int) -> None:
    global _redis
    window = int(time.time()) // window_seconds
    key = f'vindica:rate:{scope}:{identity}:{window}'
    try:
        if _redis is None:
            _redis = Redis.from_url(settings.REDIS_URL, encoding='utf-8', decode_responses=True)
        count = await _redis.incr(key)
        if count == 1:
            await _redis.expire(key, window_seconds + 5)
    except RedisError as exc:
        if settings.is_production:
            log.error('Rate limiter unavailable in production: %s', exc)
            raise HTTPException(503, 'Request protection is temporarily unavailable. Try again shortly.') from exc
        count, expires_at = _local_windows.get(key, (0, time.monotonic() + window_seconds))
        if time.monotonic() >= expires_at:
            count, expires_at = 0, time.monotonic() + window_seconds
        count += 1
        _local_windows[key] = (count, expires_at)

    if count > limit:
        raise HTTPException(429, f'Rate limit exceeded for {scope}. Try again later.')


async def enforce_api_rate_limit(
    request: Request,
    user_id: str | None = Depends(get_current_user_id),
) -> None:
    await _consume('api', _client_key(request, user_id), settings.API_REQUESTS_PER_5_MINUTES, 300)


async def enforce_scan_rate_limit(
    request: Request,
    user_id: str | None = Depends(get_current_user_id),
) -> None:
    await _consume('scan', _client_key(request, user_id), settings.SCANS_PER_DAY, 86400)


async def enforce_expensive_lookup_rate_limit(
    request: Request,
    user_id: str | None = Depends(get_current_user_id),
) -> None:
    await _consume('provider', _client_key(request, user_id), settings.EXPENSIVE_LOOKUPS_PER_HOUR, 3600)


async def enforce_image_rate_limit(
    request: Request,
    user_id: str | None = Depends(get_current_user_id),
) -> None:
    await _consume('image', _client_key(request, user_id), settings.IMAGE_ANALYSES_PER_DAY, 86400)
