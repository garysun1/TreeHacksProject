"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration for ShopAgent."""

    # Required API keys
    anthropic_api_key: str = ""
    brightdata_api_key: str = ""
    # Optional Bright Data: zone for SERP/Request API; dataset IDs for Web Scraper API
    brightdata_zone: str = ""
    brightdata_amazon_search_dataset_id: str = "gd_lwdb4vjm1ehb499uxs"  # Amazon keyword search
    brightdata_amazon_product_dataset_id: str = "gd_l7q7dkf244hwjntr0"  # Amazon product page
    brightdata_amazon_reviews_dataset_id: str = "gd_le8e811kzy4ggddlq"  # Amazon reviews
    browserbase_api_key: str = ""
    browserbase_project_id: str = ""
    perplexity_api_key: str = ""
    openai_api_key: str = ""  # OpenAI GPT-4o for negotiation agent

    # Optional
    elastic_cloud_id: str = ""
    elastic_api_key: str = ""

    # App config
    log_level: str = "INFO"
    agent_timeout: int = 120
    enable_negotiation: bool = True

    model_config = {
        "env_file": (".env", "../.env"),  # check shopagent/.env first, then repo root
        "env_file_encoding": "utf-8",
    }


settings = Settings()
