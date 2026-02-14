"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration for ShopAgent."""

    # Required API keys
    anthropic_api_key: str = ""
    brightdata_api_key: str = ""
    browserbase_api_key: str = ""
    browserbase_project_id: str = ""
    perplexity_api_key: str = ""

    # Optional
    elastic_cloud_id: str = ""
    elastic_api_key: str = ""

    # App config
    log_level: str = "INFO"
    agent_timeout: int = 120
    enable_negotiation: bool = True

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
