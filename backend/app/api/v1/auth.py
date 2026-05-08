"""
OAuth flows for DataGuard backend (Docker/VPS deployment path).

  GitHub OAuth:
    GET  /api/v1/auth/github           → redirect to GitHub consent screen
    GET  /api/v1/auth/github/callback  → exchange code, upsert user, return JWT
  Google OAuth:
    GET  /api/v1/auth/google           → redirect to Google consent screen
    GET  /api/v1/auth/google/callback  → exchange code, upsert user, return JWT
  Common:
    GET  /api/v1/auth/me               → return current user (requires Bearer JWT)
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import (
    create_access_token,
    exchange_google_code,
    get_current_user_id,
    get_google_userinfo,
)
from app.core.config import get_settings
from app.core.database import get_db
from app.models.user import User

settings = get_settings()
router = APIRouter(prefix='/auth', tags=['auth'])

GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
GOOGLE_SCOPES   = 'openid email profile'

GITHUB_AUTH_URL  = 'https://github.com/login/oauth/authorize'
GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
GITHUB_USER_URL  = 'https://api.github.com/user'
GITHUB_EMAIL_URL = 'https://api.github.com/user/emails'


class UserOut(BaseModel):
    id: str
    email: str
    name: str
    picture: str | None
    created_at: datetime

    model_config = {'from_attributes': True}


# ── GitHub OAuth ──────────────────────────────────────────────────────────────

@router.get('/github')
async def github_login(request: Request):
    """Redirect browser to GitHub consent screen."""
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(500, 'GITHUB_CLIENT_ID is not configured')
    params = urlencode({
        'client_id':    settings.GITHUB_CLIENT_ID,
        'redirect_uri': _github_redirect_uri(request),
        'scope':        'read:user user:email',
    })
    return RedirectResponse(f'{GITHUB_AUTH_URL}?{params}')


@router.get('/github/callback')
async def github_callback(
    code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    if not code:
        raise HTTPException(400, 'Missing OAuth code')
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(500, 'GitHub OAuth is not configured')

    async with httpx.AsyncClient(timeout=15) as client:
        token_resp = await client.post(
            GITHUB_TOKEN_URL,
            headers={'Accept': 'application/json'},
            json={
                'client_id':     settings.GITHUB_CLIENT_ID,
                'client_secret': settings.GITHUB_CLIENT_SECRET,
                'code':          code,
                'redirect_uri':  _github_redirect_uri(request),
            },
        )
        token_resp.raise_for_status()
        tokens = token_resp.json()

    access_token = tokens.get('access_token')
    if not access_token:
        raise HTTPException(502, tokens.get('error_description', 'GitHub token exchange failed'))

    gh_headers = {
        'Authorization':      f'Bearer {access_token}',
        'Accept':             'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
    }
    async with httpx.AsyncClient(timeout=10) as client:
        profile_resp, email_resp = await _gather(
            client.get(GITHUB_USER_URL,  headers=gh_headers),
            client.get(GITHUB_EMAIL_URL, headers=gh_headers),
        )
    profile = profile_resp.json()
    emails  = email_resp.json() if isinstance(email_resp.json(), list) else []

    primary_email = (
        profile.get('email')
        or next((e['email'] for e in emails if e.get('primary') and e.get('verified')), None)
        or next((e['email'] for e in emails if e.get('verified')), None)
        or f"{profile['login']}@users.noreply.github.com"
    )
    github_sub = f"github:{profile['id']}"
    name       = profile.get('name') or profile['login']
    picture    = profile.get('avatar_url')

    user = await _upsert_user(db, oauth_sub=github_sub, email=primary_email, name=name, picture=picture)
    jwt_token = create_access_token(user.id, user.email)

    frontend = settings.FRONTEND_URL.rstrip('/')
    return RedirectResponse(f'{frontend}/auth/callback#token={jwt_token}', status_code=302)


# ── Google OAuth ──────────────────────────────────────────────────────────────

@router.get('/google')
async def google_login(request: Request):
    """Redirect browser to Google consent screen."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(500, 'GOOGLE_CLIENT_ID is not configured')
    params = urlencode({
        'client_id':     settings.GOOGLE_CLIENT_ID,
        'redirect_uri':  _google_redirect_uri(request),
        'response_type': 'code',
        'scope':         GOOGLE_SCOPES,
        'access_type':   'offline',
        'prompt':        'select_account',
    })
    return RedirectResponse(f'{GOOGLE_AUTH_URL}?{params}')


@router.get('/google/callback')
async def google_callback(
    code: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    if not code:
        raise HTTPException(400, 'Missing OAuth code')

    tokens = await exchange_google_code(code, _google_redirect_uri(request))
    info   = await get_google_userinfo(tokens['access_token'])

    google_sub = info.get('sub')
    email      = info.get('email', '')
    if not google_sub or not email:
        raise HTTPException(400, 'Google did not return required profile fields')

    user = await _upsert_user(
        db,
        oauth_sub=f'google:{google_sub}',
        email=email,
        name=info.get('name', ''),
        picture=info.get('picture'),
    )
    jwt_token = create_access_token(user.id, user.email)

    frontend = settings.FRONTEND_URL.rstrip('/')
    return RedirectResponse(f'{frontend}/auth/callback#token={jwt_token}', status_code=302)


# ── /me ───────────────────────────────────────────────────────────────────────

@router.get('/me', response_model=UserOut)
async def me(
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user   = result.scalar_one_or_none()
    if not user:
        raise HTTPException(404, 'User not found')
    return user


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _upsert_user(
    db: AsyncSession,
    oauth_sub: str,
    email: str,
    name: str,
    picture: str | None,
) -> User:
    result = await db.execute(select(User).where(User.google_sub == oauth_sub))
    user   = result.scalar_one_or_none()
    now    = datetime.now(timezone.utc)

    if user:
        user.last_login = now
        user.picture    = picture
        user.name       = name or user.name
    else:
        user = User(google_sub=oauth_sub, email=email, name=name, picture=picture)
        db.add(user)

    await db.flush()
    return user


async def _gather(*coros):
    import asyncio
    return await asyncio.gather(*coros)


def _github_redirect_uri(request: Request) -> str:
    if settings.GITHUB_REDIRECT_URI:
        return settings.GITHUB_REDIRECT_URI
    proto = request.headers.get('x-forwarded-proto', request.url.scheme)
    host  = request.headers.get('host', request.url.netloc)
    return f'{proto}://{host}/api/v1/auth/github/callback'


def _google_redirect_uri(request: Request) -> str:
    if settings.GOOGLE_REDIRECT_URI:
        return settings.GOOGLE_REDIRECT_URI
    return str(request.url_for('google_callback'))
