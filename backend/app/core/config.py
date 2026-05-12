from functools import lru_cache
import json
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')

    APP_ENV: str = 'development'
    DEMO_MODE: bool = False
    SECRET_KEY: str = 'dev-secret-change-me'
    CORS_ORIGINS: list[str] = ['http://localhost:3000']

    DATABASE_URL: str = 'postgresql+asyncpg://dataguard:secret@postgres:5432/dataguard'
    SYNC_DATABASE_URL: str = 'postgresql://dataguard:secret@postgres:5432/dataguard'

    REDIS_URL: str = 'redis://redis:6379/0'

    AWS_REGION: str = 'us-east-1'
    AWS_ACCESS_KEY_ID: str = ''
    AWS_SECRET_ACCESS_KEY: str = ''
    S3_BUCKET: str = 'dataguard-artefacts'
    KMS_KEY_ID: str = ''
    SES_FROM_EMAIL: str = 'noreply@vindica.me'
    PUBLIC_APP_URL: str = 'http://localhost:3000'
    ALLOW_REAL_OPT_OUTS: bool = False
    REQUIRE_AUTH: bool = False
    SUPABASE_JWT_SECRET: str = ''
    SUPABASE_JWKS_URL: str = ''
    SUPABASE_JWT_AUDIENCE: str = 'authenticated'

    HIBP_API_KEY: str = ''

    HONEY_DOMAIN: str = 'honey.vindica.me'
    MAILGUN_API_KEY: str = ''

    MAX_CONCURRENT_PLAYWRIGHT: int = 5
    SCAN_TIMEOUT_SECONDS: int = 300
    BROKER_LIST_PATH: str = '/app/data/brokers.json'

    @field_validator('CORS_ORIGINS', mode='before')
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            try:
                parsed = json.loads(value)
                if isinstance(parsed, list):
                    return parsed
            except json.JSONDecodeError:
                return [origin.strip() for origin in value.split(',') if origin.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == 'production'

    def validate_runtime_safety(self) -> None:
        if self.is_production and self.DEMO_MODE:
            raise RuntimeError('DEMO_MODE cannot be enabled in production.')
        if self.is_production and self.SECRET_KEY in {'dev-secret-change-me', 'change-me-32-chars-minimum-please'}:
            raise RuntimeError('Set a strong SECRET_KEY before running in production.')
        if self.is_production and self.REQUIRE_AUTH and not (self.SUPABASE_JWT_SECRET or self.SUPABASE_JWKS_URL):
            raise RuntimeError('Set SUPABASE_JWT_SECRET or SUPABASE_JWKS_URL when REQUIRE_AUTH=true.')
        if self.ALLOW_REAL_OPT_OUTS and not self.SES_FROM_EMAIL:
            raise RuntimeError('SES_FROM_EMAIL is required when ALLOW_REAL_OPT_OUTS=true.')


@lru_cache
def get_settings() -> Settings:
    return Settings()
