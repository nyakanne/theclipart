from __future__ import annotations

from fastapi import Header, HTTPException
from jose import JWTError, jwt

from app.core.config import get_settings

settings = get_settings()


async def get_current_user_id(authorization: str | None = Header(default=None)) -> str | None:
    """Return the Supabase user id when auth is configured.

    Local development can run without auth. Production should set REQUIRE_AUTH=true
    and SUPABASE_JWT_SECRET so scans are scoped to the signed-in user.
    """
    if not settings.REQUIRE_AUTH and not settings.SUPABASE_JWT_SECRET:
        return None

    if not authorization or not authorization.lower().startswith('bearer '):
        raise HTTPException(401, 'Authentication required')

    token = authorization.split(' ', 1)[1].strip()
    try:
        payload = jwt.decode(
            token,
            settings.SUPABASE_JWT_SECRET,
            algorithms=['HS256'],
            audience='authenticated',
        )
    except JWTError as exc:
        raise HTTPException(401, 'Invalid authentication token') from exc

    user_id = payload.get('sub')
    if not user_id:
        raise HTTPException(401, 'Authentication token is missing a user id')
    return str(user_id)
