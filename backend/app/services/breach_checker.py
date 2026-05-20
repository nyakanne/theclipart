"""
Breach Corpus Comparator — checks HIBP API + bloom-filter index on S3
for hash-match against known breach records.
"""
import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Literal

import httpx

from app.core.config import get_settings
from app.core.security import hash_identifier

log = logging.getLogger(__name__)
settings = get_settings()

HibpStatus = Literal['unavailable', 'no_match', 'failed', 'completed']

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

ACTION_MAP = {
    'critical': 'Change your password immediately and enable two-factor authentication',
    'high': 'Change your password and review recent account activity',
    'medium': 'Monitor your accounts for suspicious activity',
    'low': 'Be alert for targeted phishing attempts using this information',
}


def _severity_from_fields(fields: list[str]) -> str:
    for f in fields:
        if SEVERITY_MAP.get(f) == 'critical':
            return 'critical'
    for f in fields:
        if SEVERITY_MAP.get(f) == 'high':
            return 'high'
    return 'medium'


def _action_label(severity: str) -> str:
    return ACTION_MAP.get(severity, ACTION_MAP['medium'])


def _normalize_breach(raw: dict) -> dict:
    fields = raw.get('DataClasses', [])
    now = datetime.now(timezone.utc).date().isoformat()
    return {
        'source': raw['Name'],
        'source_type': 'breach_db',
        'breach_date': raw.get('BreachDate'),
        'discovered_date': now,
        'severity': _severity_from_fields(fields),
        'exposed_fields': fields,
        'record_count': raw.get('PwnCount'),
        'description': raw.get('Description', ''),
        'verified': raw.get('IsVerified', False),
    }


def _normalize_paste(raw: dict) -> dict:
    now = datetime.now(timezone.utc).date().isoformat()
    date_raw = raw.get('Date')
    return {
        'source': raw.get('Source', 'Unknown paste'),
        'source_type': 'paste_site',
        'breach_date': date_raw[:10] if date_raw else None,
        'discovered_date': now,
        'severity': 'medium',
        'exposed_fields': ['Email addresses'],
        'record_count': raw.get('EmailCount'),
        'description': f'Found in paste "{raw.get("Title", "untitled")}" on {raw.get("Source")}',
        'verified': False,
    }


def to_evidence_row(record: dict) -> dict:
    """
    Convert an internal breach/paste record dict to a normalized evidence row
    suitable for API responses and report exports.
    """
    source = record['source']
    source_type = record.get('source_type', 'breach_db')
    severity = record.get('severity', 'medium')

    if source_type == 'breach_db':
        source_url = f'https://haveibeenpwned.com/PwnedWebsites#{source}'
    elif source_type == 'paste_site':
        source_url = 'https://haveibeenpwned.com/account/pasteaccount'
    else:
        source_url = None

    return {
        'source_name': source,
        'source_url': source_url,
        'detail': record.get('description', ''),
        'risk_level': severity,
        'captured_at': record.get('breach_date'),
        'exposed_fields': record.get('exposed_fields', []),
        'action_label': _action_label(severity),
    }


async def check_hibp_with_status(email: str) -> dict:
    """
    Query HIBP v3 breach and paste endpoints for the given email.

    Returns a dict with keys:
      status       — 'unavailable' | 'no_match' | 'failed' | 'completed'
      breach_count — number of breach records found
      paste_count  — number of paste records found
      records      — list of dicts ready for BreachRecord storage
      evidence     — list of normalized evidence rows for API/report output
    """
    _empty: dict = {
        'status': 'unavailable',
        'breach_count': 0,
        'paste_count': 0,
        'records': [],
        'evidence': [],
    }

    if not settings.HIBP_API_KEY or not email:
        return _empty

    headers = {
        'hibp-api-key': settings.HIBP_API_KEY,
        'user-agent': 'Vindica/1.0',
    }
    breach_url = f'https://haveibeenpwned.com/api/v3/breachedaccount/{email}?truncateResponse=false'
    paste_url = f'https://haveibeenpwned.com/api/v3/pasteaccount/{email}'

    breach_resp = None
    paste_resp = None
    had_error = False

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            try:
                breach_resp = await client.get(breach_url, headers=headers)
            except Exception as exc:
                log.warning('HIBP breach request failed: %s', exc)
                had_error = True

            try:
                paste_resp = await client.get(paste_url, headers=headers)
            except Exception as exc:
                log.warning('HIBP paste request failed: %s', exc)
                had_error = True
    except Exception as exc:
        log.warning('HIBP client setup failed: %s', exc)
        return {**_empty, 'status': 'failed'}

    records: list[dict] = []
    breach_count = 0
    paste_count = 0

    # --- breach response ---
    if breach_resp is None:
        had_error = True
    elif breach_resp.status_code == 404:
        pass  # clean — no breaches found
    elif breach_resp.status_code == 429:
        log.warning('HIBP rate limited (breach endpoint)')
        return {**_empty, 'status': 'failed'}
    elif breach_resp.status_code != 200:
        log.warning('HIBP breach endpoint returned HTTP %s', breach_resp.status_code)
        had_error = True
    else:
        for raw in breach_resp.json():
            records.append(_normalize_breach(raw))
            breach_count += 1

    # --- paste response ---
    if paste_resp is None:
        had_error = True
    elif paste_resp.status_code == 404:
        pass  # clean — no pastes found
    elif paste_resp.status_code == 429:
        log.warning('HIBP rate limited (paste endpoint)')
        had_error = True
    elif paste_resp.status_code != 200:
        log.warning('HIBP paste endpoint returned HTTP %s', paste_resp.status_code)
        had_error = True
    else:
        for raw in paste_resp.json():
            records.append(_normalize_paste(raw))
            paste_count += 1

    evidence = [to_evidence_row(r) for r in records]

    if had_error and not records:
        status: HibpStatus = 'failed'
    elif records:
        status = 'completed'
    else:
        status = 'no_match'

    return {
        'status': status,
        'breach_count': breach_count,
        'paste_count': paste_count,
        'records': records,
        'evidence': evidence,
    }


# ---------------------------------------------------------------------------
# Bloom filter (S3-backed local corpus)
# ---------------------------------------------------------------------------

async def bloom_filter_check(identifier_hash: str) -> list[dict]:
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


# ---------------------------------------------------------------------------
# Demo / fallback data (used when no API key is configured)
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Unified entry point used by the scan worker
# ---------------------------------------------------------------------------

async def run_breach_checks(query: dict) -> tuple[list[dict], HibpStatus]:
    """
    Run HIBP + bloom-filter checks for the given query.

    Returns:
        (records, hibp_status) — records are ready for BreachRecord insertion;
        hibp_status reflects the HIBP provider outcome specifically.
    """
    hibp_result: dict = {
        'status': 'unavailable', 'records': [], 'breach_count': 0, 'paste_count': 0, 'evidence': []
    }
    if query.get('email'):
        hibp_result = await check_hibp_with_status(query['email'])

    bloom_tasks = []
    if query.get('email'):
        bloom_tasks.append(bloom_filter_check(hash_identifier(query['email'])))
    if query.get('phone'):
        bloom_tasks.append(bloom_filter_check(hash_identifier(query['phone'])))

    bloom_raw = await asyncio.gather(*bloom_tasks, return_exceptions=True)
    bloom_records: list[dict] = []
    for r in bloom_raw:
        if isinstance(r, list):
            bloom_records.extend(r)

    all_records = hibp_result['records'] + bloom_records

    # No real key configured — use well-known public breach records as demo data
    if not all_records and not settings.HIBP_API_KEY:
        import hashlib
        seed = int(hashlib.md5((query.get('email') or query.get('full_name') or 'demo').encode()).hexdigest(), 16)
        count = 3 + (seed % 4)
        all_records = list(DEMO_BREACHES[:count])

    return all_records, hibp_result['status']
