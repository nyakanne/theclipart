"""
OSINT utility endpoints — username platform probe, IP, domain helpers.
No auth required: all data is public-record lookups only.
"""
import asyncio
import logging
from typing import Literal

import httpx
from fastapi import APIRouter, Query

log = logging.getLogger(__name__)
router = APIRouter(prefix='/osint', tags=['osint'])

# ---------------------------------------------------------------------------
# Platform definitions — username URL patterns + probe strategy
# ---------------------------------------------------------------------------

PlatformStatus = Literal['found', 'not_found', 'protected', 'error']

_PLATFORMS = [
    # Social
    {'name': 'Instagram',   'url': 'https://www.instagram.com/{u}/',           'category': 'Social',    'expect_404': True},
    {'name': 'Twitter/X',   'url': 'https://twitter.com/{u}',                  'category': 'Social',    'expect_404': True},
    {'name': 'TikTok',      'url': 'https://www.tiktok.com/@{u}',              'category': 'Social',    'expect_404': False},
    {'name': 'Pinterest',   'url': 'https://www.pinterest.com/{u}/',           'category': 'Social',    'expect_404': True},
    {'name': 'LinkedIn',    'url': 'https://www.linkedin.com/in/{u}',          'category': 'Social',    'expect_404': True},
    {'name': 'Reddit',      'url': 'https://www.reddit.com/user/{u}',          'category': 'Social',    'expect_404': True},
    {'name': 'Tumblr',      'url': 'https://www.tumblr.com/{u}',               'category': 'Social',    'expect_404': True},
    {'name': 'Snapchat',    'url': 'https://www.snapchat.com/add/{u}',         'category': 'Social',    'expect_404': True},
    {'name': 'Facebook',    'url': 'https://www.facebook.com/{u}',             'category': 'Social',    'expect_404': False},
    # Gaming
    {'name': 'Twitch',      'url': 'https://www.twitch.tv/{u}',                'category': 'Gaming',    'expect_404': True},
    {'name': 'Steam',       'url': 'https://steamcommunity.com/id/{u}',        'category': 'Gaming',    'expect_404': True},
    {'name': 'PSN Profiles','url': 'https://psnprofiles.com/{u}',              'category': 'Gaming',    'expect_404': True},
    {'name': 'Roblox',      'url': 'https://www.roblox.com/user.aspx?username={u}', 'category': 'Gaming', 'expect_404': True},
    # Dev / Tech
    {'name': 'GitHub',      'url': 'https://github.com/{u}',                   'category': 'Dev',       'expect_404': True},
    {'name': 'GitLab',      'url': 'https://gitlab.com/{u}',                   'category': 'Dev',       'expect_404': True},
    {'name': 'Hacker News', 'url': 'https://news.ycombinator.com/user?id={u}', 'category': 'Dev',       'expect_404': True},
    {'name': 'Dev.to',      'url': 'https://dev.to/{u}',                       'category': 'Dev',       'expect_404': True},
    # Content
    {'name': 'YouTube',     'url': 'https://www.youtube.com/@{u}',             'category': 'Content',   'expect_404': True},
    {'name': 'Medium',      'url': 'https://medium.com/@{u}',                  'category': 'Content',   'expect_404': True},
    {'name': 'Substack',    'url': 'https://{u}.substack.com',                 'category': 'Content',   'expect_404': True},
    {'name': 'Patreon',     'url': 'https://www.patreon.com/{u}',              'category': 'Content',   'expect_404': True},
    # Messaging / Other
    {'name': 'Telegram',    'url': 'https://t.me/{u}',                         'category': 'Messaging', 'expect_404': True},
    {'name': 'Keybase',     'url': 'https://keybase.io/{u}',                   'category': 'Messaging', 'expect_404': True},
    {'name': 'Gravatar',    'url': 'https://gravatar.com/{u}',                 'category': 'Other',     'expect_404': True},
    {'name': 'About.me',    'url': 'https://about.me/{u}',                     'category': 'Other',     'expect_404': True},
    {'name': 'Linktree',    'url': 'https://linktr.ee/{u}',                    'category': 'Other',     'expect_404': True},
]

_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}


async def _probe(client: httpx.AsyncClient, platform: dict, username: str) -> dict:
    url = platform['url'].format(u=username)
    try:
        r = await client.head(url, headers=_HEADERS, follow_redirects=True, timeout=8)
        if r.status_code == 200:
            # Some sites always return 200; mark as 'protected' when we can't tell
            status: PlatformStatus = 'found' if platform['expect_404'] else 'protected'
        elif r.status_code in (404, 410):
            status = 'not_found'
        elif r.status_code in (401, 403, 429, 503):
            status = 'protected'
        else:
            status = 'error'
    except Exception as exc:
        log.debug('Platform probe error %s: %s', platform['name'], exc)
        status = 'error'

    return {
        'name': platform['name'],
        'category': platform['category'],
        'url': url,
        'status': status,
    }


@router.get('/username/{username}')
async def probe_username(
    username: str,
    categories: str = Query('', description='Comma-separated category filter; empty = all'),
):
    """
    Probe username existence across social/gaming/dev/content platforms.
    Returns per-platform status: found | not_found | protected | error.

    Results are best-effort — platforms with bot protection may return 'protected'
    even when the account exists.
    """
    username = username.strip().lstrip('@')
    if not username or len(username) > 64:
        return []

    cats = {c.strip() for c in categories.split(',') if c.strip()}
    platforms = [p for p in _PLATFORMS if not cats or p['category'] in cats]

    async with httpx.AsyncClient(timeout=10) as client:
        results = await asyncio.gather(
            *[_probe(client, p, username) for p in platforms],
            return_exceptions=True,
        )

    return [r for r in results if isinstance(r, dict)]
