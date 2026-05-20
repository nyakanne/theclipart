from functools import lru_cache
import json
import logging
import secrets
from typing import Optional, Any

import boto3
from botocore.exceptions import ClientError
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

log = logging.getLogger(__name__)

WEAK_KEYS = {'dev-secret-change-me', 'secret', 'changeme', 'password', 'insecure'}


def _load_aws_secret(secret_name: str, region: str) -> dict:
    """Pull a JSON secret from AWS Secrets Manager. Returns {} on any failure."""
    try:
        client = boto3.client('secretsmanager', region_name=region)
        response = client.get_secret_value(SecretId=secret_name)
        return json.loads(response['SecretString'])
    except ClientError as e:
        log.warning('SecretsManager fetch failed (%s): %s', secret_name, e)
        return {}
    except Exception as e:
        log.warning('SecretsManager unexpected error: %s', e)
        return {}


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

    APP_ENV: str = 'development'

    # Set via env or pulled from Secrets Manager at startup-validation time
    SECRET_KEY: str = 'dev-secret-change-me'

    CORS_ORIGINS: list[str] = ['http://localhost:3000']

    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            v = v.strip()
            if v.startswith('['):
                return json.loads(v)
            return [o.strip() for o in v.split(',') if o.strip()]
        return v

    DATABASE_URL: str = 'postgresql+asyncpg://dataguard:changeme@postgres:5432/dataguard'
    SYNC_DATABASE_URL: str = 'postgresql://dataguard:changeme@postgres:5432/dataguard'

    REDIS_URL: str = 'redis://redis:6379/0'

    # AWS
    AWS_REGION: str = 'us-east-1'
    AWS_ACCESS_KEY_ID: str = ''
    AWS_SECRET_ACCESS_KEY: str = ''
    AWS_SECRETS_MANAGER_NAME: str = ''   # e.g. "dataguard/production"
    S3_BUCKET: str = 'dataguard-artefacts'
    KMS_KEY_ID: str = ''
    SES_FROM_EMAIL: str = 'noreply@dataguard.example.com'

    HIBP_API_KEY: str = ''

    # Azure Bing Visual Search (free tier: 3,000 calls/month)
    # Create at: portal.azure.com → Bing Search v7 → Keys and Endpoint
    AZURE_BING_KEY: str = ''

    # Azure Computer Vision v3.2 (free tier: 5,000 calls/month)
    # Create at: portal.azure.com → Computer Vision → Keys and Endpoint
    AZURE_CV_KEY: str = ''
    AZURE_CV_ENDPOINT: str = ''  # e.g. https://your-resource.cognitiveservices.azure.com

    HONEY_DOMAIN: str = 'honey.dataguard.example.com'
    MAILGUN_API_KEY: str = ''

    # Google OAuth
    GOOGLE_CLIENT_ID: str = ''
    GOOGLE_CLIENT_SECRET: str = ''
    GOOGLE_REDIRECT_URI: str = ''   # override in prod; auto-detected in dev

    # GitHub OAuth (used by Netlify functions and CLI tools)
    GITHUB_CLIENT_ID: str = ''
    GITHUB_CLIENT_SECRET: str = ''
    GITHUB_REDIRECT_URI: str = ''

    FRONTEND_URL: str = 'http://localhost:3000'

    MAX_CONCURRENT_PLAYWRIGHT: int = 5
    SCAN_TIMEOUT_SECONDS: int = 300
    BROKER_LIST_PATH: str = '/app/data/brokers.json'

    # Opt-out automation — keep False until SES domain is verified and
    # removal email delivery has been tested end-to-end in production.
    ALLOW_REAL_OPT_OUTS: bool = False

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == 'production'

    def validate_secrets(self) -> None:
        """
        Called once at startup.  Pulls from Secrets Manager when running in
        production, then asserts that no placeholder values remain.
        """
        if self.AWS_SECRETS_MANAGER_NAME:
            overrides = _load_aws_secret(self.AWS_SECRETS_MANAGER_NAME, self.AWS_REGION)
            for field, value in overrides.items():
                if hasattr(self, field):
                    object.__setattr__(self, field, value)
            log.info('Loaded %d secret(s) from Secrets Manager', len(overrides))

        errors: list[str] = []

        if self.SECRET_KEY.lower() in WEAK_KEYS or len(self.SECRET_KEY) < 32:
            errors.append(
                'SECRET_KEY is too short or is a placeholder. '
                'Run: python scripts/generate_key.py'
            )

        if self.is_production:
            if not self.KMS_KEY_ID:
                errors.append('KMS_KEY_ID must be set in production.')
            if not self.AWS_ACCESS_KEY_ID and not self.AWS_SECRETS_MANAGER_NAME:
                errors.append('AWS credentials or AWS_SECRETS_MANAGER_NAME must be set in production.')
            if 'changeme' in self.DATABASE_URL or 'secret' in self.DATABASE_URL:
                errors.append('DATABASE_URL contains a placeholder password.')
            if not self.HIBP_API_KEY:
                errors.append('HIBP_API_KEY is missing — breach checks will be skipped.')
            if self.ALLOW_REAL_OPT_OUTS and not self.SES_FROM_EMAIL.endswith(('.com', '.net', '.org', '.io')):
                errors.append(
                    'ALLOW_REAL_OPT_OUTS=true but SES_FROM_EMAIL looks like a placeholder. '
                    'Verify SES domain before enabling opt-out automation.'
                )
            if self.FRONTEND_URL == 'http://localhost:3000':
                errors.append('FRONTEND_URL is still set to localhost in production.')

        if errors:
            msg = '\n'.join(f'  ✗ {e}' for e in errors)
            raise RuntimeError(
                f'Security configuration errors (APP_ENV={self.APP_ENV}):\n{msg}\n'
                'Fix these before starting the server.'
            )


@lru_cache
def get_settings() -> Settings:
    return Settings()
