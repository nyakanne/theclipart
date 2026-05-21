"""
OSINT utility endpoints — username platform probe, IP, domain helpers.
No auth required: all data is public-record lookups only.
"""
import asyncio
import json
import logging
from typing import Literal

import httpx
import phonenumbers
from phonenumbers import geocoder, carrier, timezone as pn_timezone, number_type, PhoneNumberType
from fastapi import APIRouter, File, Form, Query, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from app.core.config import get_settings

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


# ---------------------------------------------------------------------------
# Bing Visual Search — real-web reverse image search for people/photos
# Free tier: 3,000 calls/month (Azure portal → Bing Search v7)
# ---------------------------------------------------------------------------

_BING_VS_URL = 'https://api.bing.microsoft.com/v7.0/images/visualsearch'
_MAX_UPLOAD_BYTES = 4 * 1024 * 1024  # 4 MB


def _parse_bing_response(data: dict) -> list[dict]:
    """Extract visually similar image matches from Bing Visual Search response."""
    matches: list[dict] = []
    seen_urls: set[str] = set()

    for tag in data.get('tags', []):
        for action in tag.get('actions', []):
            if action.get('actionType') != 'VisualSearch':
                continue
            for img in action.get('data', {}).get('value', []):
                page_url = img.get('hostPageUrl') or img.get('contentUrl') or ''
                if not page_url or page_url in seen_urls:
                    continue
                seen_urls.add(page_url)
                try:
                    hostname = page_url.split('/')[2]
                except IndexError:
                    hostname = page_url
                matches.append({
                    'thumbnail': img.get('thumbnailUrl'),
                    'page_url': page_url,
                    'hostname': hostname,
                    'name': img.get('name', ''),
                    'width': img.get('width'),
                    'height': img.get('height'),
                })
    return matches[:20]


@router.post('/visual-search')
async def bing_visual_search(
    image_url: str = Form('', description='Public image URL (leave blank if uploading a file)'),
    file: UploadFile = File(None, description='Image file upload (JPEG/PNG, max 4 MB)'),
):
    """
    Reverse image search via Bing Visual Search API (Azure free tier: 3,000/month).
    Accepts either a public URL or a direct file upload.
    Returns up to 20 visually similar matches with thumbnail + source page URL.

    Setup: add AZURE_BING_KEY to your .env
    Get key: portal.azure.com → Create resource → Bing Search v7 → Keys and Endpoint
    """
    settings = get_settings()
    key = settings.AZURE_BING_KEY
    if not key:
        raise HTTPException(
            status_code=503,
            detail='Azure Bing key not configured. Add AZURE_BING_KEY to your .env — see /api/docs for setup instructions.',
        )

    bing_headers = {'Ocp-Apim-Subscription-Key': key}

    try:
        async with httpx.AsyncClient(timeout=20) as client:
            if file is not None:
                # File upload path
                raw = await file.read()
                if len(raw) > _MAX_UPLOAD_BYTES:
                    raise HTTPException(status_code=413, detail='Image must be under 4 MB')
                content_type = file.content_type or 'image/jpeg'
                r = await client.post(
                    _BING_VS_URL,
                    headers=bing_headers,
                    files={
                        'knowledgeRequest': (None, json.dumps({'imageInfo': {}}), 'application/json'),
                        'image': (file.filename or 'image.jpg', raw, content_type),
                    },
                )
            elif image_url.strip():
                url = image_url.strip()
                r = await client.post(
                    _BING_VS_URL,
                    headers=bing_headers,
                    files={
                        'knowledgeRequest': (
                            None,
                            json.dumps({'imageInfo': {'url': url}}),
                            'application/json',
                        ),
                    },
                )
            else:
                raise HTTPException(status_code=400, detail='Provide either image_url or upload a file')
    except HTTPException:
        raise
    except Exception as exc:
        log.warning('Bing Visual Search request failed: %s', exc)
        raise HTTPException(status_code=502, detail='Bing Visual Search unavailable — check your network and API key')

    if r.status_code == 401:
        raise HTTPException(status_code=401, detail='Invalid Bing API key — check AZURE_BING_KEY in your .env')
    if r.status_code == 429:
        raise HTTPException(status_code=429, detail='Bing monthly limit reached (3,000/month free). Upgrade tier or wait until next month.')
    if r.status_code not in (200, 201):
        raise HTTPException(status_code=502, detail=f'Bing returned {r.status_code}')

    try:
        data = r.json()
    except Exception:
        raise HTTPException(status_code=502, detail='Invalid JSON from Bing Visual Search')

    matches = _parse_bing_response(data)
    return JSONResponse({'results': matches, 'total': len(matches)})


# ---------------------------------------------------------------------------
# Image analysis — Hugging Face (free) with Azure CV fallback
#
# Priority:
#   1. Hugging Face Inference API — completely free, just needs HF_TOKEN
#      Sign up: huggingface.co → Settings → Access Tokens → New token (read)
#   2. Azure Computer Vision v3.2 — if AZURE_CV_KEY + AZURE_CV_ENDPOINT set
#      Free tier: 5,000 calls/month (portal.azure.com → Computer Vision)
#   3. 503 with setup instructions
# ---------------------------------------------------------------------------

_CV_FEATURES = 'Faces,Tags,Description,Objects,Color'
_CV_DETAILS  = 'Celebrities'

_HF_BASE     = 'https://api-inference.huggingface.co/models'
_HF_CAPTION  = f'{_HF_BASE}/Salesforce/blip-image-captioning-large'
_HF_OBJECTS  = f'{_HF_BASE}/facebook/detr-resnet-50'
_HF_NSFW     = f'{_HF_BASE}/Falconsai/nsfw_image_detection'


async def _hf_call(client: httpx.AsyncClient, url: str, token: str, raw: bytes) -> dict | list | None:
    """Call one HF model, auto-retry once if it's still loading (503)."""
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'image/jpeg'}
    try:
        r = await client.post(url, headers=headers, content=raw, timeout=40)
        if r.status_code == 503:
            # Model cold-starting — wait and retry once
            await asyncio.sleep(15)
            r = await client.post(url, headers=headers, content=raw, timeout=40)
        if r.status_code == 200:
            return r.json()
        log.warning('HF model %s returned %s', url, r.status_code)
        return None
    except Exception as exc:
        log.warning('HF call failed %s: %s', url, exc)
        return None


async def _analyze_with_hf(raw: bytes, token: str) -> dict:
    """Run caption, object detection, and NSFW check concurrently via HF."""
    async with httpx.AsyncClient() as client:
        caption_r, objects_r, nsfw_r = await asyncio.gather(
            _hf_call(client, _HF_CAPTION, token, raw),
            _hf_call(client, _HF_OBJECTS, token, raw),
            _hf_call(client, _HF_NSFW,    token, raw),
        )

    caption = ''
    if isinstance(caption_r, list) and caption_r:
        caption = caption_r[0].get('generated_text', '')

    objects: list[dict] = []
    if isinstance(objects_r, list):
        for o in objects_r:
            score = round(float(o.get('score', 0)) * 100, 1)
            if score >= 40:
                objects.append({'name': o.get('label', ''), 'confidence': score})

    adult_content = False
    if isinstance(nsfw_r, list):
        for item in nsfw_r:
            if item.get('label', '').lower() in ('nsfw', 'explicit') and item.get('score', 0) > 0.5:
                adult_content = True

    # Derive tags from detected object labels (deduplicated)
    seen: set[str] = set()
    tags: list[dict] = []
    for o in objects:
        if o['name'] not in seen:
            seen.add(o['name'])
            tags.append({'name': o['name'], 'confidence': o['confidence']})

    return {
        'caption': caption,
        'caption_confidence': 0,
        'face_count': sum(1 for o in objects if o['name'].lower() == 'person'),
        'celebrities': [],
        'tags': tags[:12],
        'objects': objects,
        'dominant_colors': [],
        'adult_content': adult_content,
        'metadata': {},
        'provider': 'huggingface',
    }


async def _analyze_with_azure(raw: bytes, key: str, endpoint: str) -> dict:
    """Run analysis via Azure Computer Vision v3.2."""
    analyze_url = (
        f'{endpoint.rstrip("/")}/vision/v3.2/analyze'
        f'?visualFeatures={_CV_FEATURES}&details={_CV_DETAILS}&language=en'
    )
    cv_headers = {'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/octet-stream'}

    async with httpx.AsyncClient(timeout=20) as client:
        r = await client.post(analyze_url, headers=cv_headers, content=raw)

    if r.status_code == 401:
        raise HTTPException(status_code=401, detail='Invalid Azure CV key — check AZURE_CV_KEY in your .env')
    if r.status_code == 429:
        raise HTTPException(status_code=429, detail='Azure CV monthly limit reached. Use HF_TOKEN for free analysis.')
    if r.status_code not in (200, 201):
        try:
            detail = r.json().get('error', {}).get('message', f'Azure CV returned {r.status_code}')
        except Exception:
            detail = f'Azure CV returned {r.status_code}'
        raise HTTPException(status_code=502, detail=detail)

    d = r.json()

    celebrities: list[dict] = []
    for cat in (d.get('categories') or []):
        for celeb in (cat.get('detail') or {}).get('celebrities') or []:
            celebrities.append({
                'name': celeb.get('name', ''),
                'confidence': round(float(celeb.get('confidence', 0)) * 100, 1),
            })

    tags = [
        {'name': t['name'], 'confidence': round(t['confidence'] * 100, 1)}
        for t in (d.get('tags') or [])
        if t.get('confidence', 0) >= 0.5
    ][:12]

    objects = [
        {'name': o.get('object', ''), 'confidence': round(o.get('confidence', 0) * 100, 1)}
        for o in (d.get('objects') or [])
    ]

    captions = d.get('description', {}).get('captions') or []
    caption  = captions[0].get('text', '') if captions else ''

    return {
        'caption': caption,
        'caption_confidence': round(float(captions[0].get('confidence', 0)) * 100, 1) if captions else 0,
        'face_count': len(d.get('faces') or []),
        'celebrities': celebrities,
        'tags': tags,
        'objects': objects,
        'dominant_colors': (d.get('color') or {}).get('dominantColors', []),
        'adult_content': (d.get('adult') or {}).get('isAdultContent', False),
        'metadata': d.get('metadata', {}),
        'provider': 'azure',
    }


@router.post('/analyze-image')
async def analyze_image(
    image_url: str = Form('', description='Public image URL (leave blank if uploading a file)'),
    file: UploadFile = File(None, description='Image file upload (JPEG/PNG, max 4 MB)'),
):
    """
    Analyze an image for faces, objects, content tags, and NSFW detection.

    Provider priority (first configured wins):
      1. Hugging Face (free) — add HF_TOKEN to .env
         Get token: huggingface.co → Settings → Access Tokens → New token (read)
      2. Azure Computer Vision — add AZURE_CV_KEY + AZURE_CV_ENDPOINT to .env
         Get keys: portal.azure.com → Computer Vision → Keys and Endpoint
    """
    settings = get_settings()

    # Resolve image bytes — fetch URL server-side or use upload
    raw: bytes
    if file is not None:
        raw = await file.read()
        if len(raw) > _MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail='Image must be under 4 MB')
    elif image_url.strip():
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(image_url.strip(), follow_redirects=True)
            if resp.status_code != 200:
                raise HTTPException(status_code=400, detail=f'Could not fetch image URL (HTTP {resp.status_code})')
            raw = resp.content
            if len(raw) > _MAX_UPLOAD_BYTES:
                raise HTTPException(status_code=413, detail='Remote image is over 4 MB')
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=400, detail=f'Failed to fetch image: {exc}')
    else:
        raise HTTPException(status_code=400, detail='Provide either image_url or upload a file')

    # Provider selection
    if settings.HF_TOKEN:
        try:
            result = await _analyze_with_hf(raw, settings.HF_TOKEN)
            return JSONResponse(result)
        except Exception as exc:
            log.warning('HF analysis failed, falling back to Azure: %s', exc)

    if settings.AZURE_CV_KEY and settings.AZURE_CV_ENDPOINT:
        try:
            result = await _analyze_with_azure(raw, settings.AZURE_CV_KEY, settings.AZURE_CV_ENDPOINT)
            return JSONResponse(result)
        except HTTPException:
            raise
        except Exception as exc:
            log.warning('Azure CV analysis failed: %s', exc)
            raise HTTPException(status_code=502, detail='Azure Computer Vision unavailable')

    raise HTTPException(
        status_code=503,
        detail=(
            'No image analysis provider configured. '
            'Add HF_TOKEN to .env for free analysis (huggingface.co → Settings → Access Tokens), '
            'or add AZURE_CV_KEY + AZURE_CV_ENDPOINT for Azure Computer Vision.'
        ),
    )


# ---------------------------------------------------------------------------
# Brave Search — web evidence for name / username / phone / email
# ---------------------------------------------------------------------------

@router.get('/brave-search')
async def brave_search(q: str = Query(..., min_length=1), count: int = Query(default=10, le=20)):
    """
    Query Brave Search API for public web evidence.
    Requires BRAVE_SEARCH_API_KEY (free: 2,000/month at brave.com/search/api).
    """
    settings = get_settings()
    if not settings.BRAVE_SEARCH_API_KEY:
        return {'available': False, 'results': [], 'query': q}

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            r = await client.get(
                'https://api.search.brave.com/res/v1/web/search',
                params={'q': q, 'count': count, 'safesearch': 'moderate', 'text_decorations': False},
                headers={
                    'X-Subscription-Token': settings.BRAVE_SEARCH_API_KEY,
                    'Accept': 'application/json',
                    'Accept-Encoding': 'gzip',
                },
            )
            if r.status_code != 200:
                log.warning('Brave Search returned %s for query %r', r.status_code, q)
                return {'available': True, 'results': [], 'query': q, 'error': f'Search returned {r.status_code}'}

            data = r.json()
            web_results = data.get('web', {}).get('results', [])
            return {
                'available': True,
                'query': q,
                'total': data.get('web', {}).get('totalResults', len(web_results)),
                'results': [
                    {
                        'title':       item.get('title', ''),
                        'url':         item.get('url', ''),
                        'description': item.get('description', ''),
                        'age':         item.get('age', ''),
                        'language':    item.get('language', ''),
                        'site':        item.get('meta_url', {}).get('hostname', ''),
                    }
                    for item in web_results
                ],
            }
        except Exception as exc:
            log.error('Brave Search error: %s', exc)
            return {'available': True, 'results': [], 'query': q, 'error': str(exc)}


# ---------------------------------------------------------------------------
# Domain deep intelligence — VirusTotal + URLScan.io + Shodan
# ---------------------------------------------------------------------------

@router.get('/domain-intel/{domain:path}')
async def domain_intel(domain: str):
    settings = get_settings()
    clean = domain.strip().lstrip('https://').lstrip('http://').split('/')[0].split('?')[0]

    async with httpx.AsyncClient(timeout=12.0, follow_redirects=True) as client:

        async def _virustotal() -> dict | None:
            if not settings.VIRUSTOTAL_API_KEY:
                return None
            try:
                r = await client.get(
                    f'https://www.virustotal.com/api/v3/domains/{clean}',
                    headers={'x-apikey': settings.VIRUSTOTAL_API_KEY},
                )
                if r.status_code != 200:
                    return None
                attrs = r.json().get('data', {}).get('attributes', {})
                stats = attrs.get('last_analysis_stats', {})
                return {
                    'malicious':   stats.get('malicious', 0),
                    'suspicious':  stats.get('suspicious', 0),
                    'harmless':    stats.get('harmless', 0),
                    'undetected':  stats.get('undetected', 0),
                    'reputation':  attrs.get('reputation', 0),
                    'categories':  attrs.get('categories', {}),
                    'total_votes': attrs.get('total_votes', {}),
                    'registrar':   attrs.get('registrar', ''),
                    'creation_date': attrs.get('creation_date'),
                    'last_analysis_date': attrs.get('last_analysis_date'),
                    'tags':        attrs.get('tags', []),
                }
            except Exception:
                return None

        async def _urlscan() -> list:
            try:
                r = await client.get(
                    f'https://urlscan.io/api/v1/search/?q=domain:{clean}&size=5',
                    headers={'Accept': 'application/json'},
                )
                if r.status_code != 200:
                    return []
                items = r.json().get('results', [])
                return [
                    {
                        'url':        s.get('page', {}).get('url', ''),
                        'title':      s.get('page', {}).get('title', ''),
                        'ip':         s.get('page', {}).get('ip', ''),
                        'country':    s.get('page', {}).get('country', ''),
                        'screenshot': s.get('screenshot', ''),
                        'scan_date':  s.get('task', {}).get('time', ''),
                        'malicious':  s.get('verdicts', {}).get('overall', {}).get('malicious', False),
                        'score':      s.get('verdicts', {}).get('overall', {}).get('score', 0),
                        'tags':       s.get('verdicts', {}).get('overall', {}).get('tags', []),
                    }
                    for s in items[:5]
                ]
            except Exception:
                return []

        async def _shodan() -> dict | None:
            if not settings.SHODAN_API_KEY:
                return None
            try:
                # resolve domain → IP
                r = await client.get(
                    'https://api.shodan.io/dns/resolve',
                    params={'hostnames': clean, 'key': settings.SHODAN_API_KEY},
                )
                if r.status_code != 200:
                    return None
                ip = r.json().get(clean)
                if not ip:
                    return None
                # host details
                hr = await client.get(
                    f'https://api.shodan.io/shodan/host/{ip}',
                    params={'key': settings.SHODAN_API_KEY},
                )
                if hr.status_code != 200:
                    return None
                hd = hr.json()
                return {
                    'ip':        ip,
                    'org':       hd.get('org', ''),
                    'isp':       hd.get('isp', ''),
                    'country':   hd.get('country_name', ''),
                    'os':        hd.get('os'),
                    'ports':     hd.get('ports', []),
                    'hostnames': hd.get('hostnames', []),
                    'vulns':     list(hd.get('vulns', {}).keys())[:10],
                    'services': [
                        {
                            'port':    item.get('port'),
                            'product': item.get('product', ''),
                            'version': item.get('version', ''),
                            'banner':  (item.get('data', '') or '')[:120],
                        }
                        for item in hd.get('data', [])[:8]
                    ],
                }
            except Exception:
                return None

        vt, urlscan, shodan = await asyncio.gather(
            _virustotal(), _urlscan(), _shodan()
        )

    return {
        'domain':    clean,
        'virustotal': vt,
        'urlscan':    urlscan,
        'shodan':     shodan,
        'available': {
            'virustotal': bool(settings.VIRUSTOTAL_API_KEY),
            'shodan':     bool(settings.SHODAN_API_KEY),
        },
    }


# ---------------------------------------------------------------------------
# Phone number analysis — free, no API key (uses libphonenumber)
# ---------------------------------------------------------------------------

_LINE_TYPE_LABELS: dict[PhoneNumberType, str] = {
    PhoneNumberType.MOBILE:       'Mobile',
    PhoneNumberType.FIXED_LINE:   'Fixed line',
    PhoneNumberType.FIXED_LINE_OR_MOBILE: 'Fixed line or mobile',
    PhoneNumberType.TOLL_FREE:    'Toll-free',
    PhoneNumberType.PREMIUM_RATE: 'Premium rate',
    PhoneNumberType.SHARED_COST:  'Shared cost',
    PhoneNumberType.VOIP:         'VoIP',
    PhoneNumberType.PERSONAL_NUMBER: 'Personal number',
    PhoneNumberType.PAGER:        'Pager',
    PhoneNumberType.UAN:          'Universal access number',
    PhoneNumberType.UNKNOWN:      'Unknown',
}


@router.get('/phone/{number:path}')
async def analyze_phone(number: str):
    """
    Parse and analyze a phone number using Google's libphonenumber (free, no API key).
    Returns country, region, carrier hint, line type, validity, and formatted variants.
    Does NOT do reverse lookup (name/address) — that requires paid services.
    """
    raw = number.strip().replace(' ', '+', 1) if number.strip().startswith(' ') else number.strip()
    # Ensure + prefix for international parsing
    if not raw.startswith('+'):
        raw = '+' + raw.lstrip('+')

    try:
        parsed = phonenumbers.parse(raw, None)
    except phonenumbers.NumberParseException:
        # Try with US default region as fallback for bare numbers
        try:
            parsed = phonenumbers.parse(number.strip(), 'US')
        except phonenumbers.NumberParseException:
            raise HTTPException(status_code=400, detail='Could not parse phone number. Include country code (e.g. +1 555 000 0000).')

    valid        = phonenumbers.is_valid_number(parsed)
    possible     = phonenumbers.is_possible_number(parsed)
    line_type    = number_type(parsed)
    region_code  = phonenumbers.region_code_for_number(parsed)

    country      = geocoder.description_for_number(parsed, 'en') or ''
    carrier_name = carrier.name_for_number(parsed, 'en') or ''
    timezones    = list(pn_timezone.time_zones_for_number(parsed))

    return {
        'input':            number.strip(),
        'e164':             phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164),
        'international':    phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.INTERNATIONAL),
        'national':         phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.NATIONAL),
        'country_code':     parsed.country_code,
        'region_code':      region_code,
        'country':          country,
        'carrier':          carrier_name,
        'line_type':        _LINE_TYPE_LABELS.get(line_type, 'Unknown'),
        'timezones':        timezones,
        'valid':            valid,
        'possible':         possible,
    }
