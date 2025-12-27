from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    app_name: str = "Grok Trading Bot"
    app_env: str = "development"
    log_level: str = "INFO"

    # IBKR
    ibkr_host: str = "127.0.0.1"
    ibkr_port: int = 4002
    ibkr_client_id: int = 1
    ibkr_account: str = ""

    # Grok API (xAI)
    xai_api_key: str = ""
    xai_base_url: str = "https://api.x.ai/v1"
    xai_model: str = "grok-4-1-fast-reasoning"

    # Grok Live Search
    grok_live_search_enabled: bool = True
    grok_search_max_results: int = 10

    # Trading
    trading_interval_minutes: int = 30
    reflection_trades_threshold: int = 5
    max_position_pct: float = 0.95
    stop_loss_pct: float = 0.20

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000

    # Frontend
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = "../.env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
