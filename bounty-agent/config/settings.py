from pathlib import Path
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    anthropic_api_key: str
    h1_username: str = ""
    h1_api_token: str = ""
    shannon_home: Path = Path.home() / "shannon"
    git_repo_path: Path = Path(__file__).parent.parent.parent
    git_remote: str = "origin"
    max_concurrent_hunts: int = 1
    hunt_cooldown_hours: int = 6
    max_hunt_cost_usd: float = 30.0
    min_bounty_usd: float = 100.0
    dry_run: bool = False

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
