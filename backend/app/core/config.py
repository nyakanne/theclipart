from functools import lru_cache
import json
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file='.env', env_file_encoding='utf-8', extra='ignore')

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
    REPORT_STORAGE_DIR: str = '/tmp/vindica-reports'
    SES_FROM_EMAIL: str = 'noreply@vindica.me'
    PUBLIC_APP_URL: str = 'http://localhost:3000'
    ALLOW_REAL_OPT_OUTS: bool = False
    REQUIRE_AUTH: bool = False
    RUN_SCANS_INLINE: bool = False
    SUPABASE_JWT_SECRET: str = ''
    SUPABASE_JWKS_URL: str = ''
    SUPABASE_JWT_AUDIENCE: str = 'authenticated'

    HIBP_API_KEY: str = ''
    IPINFO_TOKEN: str = ''
    IPINFO_BASE_URL: str = 'https://api.ipinfo.io/lite'
    AZURE_COMPUTER_VISION_ENDPOINT: str = ''
    AZURE_COMPUTER_VISION_KEY: str = ''
    AZURE_CV_ENDPOINT: str = ''
    AZURE_CV_KEY: str = ''
    AZURE_COMPUTER_VISION_API_VERSION: str = 'v3.2'
    AZURE_COMPUTER_VISION_VISUAL_FEATURES: str = 'Description,Tags,Categories,Objects'
    AZURE_COMPUTER_VISION_TIMEOUT_SECONDS: float = 20.0
    AZURE_COMPUTER_VISION_MAX_UPLOAD_BYTES: int = 5242880
    GOOGLE_CLOUD_VISION_API_KEY: str = ''
    GOOGLE_CLOUD_VISION_BASE_URL: str = 'https://vision.googleapis.com/v1/images:annotate'
    GOOGLE_CLOUD_VISION_FEATURES: str = 'LABEL_DETECTION,OBJECT_LOCALIZATION,SAFE_SEARCH_DETECTION,WEB_DETECTION'
    GOOGLE_CLOUD_VISION_MAX_RESULTS: int = 10
    GOOGLE_CLOUD_VISION_TIMEOUT_SECONDS: float = 20.0
    HUGGINGFACE_API_KEY: str = ''
    HF_TOKEN: str = ''
    HUGGINGFACE_BASE_URL: str = 'https://api-inference.huggingface.co/models'
    HUGGINGFACE_IMAGE_CAPTION_MODEL: str = 'Salesforce/blip-image-captioning-large'
    HUGGINGFACE_OBJECT_DETECTION_MODEL: str = 'facebook/detr-resnet-50'
    HUGGINGFACE_IMAGE_CLASSIFICATION_MODEL: str = 'google/vit-base-patch16-224'
    HUGGINGFACE_NSFW_MODEL: str = 'Falconsai/nsfw_image_detection'
    HUGGINGFACE_TIMEOUT_SECONDS: float = 25.0
    HUGGINGFACE_MAX_LABELS: int = 10
    BRAVE_SEARCH_API_KEY: str = ''
    BRAVE_API_KEY: str = ''
    BRAVE_SEARCH_BASE_URL: str = 'https://api.search.brave.com/res/v1/web/search'
    BRAVE_SEARCH_COUNTRY: str = 'US'
    BRAVE_SEARCH_SEARCH_LANG: str = 'en'
    BRAVE_SEARCH_SAFESEARCH: str = 'moderate'
    BRAVE_SEARCH_TIMEOUT_SECONDS: float = 12.0
    BRAVE_SEARCH_MAX_RESULTS: int = 5
    BRAVE_SEARCH_MAX_BROKER_QUERIES: int = 3
    VIRUSTOTAL_API_KEY: str = ''
    SHODAN_API_KEY: str = ''

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
        if self.is_production and not self.REQUIRE_AUTH:
            raise RuntimeError('REQUIRE_AUTH must be enabled in production.')
        if self.is_production and self.REQUIRE_AUTH and not (self.SUPABASE_JWT_SECRET or self.SUPABASE_JWKS_URL):
            raise RuntimeError('Set SUPABASE_JWT_SECRET or SUPABASE_JWKS_URL when REQUIRE_AUTH=true.')
        if self.ALLOW_REAL_OPT_OUTS and not self.SES_FROM_EMAIL:
            raise RuntimeError('SES_FROM_EMAIL is required when ALLOW_REAL_OPT_OUTS=true.')

    @property
    def azure_cv_endpoint(self) -> str:
        return self.AZURE_COMPUTER_VISION_ENDPOINT or self.AZURE_CV_ENDPOINT

    @property
    def azure_cv_key(self) -> str:
        return self.AZURE_COMPUTER_VISION_KEY or self.AZURE_CV_KEY

    @property
    def huggingface_token(self) -> str:
        return self.HUGGINGFACE_API_KEY or self.HF_TOKEN

    @property
    def brave_search_key(self) -> str:
        return self.BRAVE_SEARCH_API_KEY or self.BRAVE_API_KEY


@lru_cache
def get_settings() -> Settings:
    return Settings()
