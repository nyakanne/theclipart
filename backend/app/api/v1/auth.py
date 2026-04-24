"""
Google OAuth 2.0 flow:
  1. GET  /api/v1/auth/google          → redirect to Google consent screen
  2. GET  /api/v1/auth/google/callback → exchange code, upsert user, return JWT
  3. GET  /api/v1/auth/me              → return current user info (requires JWT)
"""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Annotated
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse, JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.auth import (
    create_access_token, get_current_user_id,
    exchange_google_code, get_google_userinfo,
)
from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import User

settings = get_settings()
router = APIRouter(prefix='/auth', tags=['auth'])

GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
SCOPES = 'openid email profile'


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    picture: str | None
    created_at: datetime

    model_config = {'from_attributes': True}


class TokenOut(BaseModel):
    access_token: str
    token_type: str = 'bearer'
    user: UserOut


@router.get('/google')
async def google_login(request: Request):
    """Redirect browser to Google consent screen."""
    redirect_uri = _redirect_uri(request)
    params = urlencode({
        'client_id': settings.GOOGLE_CLIENT_ID,
        'redirect_uri': redirect_uri,
        'response_type': 'code',
        'scope': SCOPES,
        'access_type': 'offline',
        'prompt': 'select_account',
    })
    return RedirectResponse(f'{GOOGLE_AUTH_URL}?{params}')


@router.get('/google/callback', response_model=TokenOut)
async def google_callback(
    code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Exchange Google code → upsert user → issue JWT → redirect to frontend."""
    if not code:
        raise HTTPException(400, 'Missing OAuth code')

    tokens = await exchange_google_code(code, _redirect_uri(request))
    info = await get_google_userinfo(tokens['access_token'])

    google_sub = info.get('sub')
    email = info.get('email', '')
    if not google_sub or not email:
        raise HTTPException(400, 'Google did not return required profile fields')

    result = await db.execute(select(User).where(User.google_sub == google_sub))
    user = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    if user:
        user.last_login = now
        user.picture = info.get('picture')
        user.name = info.get('name', user.name)
    else:
        user = User(
            google_sub=google_sub,
            email=email,
            name=info.get('name', ''),
            picture=info.get('picture'),
        )
        db.add(user)

    await db.flush()
    jwt_token = create_access_token(user.id, user.email)

    # Redirect to frontend with token in URL fragment (never in query string)
    frontend = settings.FRONTEND_URL.rstrip('/')
    return RedirectResponse(f'{frontend}/auth/callback#token={jwt_token}', status_code=302)


@router.get('/me', response_model=UserOut)
async def me(
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, 'User not found')
    return user


def _redirect_uri(request: Request) -> str:
    """Build the callback URL from the incoming request host."""
    if settings.GOOGLE_REDIRECT_URI:
        return settings.GOOGLE_REDIRECT_URI
    return str(request.url_for('google_callback'))
