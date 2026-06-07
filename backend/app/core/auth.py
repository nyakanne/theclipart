from __future__ import annotations

import time
from collections.abc import Mapping

from fastapi import Header, HTTPException
import httpx
from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()

JWKS_CACHE_TTL_SECONDS = 300
SUPPORTED_JWKS_ALGORITHMS = {'ES256', 'RS256'}

_jwks_cache: dict[str, object] | None = None
_jwks_cache_expires_at = 0.0
_jwks_cache_url = ''


async def get_current_user_id(authorization: str | None = Header(default=None)) -> str | None:
    """Return the Supabase user id when auth is configured.

    Local development can run without auth. Production should set REQUIRE_AUTH=true
    and either SUPABASE_JWKS_URL or SUPABASE_JWT_SECRET so scans are scoped to
    the signed-in user.
    """
    if not authorization:
        if settings.REQUIRE_AUTH or _has_token_verifier():
            raise HTTPException(401, 'Authentication required')
        return None

    if not authorization.lower().startswith('bearer '):
        raise HTTPException(401, 'Authentication required')
    if not _has_token_verifier():
        raise HTTPException(503, 'Vault authentication is not configured on this server')

    token = authorization.split(' ', 1)[1].strip()
    payload = await _decode_supabase_token(token)

    user_id = payload.get('sub')
    if not user_id:
        raise HTTPException(401, 'Authentication token is missing a user id')
    return str(user_id)


def _has_token_verifier() -> bool:
    return bool(settings.supabase_jwks_url or settings.SUPABASE_JWT_SECRET)


async def _decode_supabase_token(token: str) -> Mapping[str, object]:
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as exc:
        raise HTTPException(401, 'Invalid authentication token') from exc

    algorithm = str(header.get('alg') or '')
    if algorithm == 'HS256' and settings.SUPABASE_JWT_SECRET:
        return _decode_with_legacy_secret(token)

    if settings.supabase_jwks_url:
        return await _decode_with_jwks(token, header)

    if settings.SUPABASE_JWT_SECRET:
        return _decode_with_legacy_secret(token)

    raise HTTPException(500, 'Authentication verifier is not configured')


def _decode_with_legacy_secret(token: str) -> Mapping[str, object]:
    try:
        return jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=['HS256'],
            audience=_jwt_audience(),
            options=_jwt_options(),
        )
    except JWTError as exc:
        raise HTTPException(401, 'Invalid authentication token') from exc


async def _decode_with_jwks(token: str, header: Mapping[str, object]) -> Mapping[str, object]:
    algorithm = str(header.get('alg') or '')
    if algorithm not in SUPPORTED_JWKS_ALGORITHMS:
        raise HTTPException(401, 'Unsupported authentication token algorithm')

    key_id = str(header.get('kid') or '')
    if not key_id:
        raise HTTPException(401, 'Authentication token is missing a key id')

    signing_key = await _get_jwks_key(key_id, algorithm)
    try:
        return jwt.decode(
            token,
            signing_key,
            algorithms=[algorithm],
            audience=_jwt_audience(),
            options=_jwt_options(),
        )
    except JWTError as exc:
        raise HTTPException(401, 'Invalid authentication token') from exc


async def _get_jwks_key(key_id: str, algorithm: str) -> Mapping[str, object]:
    jwks = await _get_jwks()
    signing_key = _find_jwks_key(jwks, key_id, algorithm)
    if signing_key:
        return signing_key

    jwks = await _get_jwks(force_refresh=True)
    signing_key = _find_jwks_key(jwks, key_id, algorithm)
    if not signing_key:
        raise HTTPException(401, 'Authentication token signing key was not found')
    return signing_key


async def _get_jwks(force_refresh: bool = False) -> Mapping[str, object]:
    global _jwks_cache, _jwks_cache_expires_at, _jwks_cache_url

    now = time.monotonic()
    url = settings.supabase_jwks_url
    if not url:
        raise HTTPException(500, 'SUPABASE_JWKS_URL is not configured')

    if not force_refresh and _jwks_cache and _jwks_cache_url == url and now < _jwks_cache_expires_at:
        return _jwks_cache

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            jwks = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(401, 'Unable to load authentication signing keys') from exc

    if not isinstance(jwks, dict) or not isinstance(jwks.get('keys'), list):
        raise HTTPException(401, 'Authentication signing keys response was invalid')

    _jwks_cache = jwks
    _jwks_cache_url = url
    _jwks_cache_expires_at = now + JWKS_CACHE_TTL_SECONDS
    return jwks


def _find_jwks_key(
    jwks: Mapping[str, object],
    key_id: str,
    algorithm: str,
) -> Mapping[str, object] | None:
    keys = jwks.get('keys')
    if not isinstance(keys, list):
        return None

    for key in keys:
        if not isinstance(key, Mapping):
            continue
        if key.get('kid') != key_id:
            continue
        key_algorithm = key.get('alg')
        if key_algorithm and key_algorithm != algorithm:
            continue
        return key
    return None


def _jwt_audience() -> str | None:
    return settings.SUPABASE_JWT_AUDIENCE or None


def _jwt_options() -> dict[str, bool]:
    return {'verify_aud': bool(settings.SUPABASE_JWT_AUDIENCE)}
