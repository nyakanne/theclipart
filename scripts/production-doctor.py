#!/usr/bin/env python3
"""Validate production deployment settings without printing secrets.

Run this on the server before restarting Docker:
    python3 scripts/production-doctor.py --env-file .env
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


SECRET_NAMES = {
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'BRAVE_API_KEY',
    'BRAVE_SEARCH_API_KEY',
    'BLOB_READ_WRITE_TOKEN',
    'HIBP_API_KEY',
    'IPINFO_TOKEN',
    'KMS_KEY_ID',
    'RESEND_API_KEY',
    'SECRET_KEY',
    'SHODAN_API_KEY',
    'SUPABASE_JWT_SECRET',
    'VIRUSTOTAL_API_KEY',
}


def parse_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw_line in path.read_text().splitlines():
        line = raw_line.strip()
        if not line or line.startswith('#') or '=' not in line:
            continue
        key, value = line.split('=', 1)
        value = value.strip().strip('"').strip("'")
        values[key.strip()] = value
    return values


def parse_bool(value: str | None, default: bool = False) -> bool:
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


def parse_list(value: str | None) -> list[str]:
    if not value:
        return []
    try:
        parsed = json.loads(value)
        if isinstance(parsed, list):
            return [str(item) for item in parsed]
    except json.JSONDecodeError:
        pass
    return [item.strip() for item in value.split(',') if item.strip()]


def masked_status(env: dict[str, str], key: str) -> str:
    value = env.get(key, '')
    if not value:
        return 'missing'
    if key in SECRET_NAMES:
        return f'set ({len(value)} chars)'
    return value


def object_storage_configured(env: dict[str, str]) -> bool:
    backend = env.get('OBJECT_STORAGE_BACKEND', 'local').strip().lower()
    if backend in {'s3', 'r2'}:
        return bool(env.get('S3_BUCKET') or env.get('OBJECT_STORAGE_BUCKET'))
    if backend in {'vercel_blob', 'blob'}:
        return bool(env.get('BLOB_READ_WRITE_TOKEN'))
    if backend == 'local':
        return bool(env.get('REPORT_STORAGE_DIR'))
    return False


def outbound_email_configured(env: dict[str, str]) -> bool:
    provider = env.get('EMAIL_PROVIDER', 'ses').strip().lower()
    if provider == 'ses':
        return bool(env.get('SES_FROM_EMAIL'))
    if provider == 'mailgun':
        return bool(env.get('MAILGUN_API_KEY'))
    if provider == 'resend':
        return bool(env.get('RESEND_API_KEY'))
    return False


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--env-file', default='.env')
    args = parser.parse_args()

    env_path = Path(args.env_file)
    if not env_path.exists():
        print(f'FAIL env file not found: {env_path}', file=sys.stderr)
        return 2

    env = parse_env(env_path)
    errors: list[str] = []
    warnings: list[str] = []

    app_env = env.get('APP_ENV', 'development')
    is_production = app_env == 'production'
    require_auth = parse_bool(env.get('REQUIRE_AUTH'))
    require_kms = parse_bool(env.get('REQUIRE_KMS_IN_PRODUCTION'), True)
    serverless_platform = env.get('SERVERLESS_PLATFORM', '').strip()
    object_backend = env.get('OBJECT_STORAGE_BACKEND', 'local').strip().lower()
    supabase_configured = bool(env.get('SUPABASE_JWT_SECRET') or env.get('SUPABASE_JWKS_URL') or env.get('SUPABASE_URL'))

    if is_production and not require_auth:
        errors.append('REQUIRE_AUTH must be true in production.')
    if is_production and not supabase_configured:
        errors.append('Set SUPABASE_JWT_SECRET, SUPABASE_JWKS_URL, or SUPABASE_URL for vault authentication.')
    if is_production and require_kms and not env.get('KMS_KEY_ID'):
        errors.append('KMS_KEY_ID is required while REQUIRE_KMS_IN_PRODUCTION=true.')
    if is_production and env.get('SECRET_KEY', '') in {'', 'dev-secret-change-me', 'change-me-32-chars-minimum-please'}:
        errors.append('Set a strong SECRET_KEY.')
    if is_production and ':secret@' in env.get('DATABASE_URL', ''):
        errors.append('DATABASE_URL still contains the default database password.')
    if is_production and ':secret@' in env.get('SYNC_DATABASE_URL', ''):
        errors.append('SYNC_DATABASE_URL still contains the default database password.')
    if is_production and env.get('PUBLIC_APP_URL', '').startswith('http://'):
        errors.append('PUBLIC_APP_URL must use HTTPS in production.')
    if is_production and not object_storage_configured(env):
        errors.append('Object storage is required for production report/evidence artifacts.')
    if is_production and serverless_platform and object_backend == 'local':
        errors.append('Serverless production cannot use local report/evidence storage.')
    if is_production and serverless_platform and env.get('REDIS_URL', '').startswith('redis://redis:'):
        errors.append('Serverless production must use managed Redis, not the Docker Compose redis hostname.')
    if '*' in parse_list(env.get('CORS_ORIGINS')):
        errors.append('CORS_ORIGINS cannot contain *.')
    if '*' in parse_list(env.get('ALLOWED_HOSTS')):
        errors.append('ALLOWED_HOSTS cannot contain *.')

    if not env.get('REDIS_URL'):
        errors.append('REDIS_URL is required for rate limits and Celery.')
    if not env.get('DATABASE_URL') or not env.get('SYNC_DATABASE_URL'):
        errors.append('DATABASE_URL and SYNC_DATABASE_URL are required.')

    for key in ('HIBP_API_KEY', 'BRAVE_SEARCH_API_KEY', 'IPINFO_TOKEN'):
        if not env.get(key):
            warnings.append(f'{key} is missing; related OSINT evidence will show unavailable instead of real provider results.')

    if parse_bool(env.get('ALLOW_REAL_OPT_OUTS')) and not env.get('BROKER_PRIVACY_EMAILS'):
        errors.append('BROKER_PRIVACY_EMAILS is required when ALLOW_REAL_OPT_OUTS=true.')
    if not outbound_email_configured(env):
        warnings.append('Outbound email is not fully configured; opt-out delivery and transactional mail may be unavailable.')

    print('Vindica production doctor')
    print(f'env_file={env_path}')
    print(f'APP_ENV={app_env}')
    for key in (
        'PUBLIC_APP_URL',
        'REQUIRE_AUTH',
        'SUPABASE_URL',
        'SUPABASE_JWKS_URL',
        'SUPABASE_JWT_SECRET',
        'KMS_KEY_ID',
        'DATABASE_URL',
        'SYNC_DATABASE_URL',
        'REDIS_URL',
        'SERVERLESS_PLATFORM',
        'QUEUE_BACKEND',
        'OBJECT_STORAGE_BACKEND',
        'OBJECT_STORAGE_BUCKET',
        'S3_BUCKET',
        'BLOB_READ_WRITE_TOKEN',
        'EMAIL_PROVIDER',
        'HIBP_API_KEY',
        'BRAVE_SEARCH_API_KEY',
        'IPINFO_TOKEN',
    ):
        print(f'{key}={masked_status(env, key)}')

    if warnings:
        print('\nWARNINGS')
        for warning in warnings:
            print(f'- {warning}')

    if errors:
        print('\nFAIL')
        for error in errors:
            print(f'- {error}')
        return 1

    print('\nPASS production env gates look runnable.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
