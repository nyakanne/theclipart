"""
demo_main.py — Lightweight demo backend for local development.
No Postgres, Redis, Celery, or AWS required. All data is in-memory.

Usage (from repo root):
  cd backend
  pip install -r requirements.txt
  python -m uvicorn demo_main:app --host 127.0.0.1 --port 8000 --reload

Then in another terminal:
  cd frontend && npm run dev
  open http://localhost:3000
"""
import asyncio
import os
import random
import uuid
from datetime import datetime, timezone, timedelta
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

# jose is already in requirements.txt (python-jose[cryptography])
from jose import jwt as _jwt

app = FastAPI(title='Phantom Demo API', version='1.0.0-demo', docs_url='/api/docs')

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        'http://localhost:3000', 'http://localhost:5173',
        'http://127.0.0.1:3000', 'http://127.0.0.1:5173',
    ],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# In-memory store for demo scans
_scans: dict[str, dict] = {}

# Fixed demo secret — only used in demo mode, never shipped to production
_DEMO_SECRET = 'demo-only-secret-not-used-in-production-phantom'
_DEMO_USER = {
    'id':         'demo-user-001',
    'email':      'demo@phantom.me',
    'name':       'Demo User',
    'picture':    None,
    'created_at': '2025-01-01T00:00:00Z',
}

FRONTEND_ORIGIN = os.getenv('FRONTEND_URL', 'http://localhost:3000').rstrip('/')


# ── Demo auth helpers ─────────────────────────────────────────────────────────

def _make_demo_jwt() -> str:
    return _jwt.encode(
        {
            'sub':   _DEMO_USER['id'],
            'email': _DEMO_USER['email'],
            'exp':   datetime.now(timezone.utc) + timedelta(hours=24),
        },
        _DEMO_SECRET,
        algorithm='HS256',
    )


# ── Models ────────────────────────────────────────────────────────────────────

class ScanRequest(BaseModel):
    email:        str | None = None
    phone:        str | None = None
    username:     str | None = None
    full_name:    str | None = None
    notify_email: str | None = None


# ── Demo data ─────────────────────────────────────────────────────────────────

BREACH_SOURCES = [
    {'name': 'LinkedIn',      'year': '2021', 'fields': ['Email addresses', 'Phone numbers', 'Passwords'],                          'count': 700_000_000, 'severity': 'critical'},
    {'name': 'Facebook',      'year': '2021', 'fields': ['Email addresses', 'Phone numbers', 'Names', 'Locations'],                  'count': 533_000_000, 'severity': 'high'},
    {'name': 'Adobe',         'year': '2013', 'fields': ['Email addresses', 'Passwords', 'Password hints'],                          'count': 153_000_000, 'severity': 'high'},
    {'name': 'Dropbox',       'year': '2012', 'fields': ['Email addresses', 'Passwords'],                                            'count':  68_700_000, 'severity': 'critical'},
    {'name': 'Twitter',       'year': '2022', 'fields': ['Email addresses', 'Phone numbers'],                                        'count': 400_000_000, 'severity': 'high'},
    {'name': 'MyFitnessPal',  'year': '2018', 'fields': ['Email addresses', 'Usernames', 'Passwords'],                              'count': 150_000_000, 'severity': 'high'},
    {'name': 'Canva',         'year': '2019', 'fields': ['Email addresses', 'Names', 'Usernames'],                                   'count': 137_000_000, 'severity': 'medium'},
    {'name': 'Exactis',       'year': '2018', 'fields': ['Phone numbers', 'Physical addresses', 'Names', 'Email addresses'],         'count': 340_000_000, 'severity': 'critical'},
    {'name': 'Apollo.io',     'year': '2018', 'fields': ['Email addresses', 'Names', 'Phone numbers', 'Employers'],                  'count': 125_000_000, 'severity': 'high'},
    {'name': 'Chegg',         'year': '2018', 'fields': ['Email addresses', 'Names', 'Passwords', 'Physical addresses'],             'count':  40_000_000, 'severity': 'medium'},
]

BROKERS = [
    {'name': 'Spokeo',           'url': 'https://spokeo.com',           'opt_out_url': 'https://www.spokeo.com/opt_out/new',                           'category': 'People Search'},
    {'name': 'WhitePages',       'url': 'https://whitepages.com',       'opt_out_url': 'https://www.whitepages.com/suppression-requests',               'category': 'People Search'},
    {'name': 'BeenVerified',     'url': 'https://beenverified.com',     'opt_out_url': 'https://www.beenverified.com/app/optout/search',                'category': 'People Search'},
    {'name': 'Intelius',         'url': 'https://intelius.com',         'opt_out_url': 'https://www.intelius.com/opt-out',                              'category': 'People Search'},
    {'name': 'Radaris',          'url': 'https://radaris.com',          'opt_out_url': 'https://radaris.com/control/privacy',                           'category': 'People Search'},
    {'name': 'TruthFinder',      'url': 'https://truthfinder.com',      'opt_out_url': 'https://www.truthfinder.com/opt-out/',                          'category': 'People Search'},
    {'name': 'Acxiom',           'url': 'https://acxiom.com',           'opt_out_url': 'https://www.acxiom.com/optout/',                                'category': 'Data Broker'},
    {'name': 'LexisNexis',       'url': 'https://lexisnexis.com',       'opt_out_url': 'https://optout.lexisnexis.com/',                                'category': 'Data Broker'},
    {'name': 'Oracle Data Cloud','url': 'https://oracle.com',           'opt_out_url': 'https://datacloudoptout.oracle.com/',                           'category': 'Ad Network'},
    {'name': 'ZoomInfo',         'url': 'https://zoominfo.com',         'opt_out_url': 'https://www.zoominfo.com/business/login',                       'category': 'B2B Data'},
    {'name': 'PeopleFinders',    'url': 'https://peoplefinders.com',    'opt_out_url': 'https://www.peoplefinders.com/manage/',                         'category': 'People Search'},
    {'name': 'MyLife',           'url': 'https://mylife.com',           'opt_out_url': 'https://www.mylife.com/ccpa/index.pubview',                     'category': 'People Search'},
]


def _mock_scan_result(query: dict) -> dict:
    email = query.get('email', '')
    name  = query.get('full_name', query.get('username', 'Unknown'))

    seed         = len(email) + len(name)
    breach_count = (seed % 5) + 2
    broker_count = (seed % 8) + 5

    selected_breaches = random.sample(BREACH_SOURCES, min(breach_count, len(BREACH_SOURCES)))
    selected_brokers  = random.sample(BROKERS, min(broker_count, len(BROKERS)))

    risk_score    = min(100, breach_count * 12 + broker_count * 4)
    privacy_score = max(10, 100 - risk_score)
    total_sources = breach_count + broker_count + (seed % 3)

    breaches = [
        {
            'id':               uuid.uuid4().hex,
            'source':           b['name'],
            'source_type':      'breach_db',
            'breach_date':      f"{b['year']}-01-01",
            'discovered_date':  datetime.now(timezone.utc).date().isoformat(),
            'severity':         b['severity'],
            'exposed_fields':   b['fields'],
            'record_count':     b['count'],
            'description':      f"In {b['year']}, {b['name']} suffered a data breach exposing {b['count']:,} records.",
            'verified':         True,
        }
        for b in selected_breaches
    ]

    broker_listings = [
        {
            'id':           uuid.uuid4().hex,
            'broker_name':  b['name'],
            'broker_url':   b['url'],
            'opt_out_url':  b['opt_out_url'],
            'category':     b['category'],
            'listing_url':  f"{b['url']}/people/{name.replace(' ', '-').lower()}",
            'data_found':   ['Name', 'Address', 'Phone', 'Relatives', 'Age'],
            'opt_out_status': 'pending',
        }
        for b in selected_brokers
    ]

    compliance = {
        'overall':    privacy_score,
        'risk_level': 'critical' if risk_score >= 75 else 'high' if risk_score >= 50 else 'medium' if risk_score >= 25 else 'low',
        'gdpr_score': max(20, privacy_score + 5),
        'ccpa_score': max(20, privacy_score - 5),
        'violations': [
            'Personal data found on 3+ data broker sites without consent (CCPA §1798.100)',
            'Breach data exposure without timely notification (GDPR Art. 33)',
        ] if breach_count >= 3 else [],
        'recommendations': [
            'Opt out from all data broker listings found immediately.',
            'Change all passwords found in breach databases.',
            'Enable two-factor authentication on all accounts.',
            'File a CCPA deletion request with each identified broker.',
            'Monitor your credit report for identity theft indicators.',
        ],
        'signals': {
            'ccpa_cpra':          breach_count >= 2 or broker_count >= 3,
            'ftc_section5':       broker_count >= 5,
            'cyberstalking':      False,
            'ncii':               False,
            'platform_violations': breach_count >= 4,
        },
    }

    return {
        'scan_id':       query.get('_scan_id', uuid.uuid4().hex),
        'status':        'completed',
        'progress':      100.0,
        'current_stage': 'complete',
        'created_at':    datetime.now(timezone.utc).isoformat(),
        'completed_at':  datetime.now(timezone.utc).isoformat(),
        'risk_score':    risk_score,
        'privacy_score': privacy_score,
        'total_exposures': total_sources,
        'breaches':        breaches,
        'broker_listings': broker_listings,
        'honey_token_hits': [],
        'compliance':    compliance,
        'stats': {
            'people_search':  sum(1 for b in broker_listings if b['category'] == 'People Search'),
            'broker_sites':   sum(1 for b in broker_listings if b['category'] == 'Data Broker'),
            'public_records': random.randint(2, 8),
            'social_profiles': random.randint(3, 12),
            'ad_networks':    sum(1 for b in broker_listings if b['category'] == 'Ad Network'),
            'breach_data':    len(breaches),
        },
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get('/health')
def health():
    return {'status': 'ok', 'mode': 'demo', 'version': '1.0.0-demo'}


# ── Auth (demo — skips real OAuth) ────────────────────────────────────────────

@app.get('/api/v1/auth/github')
async def demo_github_login():
    """In demo mode, skip OAuth and issue a demo JWT directly."""
    token = _make_demo_jwt()
    return RedirectResponse(f'{FRONTEND_ORIGIN}/auth/callback#token={token}', status_code=302)


@app.get('/api/v1/auth/demo')
async def demo_login():
    """Explicit demo login — same as /auth/github in demo mode."""
    token = _make_demo_jwt()
    return RedirectResponse(f'{FRONTEND_ORIGIN}/auth/callback#token={token}', status_code=302)


@app.get('/api/v1/auth/me')
async def demo_me():
    """Return the demo user — no JWT validation needed in demo mode."""
    return _DEMO_USER


# ── Scans ─────────────────────────────────────────────────────────────────────

@app.post('/api/v1/scans', status_code=201)
async def create_scan(body: ScanRequest):
    if not any([body.email, body.phone, body.username, body.full_name]):
        raise HTTPException(400, 'Provide at least one identifier')

    scan_id = uuid.uuid4().hex
    query   = {k: v for k, v in body.model_dump().items() if v and k != 'notify_email'}
    query['_scan_id'] = scan_id

    _scans[scan_id] = {
        'scan_id':       scan_id,
        'status':        'scanning',
        'progress':      0.0,
        'current_stage': 'Checking breach databases…',
        'created_at':    datetime.now(timezone.utc).isoformat(),
        '_query':        query,
    }

    asyncio.create_task(_process_scan(scan_id, query))

    return {
        'scan_id':       scan_id,
        'status':        'scanning',
        'progress':      0.0,
        'current_stage': 'Checking breach databases…',
        'created_at':    _scans[scan_id]['created_at'],
    }


async def _process_scan(scan_id: str, query: dict):
    stages = [
        (15,  'breach_db — checking HIBP'),
        (35,  'breach_db — checking DeHashed'),
        (55,  'broker_scan — people search sites'),
        (75,  'broker_scan — data brokers'),
        (90,  'compliance — scoring risk'),
        (100, 'complete'),
    ]
    for progress, stage in stages:
        await asyncio.sleep(0.8)
        if scan_id in _scans:
            _scans[scan_id]['progress']      = float(progress)
            _scans[scan_id]['current_stage'] = stage

    result = _mock_scan_result(query)
    result['status'] = 'completed'
    _scans[scan_id] = {**_scans[scan_id], **result, 'status': 'completed'}


@app.get('/api/v1/scans')
async def list_scans():
    return [
        {k: v for k, v in s.items() if k != '_query'}
        for s in sorted(_scans.values(), key=lambda x: x['created_at'], reverse=True)
    ]


@app.get('/api/v1/scans/{scan_id}/status')
async def scan_status(scan_id: str):
    scan = _scans.get(scan_id)
    if not scan:
        raise HTTPException(404, 'Scan not found')
    return {k: v for k, v in scan.items() if k in
            ('scan_id', 'status', 'progress', 'current_stage', 'created_at')}


@app.get('/api/v1/scans/{scan_id}')
async def get_scan(scan_id: str):
    scan = _scans.get(scan_id)
    if not scan:
        raise HTTPException(404, 'Scan not found')
    return {k: v for k, v in scan.items() if k != '_query'}


@app.post('/api/v1/scans/{scan_id}/opt-out/all')
async def queue_optouts(scan_id: str):
    scan = _scans.get(scan_id)
    if not scan:
        raise HTTPException(404, 'Scan not found')
    listings = scan.get('broker_listings', [])
    return {
        'queued':  len(listings),
        'message': f'DEMO: {len(listings)} opt-out links ready. In production, automated DSAR requests would be submitted.',
        'note':    'Demo mode — no actual opt-out submissions are made.',
    }


@app.post('/api/v1/scans/{scan_id}/report')
async def generate_report(scan_id: str):
    scan = _scans.get(scan_id)
    if not scan:
        raise HTTPException(404, 'Scan not found')
    now = datetime.now(timezone.utc)
    return {
        'scan_id':            scan_id,
        'generated_at':       now.isoformat(),
        'format':             'json',
        'includes_compliance': True,
        'demo_note':          'In production this generates a PDF/SHA-256 signed report.',
        'report_data':        scan.get('compliance', {}),
    }
