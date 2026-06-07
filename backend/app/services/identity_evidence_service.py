from __future__ import annotations

import asyncio
import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timezone

import httpx
import phonenumbers
from phonenumbers import carrier, geocoder, timezone as phone_timezone


@dataclass(frozen=True)
class IdentityEvidenceBundle:
    items: list[dict] = field(default_factory=list)
    statuses: list[dict] = field(default_factory=list)


_USERNAME_SOURCES = (
    ('GitHub', 'https://github.com/{username}'),
    ('Reddit', 'https://www.reddit.com/user/{username}'),
    ('Keybase', 'https://keybase.io/{username}'),
    ('Dev.to', 'https://dev.to/{username}'),
    ('Gravatar', 'https://gravatar.com/{username}'),
)

_HEADERS = {
    'User-Agent': 'Vindica/1.0 (+https://vindica.me)',
    'Accept-Language': 'en-US,en;q=0.9',
}


def _captured_at() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _username_evidence(username: str) -> IdentityEvidenceBundle:
    async with httpx.AsyncClient(timeout=8.0, follow_redirects=True, headers=_HEADERS) as client:
        async def probe(source_name: str, template: str) -> tuple[dict | None, bool]:
            url = template.format(username=username)
            try:
                response = await client.head(url)
            except httpx.HTTPError:
                return None, True
            if response.status_code != 200:
                return None, False
            return {
                'id': f'profile:{source_name.lower()}:{username.lower()}',
                'kind': 'search_result',
                'title': f'{source_name} profile for @{username}',
                'source_name': source_name,
                'source_category': 'public_profile',
                'source_url': str(response.url),
                'detail': f'A public {source_name} profile responded for the scanned username.',
                'risk_level': 'medium',
                'confidence': 'direct_probe',
                'captured_at': _captured_at(),
                'exposed_fields': ['username'],
                'action_label': 'Open public profile',
            }, False

        results = await asyncio.gather(*(probe(name, template) for name, template in _USERNAME_SOURCES))

    items = [item for item, _ in results if item]
    had_failure = any(failed for _, failed in results)
    status = 'completed' if items else 'failed' if had_failure else 'no_match'
    return IdentityEvidenceBundle(
        items=items,
        statuses=[{
            'provider': 'public_profile_probe',
            'label': 'Public profile probe',
            'status': status,
            'message': (
                f'Confirmed {len(items)} public username profiles.'
                if items
                else 'One or more public profile sources could not be reached.'
                if had_failure
                else 'No confirmed public profiles responded for this username.'
            ),
            'fallback_available': not items,
            'item_count': len(items),
        }],
    )


async def _gravatar_evidence(email: str) -> IdentityEvidenceBundle:
    digest = hashlib.md5(email.strip().lower().encode(), usedforsecurity=False).hexdigest()
    try:
        async with httpx.AsyncClient(timeout=8.0, follow_redirects=True, headers=_HEADERS) as client:
            response = await client.get(f'https://en.gravatar.com/{digest}.json')
    except httpx.HTTPError:
        return IdentityEvidenceBundle(statuses=[{
            'provider': 'gravatar',
            'label': 'Gravatar profile',
            'status': 'failed',
            'message': 'Gravatar could not be reached during this scan.',
            'fallback_available': True,
            'item_count': 0,
        }])

    entries = response.json().get('entry', []) if response and response.status_code == 200 else []
    if not entries:
        return IdentityEvidenceBundle(statuses=[{
            'provider': 'gravatar',
            'label': 'Gravatar profile',
            'status': 'no_match',
            'message': 'No public Gravatar profile was returned for this email hash.',
            'fallback_available': False,
            'item_count': 0,
        }])

    entry = entries[0]
    profile_url = entry.get('profileUrl') or f'https://gravatar.com/{digest}'
    display_name = entry.get('displayName') or 'Public Gravatar profile'
    return IdentityEvidenceBundle(
        items=[{
            'id': f'gravatar:{digest}',
            'kind': 'search_result',
            'title': display_name,
            'source_name': 'Gravatar',
            'source_category': 'public_profile',
            'source_url': profile_url,
            'detail': entry.get('aboutMe') or 'A public Gravatar profile is associated with the scanned email hash.',
            'risk_level': 'medium',
            'confidence': 'provider',
            'captured_at': _captured_at(),
            'exposed_fields': ['email', 'profile'],
            'action_label': 'Open public profile',
        }],
        statuses=[{
            'provider': 'gravatar',
            'label': 'Gravatar profile',
            'status': 'completed',
            'message': 'Found a public Gravatar profile associated with this email hash.',
            'fallback_available': False,
            'item_count': 1,
        }],
    )


def _phone_evidence(raw: str) -> IdentityEvidenceBundle:
    try:
        parsed = phonenumbers.parse(raw if raw.startswith('+') else f'+{raw.lstrip("+")}', None)
    except phonenumbers.NumberParseException:
        return IdentityEvidenceBundle(statuses=[{
            'provider': 'libphonenumber',
            'label': 'Phone metadata',
            'status': 'failed',
            'message': 'The phone number could not be parsed for metadata.',
            'fallback_available': False,
            'item_count': 0,
        }])

    e164 = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
    region = geocoder.description_for_number(parsed, 'en') or phonenumbers.region_code_for_number(parsed) or 'Unknown region'
    network = carrier.name_for_number(parsed, 'en') or 'Unknown carrier'
    timezones = ', '.join(phone_timezone.time_zones_for_number(parsed))
    return IdentityEvidenceBundle(
        items=[{
            'id': f'phone:{hashlib.sha256(e164.encode()).hexdigest()[:16]}',
            'kind': 'search_result',
            'title': f'Phone metadata for {e164}',
            'source_name': 'Google libphonenumber',
            'source_category': 'phone_enrichment',
            'source_url': f'tel:{e164}',
            'detail': f'{region} · {network} · {timezones}',
            'risk_level': 'info',
            'confidence': 'validated_metadata',
            'captured_at': _captured_at(),
            'exposed_fields': ['phone', 'region', 'carrier', 'timezone'],
            'action_label': 'Open phone record',
        }],
        statuses=[{
            'provider': 'libphonenumber',
            'label': 'Phone metadata',
            'status': 'completed',
            'message': f'Validated number format and resolved metadata for {e164}.',
            'fallback_available': False,
            'item_count': 1,
        }],
    )


async def build_identity_evidence(query: dict) -> IdentityEvidenceBundle:
    bundles: list[IdentityEvidenceBundle] = []
    if query.get('username'):
        bundles.append(await _username_evidence(str(query['username']).strip().lstrip('@')))
    if query.get('email'):
        bundles.append(await _gravatar_evidence(str(query['email'])))
    if query.get('phone'):
        bundles.append(_phone_evidence(str(query['phone'])))

    return IdentityEvidenceBundle(
        items=[item for bundle in bundles for item in bundle.items],
        statuses=[status for bundle in bundles for status in bundle.statuses],
    )
