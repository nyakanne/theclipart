from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8')

    APP_ENV: str = 'development'
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
    SES_FROM_EMAIL: str = 'noreply@dataguard.example.com'

    HIBP_API_KEY: str = ''

    HONEY_DOMAIN: str = 'honey.dataguard.example.com'
    MAILGUN_API_KEY: str = ''

    MAX_CONCURRENT_PLAYWRIGHT: int = 5
    SCAN_TIMEOUT_SECONDS: int = 300
    BROKER_LIST_PATH: str = '/app/data/brokers.json'

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == 'production'


@lru_cache
def get_settings() -> Settings:
    return Settings()
