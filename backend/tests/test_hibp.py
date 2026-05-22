"""
Tests for HIBP integration in breach_checker.py.

Covers:
  - missing HIBP_API_KEY  → status: unavailable
  - 404 / no breach       → status: no_match
  - API failure / network → status: failed
  - rate limit (429)      → status: failed
  - successful breaches   → status: completed, correct evidence rows
  - successful pastes     → status: completed, correct evidence rows
  - to_evidence_row()     → field mapping and action labels
  - run_breach_checks()   → returns (records, hibp_status) tuple
"""
import asyncio
from unittest.mock import AsyncMock, MagicMock, patch


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def run(coro):
    return asyncio.get_event_loop().run_until_complete(coro)


def _make_response(status_code: int, json_data=None) -> MagicMock:
    resp = MagicMock()
    resp.status_code = status_code
    if json_data is not None:
        resp.json.return_value = json_data
    return resp


def _mock_client(breach_resp, paste_resp):
    """Context-manager mock whose .get() returns the two responses in order."""
    client = AsyncMock()
    client.get = AsyncMock(side_effect=[breach_resp, paste_resp])
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=client)
    cm.__aexit__ = AsyncMock(return_value=False)
    return cm


SAMPLE_BREACH = {
    'Name': 'LinkedIn',
    'BreachDate': '2012-06-05',
    'PwnCount': 164611595,
    'Description': 'LinkedIn suffered a breach exposing 164M accounts.',
    'DataClasses': ['Email addresses', 'Passwords'],
    'IsVerified': True,
}

SAMPLE_PASTE = {
    'Source': 'Pastebin',
    'Title': 'leaked emails',
    'Date': '2023-01-15T00:00:00',
    'EmailCount': 500,
}


# ---------------------------------------------------------------------------
# check_hibp_with_status — provider status cases
# ---------------------------------------------------------------------------

def test_no_api_key_returns_unavailable():
    with patch('app.services.breach_checker.settings') as s:
        s.HIBP_API_KEY = ''
        from app.services.breach_checker import check_hibp_with_status
        result = run(check_hibp_with_status('test@example.com'))

    assert result['status'] == 'unavailable'
    assert result['records'] == []
    assert result['evidence'] == []
    assert result['breach_count'] == 0
    assert result['paste_count'] == 0


def test_empty_email_returns_unavailable():
    with patch('app.services.breach_checker.settings') as s:
        s.HIBP_API_KEY = 'real-key'
        from app.services.breach_checker import check_hibp_with_status
        result = run(check_hibp_with_status(''))

    assert result['status'] == 'unavailable'


def test_404_no_breach_returns_no_match():
    cm = _mock_client(_make_response(404), _make_response(404))
    with patch('app.services.breach_checker.settings') as s, \
         patch('app.services.breach_checker.httpx.AsyncClient', return_value=cm):
        s.HIBP_API_KEY = 'test-key'
        from app.services.breach_checker import check_hibp_with_status
        result = run(check_hibp_with_status('clean@example.com'))

    assert result['status'] == 'no_match'
    assert result['records'] == []
    assert result['evidence'] == []


def test_breach_rate_limit_returns_failed():
    cm = _mock_client(_make_response(429), _make_response(404))
    with patch('app.services.breach_checker.settings') as s, \
         patch('app.services.breach_checker.httpx.AsyncClient', return_value=cm):
        s.HIBP_API_KEY = 'test-key'
        from app.services.breach_checker import check_hibp_with_status
        result = run(check_hibp_with_status('test@example.com'))

    assert result['status'] == 'failed'
    assert result['records'] == []


def test_network_error_returns_failed():
    import httpx as _httpx
    client = AsyncMock()
    client.get = AsyncMock(side_effect=_httpx.ConnectError('connection refused'))
    cm = MagicMock()
    cm.__aenter__ = AsyncMock(return_value=client)
    cm.__aexit__ = AsyncMock(return_value=False)

    with patch('app.services.breach_checker.settings') as s, \
         patch('app.services.breach_checker.httpx.AsyncClient', return_value=cm):
        s.HIBP_API_KEY = 'test-key'
        from app.services.breach_checker import check_hibp_with_status
        result = run(check_hibp_with_status('test@example.com'))

    assert result['status'] == 'failed'


def test_api_5xx_returns_failed():
    cm = _mock_client(_make_response(503), _make_response(503))
    with patch('app.services.breach_checker.settings') as s, \
         patch('app.services.breach_checker.httpx.AsyncClient', return_value=cm):
        s.HIBP_API_KEY = 'test-key'
        from app.services.breach_checker import check_hibp_with_status
        result = run(check_hibp_with_status('test@example.com'))

    assert result['status'] == 'failed'


# ---------------------------------------------------------------------------
# check_hibp_with_status — successful responses
# ---------------------------------------------------------------------------

def test_successful_breach_response():
    cm = _mock_client(_make_response(200, [SAMPLE_BREACH]), _make_response(404))
    with patch('app.services.breach_checker.settings') as s, \
         patch('app.services.breach_checker.httpx.AsyncClient', return_value=cm):
        s.HIBP_API_KEY = 'test-key'
        from app.services.breach_checker import check_hibp_with_status
        result = run(check_hibp_with_status('victim@example.com'))

    assert result['status'] == 'completed'
    assert result['breach_count'] == 1
    assert result['paste_count'] == 0

    record = result['records'][0]
    assert record['source'] == 'LinkedIn'
    assert record['source_type'] == 'breach_db'
    # 'Passwords' maps to critical in SEVERITY_MAP
    assert record['severity'] == 'critical'
    assert record['breach_date'] == '2012-06-05'
    assert record['verified'] is True
    assert 'Passwords' in record['exposed_fields']

    assert len(result['evidence']) == 1
    ev = result['evidence'][0]
    assert ev['source_name'] == 'LinkedIn'
    assert 'haveibeenpwned.com' in ev['source_url']
    assert ev['risk_level'] == 'critical'
    assert ev['captured_at'] == '2012-06-05'
    assert ev['action_label']


def test_successful_paste_response():
    cm = _mock_client(_make_response(404), _make_response(200, [SAMPLE_PASTE]))
    with patch('app.services.breach_checker.settings') as s, \
         patch('app.services.breach_checker.httpx.AsyncClient', return_value=cm):
        s.HIBP_API_KEY = 'test-key'
        from app.services.breach_checker import check_hibp_with_status
        result = run(check_hibp_with_status('pasted@example.com'))

    assert result['status'] == 'completed'
    assert result['breach_count'] == 0
    assert result['paste_count'] == 1

    record = result['records'][0]
    assert record['source'] == 'Pastebin'
    assert record['source_type'] == 'paste_site'
    assert record['severity'] == 'medium'
    assert record['breach_date'] == '2023-01-15'

    ev = result['evidence'][0]
    assert ev['source_name'] == 'Pastebin'
    assert ev['risk_level'] == 'medium'
    assert ev['action_label']


def test_breach_and_paste_both_found():
    cm = _mock_client(_make_response(200, [SAMPLE_BREACH]), _make_response(200, [SAMPLE_PASTE]))
    with patch('app.services.breach_checker.settings') as s, \
         patch('app.services.breach_checker.httpx.AsyncClient', return_value=cm):
        s.HIBP_API_KEY = 'test-key'
        from app.services.breach_checker import check_hibp_with_status
        result = run(check_hibp_with_status('both@example.com'))

    assert result['status'] == 'completed'
    assert result['breach_count'] == 1
    assert result['paste_count'] == 1
    assert len(result['records']) == 2
    assert len(result['evidence']) == 2


# ---------------------------------------------------------------------------
# to_evidence_row — field mapping
# ---------------------------------------------------------------------------

def test_to_evidence_row_breach_db():
    from app.services.breach_checker import to_evidence_row
    record = {
        'source': 'Adobe',
        'source_type': 'breach_db',
        'breach_date': '2013-10-04',
        'severity': 'critical',
        'exposed_fields': ['Email addresses', 'Passwords', 'Credit card numbers'],
        'description': 'Adobe breach description.',
    }
    ev = to_evidence_row(record)

    assert ev['source_name'] == 'Adobe'
    assert 'Adobe' in ev['source_url']
    assert 'haveibeenpwned.com' in ev['source_url']
    assert ev['risk_level'] == 'critical'
    assert ev['captured_at'] == '2013-10-04'
    assert 'Credit card numbers' in ev['exposed_fields']
    assert ev['detail'] == 'Adobe breach description.'
    assert 'two-factor' in ev['action_label']


def test_to_evidence_row_paste_site():
    from app.services.breach_checker import to_evidence_row
    record = {
        'source': 'Pastebin',
        'source_type': 'paste_site',
        'breach_date': '2023-01-15',
        'severity': 'medium',
        'exposed_fields': ['Email addresses'],
        'description': 'Found in paste.',
    }
    ev = to_evidence_row(record)

    assert ev['source_name'] == 'Pastebin'
    assert 'haveibeenpwned.com' in ev['source_url']
    assert ev['risk_level'] == 'medium'
    assert ev['action_label']


def test_to_evidence_row_severity_to_action_mapping():
    from app.services.breach_checker import to_evidence_row

    cases = [
        ('critical', 'two-factor'),
        ('high', 'password'),
        ('medium', 'monitor'),
        ('low', 'phishing'),
    ]
    for severity, keyword in cases:
        ev = to_evidence_row({
            'source': 'X', 'source_type': 'breach_db',
            'severity': severity, 'exposed_fields': [], 'description': '',
        })
        assert keyword.lower() in ev['action_label'].lower(), \
            f'Expected "{keyword}" in action for severity={severity}: {ev["action_label"]}'


def test_to_evidence_row_missing_breach_date():
    from app.services.breach_checker import to_evidence_row
    ev = to_evidence_row({
        'source': 'SomeDB', 'source_type': 'breach_db',
        'severity': 'medium', 'exposed_fields': [], 'description': '',
    })
    assert ev['captured_at'] is None


# ---------------------------------------------------------------------------
# run_breach_checks — tuple return contract
# ---------------------------------------------------------------------------

def test_run_breach_checks_returns_tuple():
    cm = _mock_client(_make_response(200, [SAMPLE_BREACH]), _make_response(404))
    with patch('app.services.breach_checker.settings') as s, \
         patch('app.services.breach_checker.httpx.AsyncClient', return_value=cm), \
         patch('app.services.breach_checker.bloom_filter_check', return_value=[]):
        s.HIBP_API_KEY = 'test-key'
        from app.services.breach_checker import run_breach_checks
        records, hibp_status = run(run_breach_checks({'email': 'test@example.com'}))

    assert isinstance(records, list)
    assert hibp_status in ('unavailable', 'no_match', 'failed', 'completed')
    assert hibp_status == 'completed'
    assert len(records) == 1


def test_run_breach_checks_no_key_uses_demo():
    with patch('app.services.breach_checker.settings') as s, \
         patch('app.services.breach_checker.bloom_filter_check', return_value=[]):
        s.HIBP_API_KEY = ''
        from app.services.breach_checker import run_breach_checks
        records, hibp_status = run(run_breach_checks({'email': 'demo@example.com'}))

    assert hibp_status == 'unavailable'
    assert len(records) > 0  # demo breaches used as fallback
