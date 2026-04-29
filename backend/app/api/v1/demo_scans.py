from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.schemas.scan import ScanRequest, ScanJobOut, ScanResultOut, DsarRequestOut, ReportPackageOut

router = APIRouter(prefix='/scans', tags=['scans'])

_jobs: dict[str, dict] = {}
_results: dict[str, dict] = {}
_dsars: dict[str, list[dict]] = {}

_DEMO_BROKERS = [
    ('FastPeopleSearch', 'https://www.fastpeoplesearch.com', 'https://www.fastpeoplesearch.com/removal', ['name', 'address', 'phone'], 45),
    ('Spokeo', 'https://www.spokeo.com', 'https://www.spokeo.com/optout', ['name', 'email', 'relatives'], 30),
    ('WhitePages', 'https://www.whitepages.com', 'https://www.whitepages.com/suppression-requests', ['name', 'phone', 'address'], 30),
    ('BeenVerified', 'https://www.beenverified.com', 'https://www.beenverified.com/opt-out', ['name', 'address', 'relatives', 'public_records'], 45),
    ('Intelius', 'https://www.intelius.com', 'https://www.intelius.com/opt-out', ['name', 'address', 'phone', 'relatives'], 45),
    ('Radaris', 'https://radaris.com', 'https://radaris.com/opt-out', ['name', 'age_range', 'address', 'associates'], 45),
    ('MyLife', 'https://www.mylife.com', 'https://www.mylife.com/ccpa/index.php', ['name', 'reputation_profile', 'address'], 45),
    ('PeopleFinder', 'https://www.peoplefinder.com', 'https://www.peoplefinder.com/opt-out.php', ['name', 'phone', 'address'], 45),
    ('PeopleSmart', 'https://www.peoplesmart.com', 'https://www.peoplesmart.com/optout-go', ['name', 'email', 'phone'], 45),
    ('TruthFinder', 'https://www.truthfinder.com', 'https://www.truthfinder.com/opt-out', ['name', 'background_report', 'address'], 45),
    ('Instant Checkmate', 'https://www.instantcheckmate.com', 'https://www.instantcheckmate.com/opt-out', ['name', 'background_report', 'relatives'], 45),
    ('ZabaSearch', 'https://www.zabasearch.com', 'https://www.zabasearch.com/block_records', ['name', 'phone', 'address'], 45),
    ('FamilyTreeNow', 'https://www.familytreenow.com', 'https://www.familytreenow.com/optout', ['name', 'relatives', 'address_history'], 45),
    ('PeekYou', 'https://www.peekyou.com', 'https://www.peekyou.com/about/contact/optout', ['name', 'username', 'social_profiles'], 45),
    ('Pipl', 'https://pipl.com', 'https://pipl.com/personal-information-removal-request', ['name', 'email', 'social_profiles'], 45),
    ('411.com', 'https://www.411.com', 'https://www.411.com/privacy', ['name', 'phone', 'address'], 45),
    ('USSearch', 'https://www.ussearch.com', 'https://www.ussearch.com/opt-out', ['name', 'public_records', 'address'], 45),
    ('PublicRecordsNow', 'https://www.publicrecordsnow.com', 'https://www.publicrecordsnow.com/static/view/optout', ['name', 'public_records', 'address'], 45),
    ('Addresses.com', 'https://www.addresses.com', 'https://www.addresses.com/optout.php', ['name', 'address', 'phone'], 45),
    ('Nuwber', 'https://nuwber.com', 'https://nuwber.com/removal/link', ['name', 'address', 'phone', 'relatives'], 45),
]


@router.post('', response_model=ScanJobOut, status_code=201)
async def create_scan(body: ScanRequest):
    if not body.has_any_identifier():
        raise HTTPException(400, 'Provide at least one identifier (email, phone, username, or full_name)')

    scan_id = uuid4().hex
    now = datetime.now(timezone.utc)
    job = {
        'scan_id': scan_id,
        'status': 'completed',
        'progress': 100.0,
        'current_stage': 'complete',
        'estimated_seconds': 0,
        'created_at': now,
    }
    result = _build_demo_result(scan_id, now, body)

    _jobs[scan_id] = job
    _results[scan_id] = result
    _dsars[scan_id] = []
    return job


@router.get('', response_model=list[ScanJobOut])
async def list_scans():
    return list(_jobs.values())[:50]


@router.get('/{scan_id}/status', response_model=ScanJobOut)
async def scan_status(scan_id: str):
    return _get_job(scan_id)


@router.get('/{scan_id}', response_model=ScanResultOut)
async def get_scan_result(scan_id: str):
    if scan_id not in _results:
        raise HTTPException(404, 'Scan not found')
    return _results[scan_id]


@router.get('/{scan_id}/dsar', response_model=list[DsarRequestOut])
async def list_dsar(scan_id: str):
    _get_job(scan_id)
    return _dsars[scan_id]


@router.post('/{scan_id}/dsar/{broker_id}/send', response_model=DsarRequestOut)
async def send_single_dsar(scan_id: str, broker_id: str):
    result = _get_result(scan_id)
    listing = next((item for item in result['broker_listings'] if item['id'] == broker_id), None)
    if not listing:
        raise HTTPException(404, 'Broker listing not found')

    dsar = {
        'id': uuid4().hex,
        'scan_id': scan_id,
        'broker_listing_id': broker_id,
        'broker_name': listing['broker_name'],
        'status': 'sent',
        'sent_at': datetime.now(timezone.utc),
        'deadline_at': datetime.now(timezone.utc) + timedelta(days=listing['opt_out_deadline_days'] or 45),
        'response': None,
    }
    listing['opt_out_status'] = 'submitted'
    _dsars[scan_id].append(dsar)
    return dsar


@router.post('/{scan_id}/dsar/send-all', response_model=list[DsarRequestOut])
async def send_all_dsar(scan_id: str):
    result = _get_result(scan_id)
    sent = []
    for listing in result['broker_listings']:
        if listing['dsar_eligible'] and listing['opt_out_status'] == 'not_started':
            sent.append(await send_single_dsar(scan_id, listing['id']))
    return sent


@router.post('/{scan_id}/opt-out/{broker_id}')
async def opt_out_broker(scan_id: str, broker_id: str):
    result = _get_result(scan_id)
    listing = next((item for item in result['broker_listings'] if item['id'] == broker_id), None)
    if not listing:
        raise HTTPException(404, 'Broker listing not found')
    listing['opt_out_status'] = 'in_progress'
    return {'status': 'in_progress'}


@router.post('/{scan_id}/opt-out/all')
async def opt_out_all(scan_id: str):
    result = _get_result(scan_id)
    queued = 0
    for listing in result['broker_listings']:
        if listing['opt_out_status'] == 'not_started':
            listing['opt_out_status'] = 'in_progress'
            queued += 1
    return {'queued': queued}


@router.post('/{scan_id}/report', response_model=ReportPackageOut)
async def create_report(scan_id: str, body: dict):
    _get_job(scan_id)
    now = datetime.now(timezone.utc)
    return {
        'scan_id': scan_id,
        'generated_at': now,
        'download_url': f'/api/v1/scans/{scan_id}/demo-report.{body.get("format", "pdf")}',
        'format': body.get('format', 'pdf'),
        'includes_dsar': True,
        'includes_compliance': True,
        'expires_at': now + timedelta(hours=1),
    }


def _get_job(scan_id: str) -> dict:
    if scan_id not in _jobs:
        raise HTTPException(404, 'Scan not found')
    return _jobs[scan_id]


def _get_result(scan_id: str) -> dict:
    _get_job(scan_id)
    return _results[scan_id]


def _build_demo_result(scan_id: str, created_at: datetime, body: ScanRequest) -> dict:
    has_email = bool(body.email)
    breaches = []
    if has_email:
        breaches.append({
            'id': uuid4().hex,
            'source': 'Demo breach corpus',
            'source_type': 'breach_db',
            'breach_date': '2024-10-12',
            'discovered_date': created_at.date().isoformat(),
            'severity': 'high',
            'exposed_fields': ['email', 'username', 'password_hash'],
            'record_count': 12840,
            'description': 'Demo result showing how a verified breach record appears in the dashboard.',
            'verified': True,
        })
        breaches.append({
            'id': uuid4().hex,
            'source': 'Demo paste and credential exposure',
            'source_type': 'paste_site',
            'breach_date': '2025-02-04',
            'discovered_date': created_at.date().isoformat(),
            'severity': 'medium',
            'exposed_fields': ['email', 'username', 'ip_hint'],
            'record_count': 426,
            'description': 'Demo signal showing how paste-site or scraped exposure is evaluated for a report packet.',
            'verified': False,
        })

    broker_listings = []
    for broker_name, broker_url, opt_out_url, broker_fields, deadline in _DEMO_BROKERS:
        fields = list(broker_fields)
        if has_email and 'email' not in fields:
            fields.append('email')
        if body.username and 'username' not in fields:
            fields.append('username')
        broker_listings.append({
            'id': uuid4().hex,
            'broker_name': broker_name,
            'broker_url': broker_url,
            'listing_url': None,
            'fields_exposed': fields,
            'opt_out_url': opt_out_url,
            'opt_out_status': 'not_started',
            'opt_out_deadline_days': deadline,
            'dsar_eligible': True,
            'last_seen': created_at.date().isoformat(),
        })

    total_exposures = len(breaches) + len(broker_listings) + 2
    risk_score = 86.0 if breaches else 64.0
    risk_level = 'high' if breaches else 'medium'
    compliance_overall = max(22, 92 - int(total_exposures * 2.5))

    return {
        'scan_id': scan_id,
        'status': 'completed',
        'created_at': created_at,
        'completed_at': created_at,
        'breaches': breaches,
        'broker_listings': broker_listings,
        'honey_token_hits': [
            {
                'id': uuid4().hex,
                'token_id': 'DG-WEB-MONITOR',
                'token_type': 'email',
                'hit_source': 'Demo monitoring source',
                'hit_timestamp': created_at,
                'context_snippet': 'A monitored identifier resurfaced in a demo people-search index.',
            },
            {
                'id': uuid4().hex,
                'token_id': 'DG-SOCIAL-MONITOR',
                'token_type': 'username',
                'hit_source': 'Demo social profile index',
                'hit_timestamp': created_at,
                'context_snippet': 'A username-like identifier appeared in a demo social profile trace.',
            },
        ],
        'compliance': {
            'overall': compliance_overall,
            'gdpr_score': max(20, compliance_overall - 3),
            'ccpa_score': max(20, compliance_overall - 8),
            'risk_level': risk_level,
            'violations': [
                {
                    'regulation': 'CCPA',
                    'article': 'Cal. Civ. Code 1798.105',
                    'description': 'Broker listings are eligible for deletion and opt-out workflow; failure to honor deletion may become a state privacy complaint.',
                    'severity': 'high',
                    'broker_name': 'FastPeopleSearch',
                },
                {
                    'regulation': 'CCPA',
                    'article': 'California Delete Act / SB 362',
                    'description': 'Multiple data-broker style sources indicate a recurring deletion queue should be maintained and documented.',
                    'severity': 'medium',
                    'broker_name': 'Data broker network',
                },
                {
                    'regulation': 'GDPR',
                    'article': 'Articles 15, 17, 21',
                    'description': 'If EU/UK rights apply, the exposure supports access, erasure, and objection requests.',
                    'severity': 'medium',
                    'broker_name': 'Cross-border processors',
                },
                {
                    'regulation': 'PIPEDA',
                    'article': 'Accuracy / consent principles',
                    'description': 'Canadian privacy principles may apply when inaccurate or non-consensual profile data is processed by organizations subject to PIPEDA.',
                    'severity': 'low',
                    'broker_name': 'Profile aggregators',
                },
                {
                    'regulation': 'CCPA',
                    'article': 'FTC Act Section 5 signal',
                    'description': 'Unclear privacy disclosures, ignored abuse reports, or deceptive removal flows should be documented for consumer-protection escalation.',
                    'severity': 'medium',
                    'broker_name': 'Platforms and brokers',
                },
            ],
            'recommendations': [
                'Submit priority removals to critical brokers first and save confirmation receipts.',
                'Create a platform takedown packet for doxxing, impersonation, harassment, or NCII content.',
                'Use StopNCII or NCMEC Take It Down for eligible intimate image hashing scenarios.',
                'Export an IC3/state privacy packet after collecting URLs, screenshots, timestamps, and hashes.',
                'Contact CCRI if the incident involves image-based sexual abuse, sextortion, or non-consensual intimate imagery.',
            ],
        },
        'total_exposures': total_exposures,
        'risk_score': risk_score,
    }
