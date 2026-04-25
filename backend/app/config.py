from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # App
    APP_ENV: str = "development"
    SECRET_KEY: str = "change-me-in-production"
    CORS_ORIGINS: list[str] = ["http://localhost:8501", "http://localhost:3000"]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://brain:secret@localhost:5432/secondbrain"
    SYNC_DATABASE_URL: str = "postgresql://brain:secret@localhost:5432/secondbrain"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI: Claude
    ANTHROPIC_API_KEY: str = ""
    CLAUDE_MODEL: str = "claude-opus-4-5"

    # AI: Embeddings
    EMBED_PROVIDER: str = "openai"  # openai | local
    OPENAI_API_KEY: str = ""
    EMBED_MODEL: str = "text-embedding-ada-002"
    EMBED_DIM: int = 1536
    LOCAL_EMBED_MODEL: str = "all-MiniLM-L6-v2"

    # Storage
    UPLOAD_DIR: str = "/app/data/uploads"

    # Action Safety — never bypass
    REQUIRE_APPROVAL: bool = True
    AUTO_APPROVE_LOW_RISK: bool = False

    # Scheduler
    DAILY_BRIEFING_HOUR: int = 7
    DAILY_BRIEFING_MINUTE: int = 0

    # Voice: LiveKit
    LIVEKIT_URL: str = ""
    LIVEKIT_API_KEY: str = ""
    LIVEKIT_API_SECRET: str = ""

    # Voice: Twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()
