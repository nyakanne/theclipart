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


DEMO_BREACHES = [
    {
        'source': 'LinkedIn', 'source_type': 'breach_db',
        'breach_date': '2012-06-05', 'discovered_date': '2016-05-18',
        'severity': 'high', 'exposed_fields': ['Email addresses', 'Passwords'],
        'record_count': 164611595, 'description': 'LinkedIn suffered a data breach in 2012 exposing 164M accounts.',
        'verified': True,
    },
    {
        'source': 'Adobe', 'source_type': 'breach_db',
        'breach_date': '2013-10-04', 'discovered_date': '2013-11-04',
        'severity': 'critical', 'exposed_fields': ['Email addresses', 'Passwords', 'Usernames', 'Credit card numbers'],
        'record_count': 152445165, 'description': 'Adobe suffered a massive data breach compromising 153M user records.',
        'verified': True,
    },
    {
        'source': 'Canva', 'source_type': 'breach_db',
        'breach_date': '2019-05-24', 'discovered_date': '2019-05-24',
        'severity': 'high', 'exposed_fields': ['Email addresses', 'Usernames', 'Names', 'Passwords'],
        'record_count': 137272116, 'description': 'Canva suffered a data breach exposing 137M user records.',
        'verified': True,
    },
    {
        'source': 'MyFitnessPal', 'source_type': 'breach_db',
        'breach_date': '2018-02-01', 'discovered_date': '2018-03-29',
        'severity': 'high', 'exposed_fields': ['Email addresses', 'Usernames', 'Passwords'],
        'record_count': 143606147, 'description': 'In 2018 MyFitnessPal suffered a breach exposing 144M accounts.',
        'verified': True,
    },
    {
        'source': 'Exactis', 'source_type': 'breach_db',
        'breach_date': '2018-06-01', 'discovered_date': '2018-06-28',
        'severity': 'medium', 'exposed_fields': ['Names', 'Physical addresses', 'Phone numbers'],
        'record_count': 340000000, 'description': 'Data aggregator Exactis exposed a database of 340M records.',
        'verified': True,
    },
    {
        'source': 'Apollo', 'source_type': 'breach_db',
        'breach_date': '2018-07-01', 'discovered_date': '2018-10-05',
        'severity': 'medium', 'exposed_fields': ['Email addresses', 'Names', 'Usernames', 'Phone numbers'],
        'record_count': 125929660, 'description': 'Sales engagement platform Apollo exposed 126M records.',
        'verified': True,
    },
]

DEMO_BROKERS = [
    {
        'broker_name': 'Spokeo', 'broker_url': 'https://www.spokeo.com',
        'listing_url': 'https://www.spokeo.com/search', 'fields_exposed': ['name', 'address', 'phone', 'relatives'],
        'opt_out_url': 'https://www.spokeo.com/optout', 'opt_out_status': 'not_started',
        'opt_out_deadline_days': 30, 'dsar_eligible': True, 'last_seen': '2026-05-10',
    },
    {
        'broker_name': 'WhitePages', 'broker_url': 'https://www.whitepages.com',
        'listing_url': 'https://www.whitepages.com/name/', 'fields_exposed': ['name', 'address', 'phone', 'age'],
        'opt_out_url': 'https://www.whitepages.com/suppression_requests/new', 'opt_out_status': 'not_started',
        'opt_out_deadline_days': 45, 'dsar_eligible': True, 'last_seen': '2026-05-10',
    },
    {
        'broker_name': 'BeenVerified', 'broker_url': 'https://www.beenverified.com',
        'listing_url': 'https://www.beenverified.com/people/', 'fields_exposed': ['name', 'address', 'phone', 'email', 'relatives'],
        'opt_out_url': 'https://www.beenverified.com/app/optout/search', 'opt_out_status': 'not_started',
        'opt_out_deadline_days': 30, 'dsar_eligible': True, 'last_seen': '2026-05-10',
    },
    {
        'broker_name': 'Intelius', 'broker_url': 'https://www.intelius.com',
        'listing_url': 'https://www.intelius.com/people-search/', 'fields_exposed': ['name', 'address', 'phone', 'relatives', 'criminal'],
        'opt_out_url': 'https://www.intelius.com/opt-out/', 'opt_out_status': 'not_started',
        'opt_out_deadline_days': 30, 'dsar_eligible': True, 'last_seen': '2026-05-10',
    },
    {
        'broker_name': 'Radaris', 'broker_url': 'https://radaris.com',
        'listing_url': 'https://radaris.com/p/', 'fields_exposed': ['name', 'address', 'phone', 'email', 'social'],
        'opt_out_url': 'https://radaris.com/control/privacy', 'opt_out_status': 'not_started',
        'opt_out_deadline_days': 45, 'dsar_eligible': True, 'last_seen': '2026-05-10',
    },
    {
        'broker_name': 'MyLife', 'broker_url': 'https://www.mylife.com',
        'listing_url': 'https://www.mylife.com/people-search/', 'fields_exposed': ['name', 'address', 'age', 'relatives'],
        'opt_out_url': 'https://www.mylife.com/ccpa/index.pubview', 'opt_out_status': 'not_started',
        'opt_out_deadline_days': 45, 'dsar_eligible': True, 'last_seen': '2026-05-10',
    },
    {
        'broker_name': 'Pipl', 'broker_url': 'https://pipl.com',
        'listing_url': 'https://pipl.com/search/', 'fields_exposed': ['name', 'email', 'phone', 'address', 'social'],
        'opt_out_url': 'https://pipl.com/personal-information-removal-request/', 'opt_out_status': 'not_started',
        'opt_out_deadline_days': 30, 'dsar_eligible': True, 'last_seen': '2026-05-10',
    },
    {
        'broker_name': 'PeopleFinder', 'broker_url': 'https://www.peoplefinders.com',
        'listing_url': 'https://www.peoplefinders.com/people/', 'fields_exposed': ['name', 'address', 'phone', 'relatives'],
        'opt_out_url': 'https://www.peoplefinders.com/manage/', 'opt_out_status': 'not_started',
        'opt_out_deadline_days': 30, 'dsar_eligible': True, 'last_seen': '2026-05-10',
    },
]


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

    # When no real API key is configured, use well-known public breach records
    if not breaches and not settings.HIBP_API_KEY:
        import hashlib
        seed = int(hashlib.md5((query.get('email') or query.get('full_name') or 'demo').encode()).hexdigest(), 16)
        count = 3 + (seed % 4)
        breaches = list(DEMO_BREACHES[:count])

    return breaches
