"""Elasticsearch wrapper for product indexing and price history (optional)."""

import logging
from typing import Any

from config import settings

logger = logging.getLogger(__name__)


class ElasticClient:
    """Async client for Elasticsearch. Optional — gracefully no-ops if not configured."""

    def __init__(self) -> None:
        self.cloud_id = settings.elastic_cloud_id
        self.api_key = settings.elastic_api_key
        self.enabled = bool(self.cloud_id and self.api_key)
        if not self.enabled:
            logger.info("Elasticsearch not configured — skipping")

    async def index_candidates(self, candidates: list[Any]) -> None:
        """Index product candidates for later similarity search."""
        if not self.enabled:
            return
        # TODO: Replace with real API call
        logger.info("Elastic: indexing %d candidates", len(candidates))

    async def search_similar(self, query: str) -> list[dict[str, Any]]:
        """Find similar previously-seen products."""
        if not self.enabled:
            return []
        # TODO: Replace with real API call
        logger.info("Elastic: searching similar to '%s'", query)
        return []

    async def store_price_history(self, candidate_id: str, price: float) -> None:
        """Track price over time for a candidate."""
        if not self.enabled:
            return
        # TODO: Replace with real API call
        logger.info("Elastic: storing price %.2f for %s", price, candidate_id)


elastic = ElasticClient()
