"""
Breach Corpus Comparator — checks HIBP API + bloom-filter index on S3
for hash-match against known breach records.
"""
import asyncio
import hashlib
import json
import logging
from datetime import datetime, timezone

import httpx

from app.core.config import get_settings
from app.core.security import hash_identifier

log = logging.getLogger(__name__)
settings = get_settings()

SEVERITY_MAP = {
    'Passwords': 'critical',
    'Credit card numbers': 'critical',
    'Bank account numbers': 'critical',
    'Social security numbers': 'critical',
    'Email addresses': 'high',
    'Phone numbers': 'high',
    'Physical addresses': 'medium',
    'Names': 'low',
    'Usernames': 'medium',
    'IP addresses': 'medium',
}


def _severity_from_fields(fields: list[str]) -> str:
    for f in fields:
        sev = SEVERITY_MAP.get(f)
        if sev == 'critical':
            return 'critical'
    for f in fields:
        sev = SEVERITY_MAP.get(f)
        if sev == 'high':
            return 'high'
    return 'medium'


async def check_hibp(email: str) -> list[dict]:
    """Query HIBP v3 API for a given email."""
    if not settings.HIBP_API_KEY or not email:
        return []

    headers = {
        'hibp-api-key': settings.HIBP_API_KEY,
        'user-agent': 'DataGuard/1.0',
    }
    url = f'https://haveibeenpwned.com/api/v3/breachedaccount/{email}?truncateResponse=false'

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 404:
                return []
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError as e:
            log.warning('HIBP API error %s', e)
            return []

    results = []
    now = datetime.now(timezone.utc).date().isoformat()
    for breach in data:
        fields = breach.get('DataClasses', [])
        results.append({
            'source': breach['Name'],
            'source_type': 'breach_db',
            'breach_date': breach.get('BreachDate'),
            'discovered_date': now,
            'severity': _severity_from_fields(fields),
            'exposed_fields': fields,
            'record_count': breach.get('PwnCount'),
            'description': breach.get('Description', ''),
            'verified': breach.get('IsVerified', False),
        })
    return results


async def check_paste_sites(email: str) -> list[dict]:
    """Query HIBP paste endpoint."""
    if not settings.HIBP_API_KEY or not email:
        return []

    headers = {
        'hibp-api-key': settings.HIBP_API_KEY,
        'user-agent': 'DataGuard/1.0',
    }
    url = f'https://haveibeenpwned.com/api/v3/pasteaccount/{email}'

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 404:
                return []
            resp.raise_for_status()
            data = resp.json()
        except httpx.HTTPStatusError:
            return []

    now = datetime.now(timezone.utc).date().isoformat()
    return [{
        'source': p.get('Source', 'Unknown paste'),
        'source_type': 'paste_site',
        'breach_date': p.get('Date', now)[:10] if p.get('Date') else None,
        'discovered_date': now,
        'severity': 'medium',
        'exposed_fields': ['Email addresses'],
        'record_count': p.get('EmailCount'),
        'description': f'Found in paste "{p.get("Title", "untitled")}" on {p.get("Source")}',
        'verified': False,
    } for p in data]


async def bloom_filter_check(identifier_hash: str) -> list[dict]:
    """
    Compare SHA-256 hash of identifier against bloom-filter index stored in S3.
    Returns any matched breach corpus entries.
    """
    try:
        import boto3
        import io
        from pybloom_live import ScalableBloomFilter

        s3 = boto3.client('s3', region_name=settings.AWS_REGION)
        obj = s3.get_object(Bucket=settings.S3_BUCKET, Key='bloom/breaches.bloom')
        bf = ScalableBloomFilter.fromfile(io.BytesIO(obj['Body'].read()))
        if identifier_hash not in bf:
            return []

        meta = s3.get_object(Bucket=settings.S3_BUCKET, Key='bloom/breaches_meta.json')
        corpus = json.loads(meta['Body'].read())
        now = datetime.now(timezone.utc).date().isoformat()
        return [{
            'source': entry['source'],
            'source_type': 'breach_db',
            'breach_date': entry.get('breach_date'),
            'discovered_date': now,
            'severity': entry.get('severity', 'medium'),
            'exposed_fields': entry.get('fields', []),
            'record_count': entry.get('record_count'),
            'description': entry.get('description', 'Matched in local breach corpus'),
            'verified': True,
        } for entry in corpus if identifier_hash in entry.get('hashes', [])]
    except Exception as e:
        log.debug('Bloom filter check skipped: %s', e)
        return []


async def run_breach_checks(query: dict) -> list[dict]:
    tasks = []
    if query.get('email'):
        tasks += [check_hibp(query['email']), check_paste_sites(query['email'])]
        tasks.append(bloom_filter_check(hash_identifier(query['email'])))
    if query.get('phone'):
        tasks.append(bloom_filter_check(hash_identifier(query['phone'])))

    results = await asyncio.gather(*tasks, return_exceptions=True)
    breaches: list[dict] = []
    for r in results:
        if isinstance(r, list):
            breaches.extend(r)
    return breaches
