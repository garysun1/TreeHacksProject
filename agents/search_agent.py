"""Search Agent — finds product candidates across multiple shopping platforms."""

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from agents.base import BaseAgent
from models.candidates import ProductCandidate
from models.state import SharedState
from tools.bright_data import bright_data

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are a product search specialist. Given structured product requirements,
you search across multiple shopping platforms (Amazon, Walmart, Best Buy) to
find the best candidate products.

For each candidate, extract: name, brand, price, URL, seller info, ratings,
review snippets, specifications, availability, and shipping info.

Match candidates against the user's requirements and note which must-have
features each product fulfills or misses.
"""

PLATFORMS = ["amazon", "walmart", "bestbuy"]


class SearchAgent(BaseAgent):
    """Searches multiple platforms for products matching requirements."""

    name = "search"
    system_prompt = SYSTEM_PROMPT

    async def _run(self, state: SharedState) -> dict[str, Any]:
        """Fan out searches across platforms and aggregate results.

        Uses Bright Data API to search each platform concurrently.
        """
        if not state.requirements:
            return {
                "status": "error",
                "errors": [
                    {
                        "agent": self.name,
                        "error_type": "MissingRequirements",
                        "message": "No product requirements available",
                    }
                ],
            }

        reqs = state.requirements
        search_query = f"{reqs.category} {reqs.description}"
        if reqs.budget_max:
            search_query += f" under ${int(reqs.budget_max)}"

        # Search all platforms concurrently
        # TODO: Replace with real API calls
        results = await asyncio.gather(
            *[bright_data.search_products(search_query, p) for p in PLATFORMS],
            return_exceptions=True,
        )

        candidates: list[ProductCandidate] = []
        for platform, result in zip(PLATFORMS, results):
            if isinstance(result, Exception):
                logger.warning("Search failed on %s: %s", platform, result)
                continue
            for item in result:
                candidate = ProductCandidate(
                    id=str(uuid.uuid4())[:8],
                    name=item.get("name", "Unknown"),
                    brand=item.get("brand", "Unknown"),
                    price=float(item.get("price", 0)),
                    url=item.get("url", ""),
                    platform=platform,
                    seller_name=item.get("seller", platform.title()),
                    image_urls=[item["image"]] if item.get("image") else [],
                    rating=item.get("rating"),
                    review_count=item.get("review_count"),
                    review_snippets=[],
                    specifications=item.get("specifications", {}),
                    availability=item.get("availability", "in_stock"),
                    matched_requirements=self._match_requirements(item, reqs),
                    missing_requirements=[],
                )
                # Filter by budget
                if reqs.budget_max and candidate.price > reqs.budget_max:
                    continue
                if reqs.budget_min and candidate.price < reqs.budget_min:
                    continue
                candidates.append(candidate)

        logger.info("Found %d candidates across %d platforms", len(candidates), len(PLATFORMS))
        return {
            "candidates": candidates,
            "status": "analyzing",
            "updated_at": datetime.now(timezone.utc),
        }

    def _match_requirements(self, item: dict, reqs: Any) -> list[str]:
        """Check which must-have requirements a product matches."""
        matched = []
        name_lower = item.get("name", "").lower()
        for req in reqs.must_have:
            if req.lower() in name_lower:
                matched.append(req)
        return matched
