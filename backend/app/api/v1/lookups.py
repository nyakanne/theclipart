from __future__ import annotations

import asyncio
import logging
from typing import Literal

import httpx
import phonenumbers
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from phonenumbers import PhoneNumberType, carrier, geocoder, number_type, timezone as pn_timezone

from app.core.auth import get_current_user_id
from app.core.config import get_settings
from app.schemas.scan import (
    DomainIntelOut,
    DomainLookupOut,
    ImageAnalysisOut,
    ImageLookupUrlIn,
    IpLookupOut,
    PhoneLookupOut,
    UsernamePlatformOut,
)
from app.services.image_analysis_service import analyze_image_bytes, analyze_image_url
from app.services.ipinfo_service import lookup_ipinfo

log = logging.getLogger(__name__)
router = APIRouter(prefix='/lookups', tags=['lookups'])
settings = get_settings()


PlatformStatus = Literal['found', 'not_found', 'protected', 'error']

_PLATFORMS = [
    {'name': 'Instagram', 'url': 'https://www.instagram.com/{u}/', 'category': 'Social', 'expect_404': True},
    {'name': 'Twitter/X', 'url': 'https://twitter.com/{u}', 'category': 'Social', 'expect_404': True},
    {'name': 'TikTok', 'url': 'https://www.tiktok.com/@{u}', 'category': 'Social', 'expect_404': False},
    {'name': 'Pinterest', 'url': 'https://www.pinterest.com/{u}/', 'category': 'Social', 'expect_404': True},
    {'name': 'LinkedIn', 'url': 'https://www.linkedin.com/in/{u}', 'category': 'Social', 'expect_404': True},
    {'name': 'Reddit', 'url': 'https://www.reddit.com/user/{u}', 'category': 'Social', 'expect_404': True},
    {'name': 'Tumblr', 'url': 'https://www.tumblr.com/{u}', 'category': 'Social', 'expect_404': True},
    {'name': 'Snapchat', 'url': 'https://www.snapchat.com/add/{u}', 'category': 'Social', 'expect_404': True},
    {'name': 'Facebook', 'url': 'https://www.facebook.com/{u}', 'category': 'Social', 'expect_404': False},
    {'name': 'Twitch', 'url': 'https://www.twitch.tv/{u}', 'category': 'Gaming', 'expect_404': True},
    {'name': 'Steam', 'url': 'https://steamcommunity.com/id/{u}', 'category': 'Gaming', 'expect_404': True},
    {'name': 'PSN Profiles', 'url': 'https://psnprofiles.com/{u}', 'category': 'Gaming', 'expect_404': True},
    {'name': 'Roblox', 'url': 'https://www.roblox.com/user.aspx?username={u}', 'category': 'Gaming', 'expect_404': True},
    {'name': 'GitHub', 'url': 'https://github.com/{u}', 'category': 'Dev', 'expect_404': True},
    {'name': 'GitLab', 'url': 'https://gitlab.com/{u}', 'category': 'Dev', 'expect_404': True},
    {'name': 'Hacker News', 'url': 'https://news.ycombinator.com/user?id={u}', 'category': 'Dev', 'expect_404': True},
    {'name': 'Dev.to', 'url': 'https://dev.to/{u}', 'category': 'Dev', 'expect_404': True},
    {'name': 'YouTube', 'url': 'https://www.youtube.com/@{u}', 'category': 'Content', 'expect_404': True},
    {'name': 'Medium', 'url': 'https://medium.com/@{u}', 'category': 'Content', 'expect_404': True},
    {'name': 'Substack', 'url': 'https://{u}.substack.com', 'category': 'Content', 'expect_404': True},
    {'name': 'Patreon', 'url': 'https://www.patreon.com/{u}', 'category': 'Content', 'expect_404': True},
    {'name': 'Telegram', 'url': 'https://t.me/{u}', 'category': 'Messaging', 'expect_404': True},
    {'name': 'Keybase', 'url': 'https://keybase.io/{u}', 'category': 'Messaging', 'expect_404': True},
    {'name': 'Gravatar', 'url': 'https://gravatar.com/{u}', 'category': 'Other', 'expect_404': True},
    {'name': 'About.me', 'url': 'https://about.me/{u}', 'category': 'Other', 'expect_404': True},
    {'name': 'Linktree', 'url': 'https://linktr.ee/{u}', 'category': 'Other', 'expect_404': True},
]

_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36',
    'Accept-Language': 'en-US,en;q=0.9',
}

_LINE_TYPE_LABELS: dict[PhoneNumberType, str] = {
    PhoneNumberType.MOBILE: 'Mobile',
    PhoneNumberType.FIXED_LINE: 'Fixed line',
    PhoneNumberType.FIXED_LINE_OR_MOBILE: 'Fixed line or mobile',
    PhoneNumberType.TOLL_FREE: 'Toll-free',
    PhoneNumberType.PREMIUM_RATE: 'Premium rate',
    PhoneNumberType.SHARED_COST: 'Shared cost',
    PhoneNumberType.VOIP: 'VoIP',
    PhoneNumberType.PERSONAL_NUMBER: 'Personal number',
    PhoneNumberType.PAGER: 'Pager',
    PhoneNumberType.UAN: 'Universal access number',
    PhoneNumberType.UNKNOWN: 'Unknown',
}


def _clean_domain(value: str) -> str:
    clean = value.strip()
    clean = clean.removeprefix('https://').removeprefix('http://')
    clean = clean.split('/')[0].split('?')[0].strip().lower()
    if not clean or '.' not in clean:
        raise ValueError('Enter a valid domain like example.com.')
    return clean


async def _probe(client: httpx.AsyncClient, platform: dict, username: str) -> dict:
    url = platform['url'].format(u=username)
    try:
        response = await client.head(url, headers=_HEADERS, follow_redirects=True, timeout=8)
        if response.status_code == 200:
            status: PlatformStatus = 'found' if platform['expect_404'] else 'protected'
        elif response.status_code in (404, 410):
            status = 'not_found'
        elif response.status_code in (401, 403, 429, 503):
            status = 'protected'
        else:
            status = 'error'
    except Exception as exc:
        log.debug('Username probe error for %s: %s', platform['name'], exc)
        status = 'error'

    return {
        'name': platform['name'],
        'category': platform['category'],
        'url': url,
        'status': status,
    }


@router.get('/username/{username}', response_model=list[UsernamePlatformOut])
async def lookup_username(
    username: str,
    _: str | None = Depends(get_current_user_id),
):
    normalized = username.strip().lstrip('@')
    if not normalized or len(normalized) > 64:
        raise HTTPException(400, 'Enter a valid username.')

    async with httpx.AsyncClient(timeout=10) as client:
        results = await asyncio.gather(
            *[_probe(client, platform, normalized) for platform in _PLATFORMS],
            return_exceptions=True,
        )

    return [result for result in results if isinstance(result, dict)]


@router.get('/ip/{value}', response_model=IpLookupOut)
async def lookup_ip(
    value: str,
    _: str | None = Depends(get_current_user_id),
):
    if not settings.IPINFO_TOKEN:
        raise HTTPException(503, 'IP enrichment is not configured on this server.')
    try:
        data = await lookup_ipinfo(value)
    except ValueError:
        raise HTTPException(400, 'Invalid IP address')
    except httpx.HTTPError:
        raise HTTPException(502, 'IP enrichment provider request failed.')

    if not data:
        raise HTTPException(404, 'No IP enrichment data found.')
    return data


@router.get('/phone/{number:path}', response_model=PhoneLookupOut)
async def lookup_phone(
    number: str,
    _: str | None = Depends(get_current_user_id),
):
    raw = number.strip()
    if not raw:
        raise HTTPException(400, 'Enter a phone number.')

    candidate = raw if raw.startswith('+') else f'+{raw.lstrip("+")}'
    try:
        parsed = phonenumbers.parse(candidate, None)
    except phonenumbers.NumberParseException:
        try:
            parsed = phonenumbers.parse(raw, 'US')
        except phonenumbers.NumberParseException:
            raise HTTPException(400, 'Could not parse phone number. Include country code when possible.')

    return {
        'input': raw,
        'e164': phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164),
        'international': phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.INTERNATIONAL),
        'national': phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.NATIONAL),
        'country_code': parsed.country_code,
        'region_code': phonenumbers.region_code_for_number(parsed),
        'country': geocoder.description_for_number(parsed, 'en') or '',
        'carrier': carrier.name_for_number(parsed, 'en') or '',
        'line_type': _LINE_TYPE_LABELS.get(number_type(parsed), 'Unknown'),
        'timezones': list(pn_timezone.time_zones_for_number(parsed)),
        'valid': phonenumbers.is_valid_number(parsed),
        'possible': phonenumbers.is_possible_number(parsed),
    }


@router.get('/domain/{value}', response_model=DomainLookupOut)
async def lookup_domain(
    value: str,
    _: str | None = Depends(get_current_user_id),
):
    try:
        clean = _clean_domain(value)
    except ValueError as exc:
        raise HTTPException(400, str(exc))

    try:
        async with httpx.AsyncClient(timeout=12.0, follow_redirects=True, headers=_HEADERS) as client:
            response = await client.get(f'https://rdap.org/domain/{clean}')
    except Exception as exc:
        log.warning('RDAP lookup failed for %s: %s', clean, exc)
        return {'domain': clean, 'error': 'RDAP lookup failed — check your connection.'}

    if response.status_code != 200:
        return {'domain': clean, 'error': 'RDAP lookup failed — domain may not exist.'}

    data = response.json()
    nameservers = [item.get('ldhName') for item in data.get('nameservers', []) if item.get('ldhName')]
    events = data.get('events', [])

    def get_date(action: str) -> str | None:
        event = next((item for item in events if item.get('eventAction') == action), None)
        date = event.get('eventDate') if event else None
        return date[:10] if date else None

    registrar = None
    for entity in data.get('entities', []):
        if 'registrar' not in (entity.get('roles') or []):
            continue
        vcard = entity.get('vcardArray') or []
        if len(vcard) > 1:
            registrar_field = next((field for field in vcard[1] if field[0] == 'fn'), None)
            if registrar_field:
                registrar = registrar_field[3]
                break

    return {
        'domain': clean,
        'registrar': registrar or 'Unknown',
        'created': get_date('registration'),
        'expires': get_date('expiration'),
        'nameservers': nameservers,
        'status': data.get('status') or [],
    }


@router.get('/domain-intel/{value:path}', response_model=DomainIntelOut)
async def lookup_domain_intel(
    value: str,
    _: str | None = Depends(get_current_user_id),
):
    try:
        clean = _clean_domain(value)
    except ValueError as exc:
        raise HTTPException(400, str(exc))

    async with httpx.AsyncClient(timeout=12.0, follow_redirects=True, headers=_HEADERS) as client:
        async def fetch_virustotal() -> dict | None:
            if not settings.VIRUSTOTAL_API_KEY:
                return None
            try:
                response = await client.get(
                    f'https://www.virustotal.com/api/v3/domains/{clean}',
                    headers={'x-apikey': settings.VIRUSTOTAL_API_KEY},
                )
                if response.status_code != 200:
                    return None
                attributes = response.json().get('data', {}).get('attributes', {})
                stats = attributes.get('last_analysis_stats', {})
                return {
                    'malicious': stats.get('malicious', 0),
                    'suspicious': stats.get('suspicious', 0),
                    'harmless': stats.get('harmless', 0),
                    'undetected': stats.get('undetected', 0),
                    'reputation': attributes.get('reputation', 0),
                    'categories': attributes.get('categories', {}),
                    'total_votes': attributes.get('total_votes', {}),
                    'registrar': attributes.get('registrar', ''),
                    'creation_date': attributes.get('creation_date'),
                    'last_analysis_date': attributes.get('last_analysis_date'),
                    'tags': attributes.get('tags', []),
                }
            except Exception as exc:
                log.debug('VirusTotal lookup failed for %s: %s', clean, exc)
                return None

        async def fetch_urlscan() -> list[dict]:
            try:
                response = await client.get(
                    f'https://urlscan.io/api/v1/search/?q=domain:{clean}&size=5',
                    headers={'Accept': 'application/json'},
                )
                if response.status_code != 200:
                    return []
                items = response.json().get('results', [])
                return [
                    {
                        'url': item.get('page', {}).get('url', ''),
                        'title': item.get('page', {}).get('title', ''),
                        'ip': item.get('page', {}).get('ip', ''),
                        'country': item.get('page', {}).get('country', ''),
                        'screenshot': item.get('screenshot', ''),
                        'scan_date': item.get('task', {}).get('time', ''),
                        'malicious': item.get('verdicts', {}).get('overall', {}).get('malicious', False),
                        'score': item.get('verdicts', {}).get('overall', {}).get('score', 0),
                        'tags': item.get('verdicts', {}).get('overall', {}).get('tags', []),
                    }
                    for item in items[:5]
                ]
            except Exception as exc:
                log.debug('URLScan lookup failed for %s: %s', clean, exc)
                return []

        async def fetch_shodan() -> dict | None:
            if not settings.SHODAN_API_KEY:
                return None
            try:
                resolve = await client.get(
                    'https://api.shodan.io/dns/resolve',
                    params={'hostnames': clean, 'key': settings.SHODAN_API_KEY},
                )
                if resolve.status_code != 200:
                    return None
                ip = resolve.json().get(clean)
                if not ip:
                    return None

                host = await client.get(
                    f'https://api.shodan.io/shodan/host/{ip}',
                    params={'key': settings.SHODAN_API_KEY},
                )
                if host.status_code != 200:
                    return None
                payload = host.json()
                return {
                    'ip': ip,
                    'org': payload.get('org', ''),
                    'isp': payload.get('isp', ''),
                    'country': payload.get('country_name', ''),
                    'os': payload.get('os'),
                    'ports': payload.get('ports', []),
                    'hostnames': payload.get('hostnames', []),
                    'vulns': list((payload.get('vulns') or {}).keys())[:10],
                    'services': [
                        {
                            'port': item.get('port'),
                            'product': item.get('product', ''),
                            'version': item.get('version', ''),
                            'banner': (item.get('data') or '')[:120],
                        }
                        for item in (payload.get('data') or [])[:8]
                    ],
                }
            except Exception as exc:
                log.debug('Shodan lookup failed for %s: %s', clean, exc)
                return None

        virustotal, urlscan, shodan = await asyncio.gather(
            fetch_virustotal(),
            fetch_urlscan(),
            fetch_shodan(),
        )

    return {
        'domain': clean,
        'virustotal': virustotal,
        'urlscan': urlscan,
        'shodan': shodan,
        'available': {
            'virustotal': bool(settings.VIRUSTOTAL_API_KEY),
            'shodan': bool(settings.SHODAN_API_KEY),
        },
    }


@router.post('/image/url', response_model=ImageAnalysisOut)
async def lookup_image_url(
    body: ImageLookupUrlIn,
    _: str | None = Depends(get_current_user_id),
):
    try:
        return await analyze_image_url(body.image_url)
    except ValueError as exc:
        raise HTTPException(400, str(exc))


@router.post('/image/upload', response_model=ImageAnalysisOut)
async def lookup_image_upload(
    file: UploadFile = File(...),
    _: str | None = Depends(get_current_user_id),
):
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(400, 'Upload a valid image file.')

    payload = await file.read()
    if len(payload) > settings.AZURE_COMPUTER_VISION_MAX_UPLOAD_BYTES:
        raise HTTPException(413, f'Image exceeds {settings.AZURE_COMPUTER_VISION_MAX_UPLOAD_BYTES // (1024 * 1024)} MB upload limit.')

    try:
        return await analyze_image_bytes(payload, file.content_type)
    except ValueError as exc:
        raise HTTPException(400, str(exc))


@router.post('/analyze-image', response_model=ImageAnalysisOut)
async def analyze_image(
    image_url: str = Form(''),
    file: UploadFile | None = File(None),
    _: str | None = Depends(get_current_user_id),
):
    if file is not None:
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(400, 'Upload a valid image file.')
        payload = await file.read()
        if len(payload) > settings.AZURE_COMPUTER_VISION_MAX_UPLOAD_BYTES:
            raise HTTPException(413, f'Image exceeds {settings.AZURE_COMPUTER_VISION_MAX_UPLOAD_BYTES // (1024 * 1024)} MB upload limit.')
        try:
            return await analyze_image_bytes(payload, file.content_type)
        except ValueError as exc:
            raise HTTPException(400, str(exc))

    if image_url.strip():
        try:
            return await analyze_image_url(image_url.strip())
        except ValueError as exc:
            raise HTTPException(400, str(exc))

    raise HTTPException(400, 'Provide either image_url or upload a file.')
