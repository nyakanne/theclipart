"""
OSINT utility endpoints — username platform probe, IP, domain helpers.
No auth required: all data is public-record lookups only.
"""
import asyncio
import logging
from typing import Literal

import httpx
from fastapi import APIRouter, Query, HTTPException

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


# ---------------------------------------------------------------------------
# Reverse image search — SauceNAO proxy (free, no key, 100 req/day)
# ---------------------------------------------------------------------------

_SAUCENAO_URL = 'https://saucenao.com/search.php'
_SAUCENAO_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
}


@router.get('/reverse-image')
async def reverse_image_search(
    url: str = Query(..., description='Public image URL to search'),
):
    """
    Proxy a reverse image search through SauceNAO (free, no API key required).
    Returns up to 10 matches with thumbnail, source URL, and similarity score.
    Rate limit: ~100 searches/day on the free tier.
    """
    url = url.strip()
    if not url.startswith(('http://', 'https://')):
        raise HTTPException(status_code=400, detail='URL must start with http:// or https://')

    params = {
        'output_type': '2',   # JSON
        'numres': '10',
        'url': url,
    }

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.get(_SAUCENAO_URL, params=params, headers=_SAUCENAO_HEADERS, follow_redirects=True)
    except Exception as exc:
        log.warning('SauceNAO request failed: %s', exc)
        raise HTTPException(status_code=502, detail='Reverse image search unavailable — try again shortly')

    if r.status_code == 429:
        raise HTTPException(status_code=429, detail='Daily search limit reached (100/day on free tier). Try again tomorrow.')
    if r.status_code != 200:
        raise HTTPException(status_code=502, detail=f'SauceNAO returned {r.status_code}')

    try:
        data = r.json()
    except Exception:
        raise HTTPException(status_code=502, detail='Invalid response from SauceNAO')

    results = []
    for item in (data.get('results') or []):
        h = item.get('header', {})
        d = item.get('data', {})
        similarity = float(h.get('similarity', 0))
        if similarity < 40:
            continue
        ext_urls = d.get('ext_urls') or []
        results.append({
            'similarity': round(similarity, 1),
            'thumbnail': h.get('thumbnail'),
            'source': ext_urls[0] if ext_urls else None,
            'all_urls': ext_urls,
            'index': h.get('index_name', ''),
            'title': d.get('title') or d.get('source') or d.get('author_name') or '',
            'author': d.get('author_name') or d.get('member_name') or '',
        })

    results.sort(key=lambda x: x['similarity'], reverse=True)
    return {'query_url': url, 'results': results, 'total': len(results)}
