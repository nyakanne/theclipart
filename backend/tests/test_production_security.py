from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.v1 import command_actions, scans
from app.main import app
from app.core import rate_limit
from app.core.config import Settings
from app.core.network_safety import validate_public_http_url
from app.core.security import decrypt_json_payload, encrypt_json_payload
from app.schemas.command import CommandActionIn
from app.services import report_service


def _production_settings(**overrides) -> Settings:
    values = {
        'APP_ENV': 'production',
        'SECRET_KEY': 'a-production-secret-that-is-not-a-default',
        'DATABASE_URL': 'postgresql+asyncpg://dataguard:strong-password@postgres:5432/dataguard',
        'SYNC_DATABASE_URL': 'postgresql://dataguard:strong-password@postgres:5432/dataguard',
        'REQUIRE_AUTH': True,
        'SUPABASE_JWKS_URL': 'https://example.supabase.co/auth/v1/.well-known/jwks.json',
        'PUBLIC_APP_URL': 'https://vindica.me',
        'CORS_ORIGINS': ['https://vindica.me'],
        'ALLOWED_HOSTS': ['vindica.me'],
        'KMS_KEY_ID': 'arn:aws:kms:us-east-1:123456789012:key/example',
    }
    values.update(overrides)
    return Settings(_env_file=None, **values)


def test_production_rejects_missing_kms():
    with pytest.raises(RuntimeError, match='KMS_KEY_ID'):
        _production_settings(KMS_KEY_ID='').validate_runtime_safety()


def test_production_rejects_missing_auth_enforcement():
    with pytest.raises(RuntimeError, match='REQUIRE_AUTH'):
        _production_settings(REQUIRE_AUTH=False).validate_runtime_safety()


def test_production_rejects_missing_auth_verifier():
    with pytest.raises(RuntimeError, match='SUPABASE_JWT_SECRET|SUPABASE_JWKS_URL'):
        _production_settings(SUPABASE_JWKS_URL='', SUPABASE_URL='', SUPABASE_JWT_SECRET='').validate_runtime_safety()


def test_production_rejects_default_database_password():
    with pytest.raises(RuntimeError, match='default database password'):
        _production_settings(
            DATABASE_URL='postgresql+asyncpg://dataguard:secret@postgres:5432/dataguard',
        ).validate_runtime_safety()


def test_production_rejects_wildcard_hosts():
    with pytest.raises(RuntimeError, match='Wildcard'):
        _production_settings(ALLOWED_HOSTS=['*']).validate_runtime_safety()


def test_cross_account_scan_access_is_hidden(monkeypatch):
    monkeypatch.setattr(scans.settings, 'REQUIRE_AUTH', True)
    foreign_scan = SimpleNamespace(user_id='user-a')
    with pytest.raises(HTTPException) as exc:
        scans._assert_scan_owner(foreign_scan, 'user-b')
    assert exc.value.status_code == 404


def test_legacy_anonymous_scan_is_hidden_in_production(monkeypatch):
    monkeypatch.setattr(scans.settings, 'REQUIRE_AUTH', True)
    legacy_scan = SimpleNamespace(user_id=None)
    with pytest.raises(HTTPException) as exc:
        scans._assert_scan_owner(legacy_scan, 'user-a')
    assert exc.value.status_code == 404


def test_saved_action_payload_is_encrypted_at_rest():
    encrypted = encrypt_json_payload({'scan_id': 'scan-1', 'note': 'private evidence'})
    assert 'private evidence' not in str(encrypted)
    assert decrypt_json_payload(encrypted) == {'scan_id': 'scan-1', 'note': 'private evidence'}


def test_saved_action_payload_has_a_size_ceiling():
    with pytest.raises(ValueError, match='64 KB'):
        CommandActionIn(feature='proof', title='oversized', payload={'value': 'x' * 70000})


def test_system_action_types_cannot_be_forged_or_edited():
    for feature in ('report-package', 'manual-evidence-capture'):
        with pytest.raises(HTTPException) as exc:
            command_actions._assert_user_managed_feature(feature)
        assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_ssrf_blocks_private_and_nonstandard_targets():
    for target in ('http://127.0.0.1/image.png', 'http://169.254.169.254/latest/meta-data', 'http://8.8.8.8:8080/image.png'):
        with pytest.raises(ValueError):
            await validate_public_http_url(target)
    assert await validate_public_http_url('https://8.8.8.8/image.png') == 'https://8.8.8.8/image.png'


@pytest.mark.asyncio
async def test_distributed_quota_rejects_excess(monkeypatch):
    class FakeRedis:
        def __init__(self):
            self.count = 0

        async def incr(self, _key):
            self.count += 1
            return self.count

        async def expire(self, _key, _seconds):
            return True

    monkeypatch.setattr(rate_limit, '_redis', FakeRedis())
    await rate_limit._consume('proof', 'user', 2, 60)
    await rate_limit._consume('proof', 'user', 2, 60)
    with pytest.raises(HTTPException) as exc:
        await rate_limit._consume('proof', 'user', 2, 60)
    assert exc.value.status_code == 429


def test_request_size_guard_and_unsigned_webhook():
    client = TestClient(app)
    oversized = client.post('/api/v1/command/actions', headers={'content-length': '10485761'}, json={})
    assert oversized.status_code == 413
    assert oversized.headers['x-content-type-options'] == 'nosniff'

    unsigned = client.post('/api/v1/webhooks/mailgun/inbound', data={})
    assert unsigned.status_code == 503


def test_vault_deletion_removes_local_report_artifact(tmp_path, monkeypatch):
    monkeypatch.setattr(report_service.settings, 'REPORT_STORAGE_DIR', str(tmp_path))
    artifact = tmp_path / 'reports' / 'scan-1' / 'report.pdf'
    artifact.parent.mkdir(parents=True)
    artifact.write_bytes(b'private report')
    report_service.delete_report_artifact({
        'storage_kind': 'local',
        'storage_key': 'reports/scan-1/report.pdf',
    })
    assert not artifact.exists()
