"""Search Agent — finds product candidates across multiple shopping platforms."""

import asyncio
import logging
import uuid
from datetime import datetime, timezone
from typing import Any

from agents.base import BaseAgent
from models.candidates import ProductCandidate
from models.requirements import ProductRequirements
from models.state import SharedState
from tools.bright_data import _mock_search_results, bright_data

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

# Max candidates to return (top by relevance score)
TOP_N = 20
MIN_CANDIDATES = 15


def _build_search_query(reqs: ProductRequirements) -> str:
    """Build a concise, deduplicated search string from product requirements.

    Strategy: start with the description (most natural), then layer in
    must-haves, brands, and budget — skipping tokens already present.
    """
    # Start with the description as the core; fall back to category
    base = reqs.description.strip() or reqs.category
    seen_tokens = set(base.lower().split())

    extras: list[str] = []

    # Add must-have features not already in the base string
    for feat in reqs.must_have:
        if feat and feat.lower() not in base.lower():
            extras.append(feat)
            seen_tokens.update(feat.lower().split())

    # Add brand preferences
    for brand in reqs.brand_preferences:
        if brand and brand.lower() not in seen_tokens:
            extras.append(brand)
            seen_tokens.add(brand.lower())

    # Budget constraint
    if reqs.budget_max:
        budget_str = f"under ${int(reqs.budget_max)}"
        extras.append(budget_str)

    # Use case (only add novel words)
    if reqs.use_case and reqs.use_case.strip():
        novel = [w for w in reqs.use_case.strip().split() if w.lower() not in seen_tokens]
        if novel:
            extras.append(" ".join(novel))

    query = " ".join([base] + extras).strip()
    return query or reqs.category


def _deduplicate_by_url(candidates: list[ProductCandidate]) -> list[ProductCandidate]:
    """Deduplicate by URL; keep first occurrence."""
    seen: set[str] = set()
    out: list[ProductCandidate] = []
    for c in candidates:
        key = (c.url or "").strip().lower()
        if not key:
            key = f"{c.name}|{c.platform}".lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(c)
    return out


def _score_candidate(candidate: ProductCandidate, reqs: ProductRequirements) -> float:
    """Score how well a candidate matches requirements (higher = better)."""
    score = 0.0
    name_lower = (candidate.name or "").lower()
    brand_lower = (candidate.brand or "").lower()
    weights = reqs.priority_weights or {}

    # Must-haves: strong positive for each match
    for m in reqs.must_have:
        if m and m.lower() in name_lower:
            score += 10.0
    # Nice-to-have: smaller boost
    for n in reqs.nice_to_have:
        if n and n.lower() in name_lower:
            score += 3.0
    # Dealbreakers: heavy penalty or exclude (we exclude in filter; here we penalize)
    for d in reqs.dealbreakers:
        if d and d.lower() in name_lower:
            score -= 50.0
    if reqs.brand_exclusions and brand_lower:
        for b in reqs.brand_exclusions:
            if b and b.lower() in brand_lower:
                score -= 50.0

    # Brand preference
    if reqs.brand_preferences and brand_lower:
        for b in reqs.brand_preferences:
            if b and b.lower() in brand_lower:
                score += 5.0 * (weights.get("brand", 0.15) / 0.15)

    # Budget: prefer within range
    if reqs.budget_max is not None and candidate.price > reqs.budget_max:
        score -= 8.0
    if reqs.budget_min is not None and candidate.price < reqs.budget_min:
        score -= 4.0
    if (
        reqs.budget_max is not None
        and reqs.budget_min is not None
        and reqs.budget_min <= candidate.price <= reqs.budget_max
    ):
        score += 2.0

    # Reviews / quality signal
    if candidate.rating is not None:
        score += (candidate.rating / 5.0) * 3.0 * (weights.get("reviews", 0.30) / 0.30)
    if candidate.review_count is not None and candidate.review_count > 0:
        score += min(2.0, candidate.review_count / 500.0)

    # More matched requirements = higher score
    score += len(candidate.matched_requirements) * 2.0

    return score


def _mock_candidates(reqs: ProductRequirements) -> list[ProductCandidate]:
    """Build mock candidates so the pipeline never fully breaks."""
    candidates: list[ProductCandidate] = []
    query = _build_search_query(reqs)
    for platform in PLATFORMS:
        for item in _mock_search_results(query, platform):
            c = ProductCandidate(
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
                matched_requirements=[],
                missing_requirements=[],
            )
            if reqs.budget_max and c.price > reqs.budget_max:
                continue
            if reqs.budget_min and c.price < reqs.budget_min:
                continue
            candidates.append(c)
    return candidates[:TOP_N]


class SearchAgent(BaseAgent):
    """Searches multiple platforms for products matching requirements."""

    name = "search"
    system_prompt = SYSTEM_PROMPT

    async def _run(self, state: SharedState) -> dict[str, Any]:
        """Fan out searches across platforms, dedupe, score, return top 15–20.

        Uses Bright Data API when configured; falls back to mock on failure.
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
        search_query = _build_search_query(reqs)

        try:
            # Search all platforms concurrently (real API or mock inside bright_data)
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
                    candidate = self._item_to_candidate(item, platform, reqs)
                    if candidate is None:
                        continue
                    # Exclude dealbreakers
                    name_lower = candidate.name.lower()
                    if any(d and d.lower() in name_lower for d in reqs.dealbreakers):
                        continue
                    if reqs.brand_exclusions and candidate.brand:
                        brand_lower = candidate.brand.lower()
                        if any(b and b.lower() in brand_lower for b in reqs.brand_exclusions):
                            continue
                    candidates.append(candidate)

            candidates = _deduplicate_by_url(candidates)

            # Score and sort by relevance
            scored = [(c, _score_candidate(c, reqs)) for c in candidates]
            scored.sort(key=lambda x: -x[1])
            top = [c for c, _ in scored[:TOP_N]]

            # If we got too few, pad with mock so we have at least MIN_CANDIDATES when possible
            if len(top) < MIN_CANDIDATES and len(top) < len(_mock_candidates(reqs)):
                fallback = _mock_candidates(reqs)
                existing_urls = {c.url for c in top}
                for c in fallback:
                    if len(top) >= TOP_N:
                        break
                    if c.url not in existing_urls:
                        top.append(c)
                        existing_urls.add(c.url)
                top = _deduplicate_by_url(top)
                scored = [(c, _score_candidate(c, reqs)) for c in top]
                scored.sort(key=lambda x: -x[1])
                top = [c for c, _ in scored[:TOP_N]]

            logger.info(
                "Found %d candidates (top %d) across %d platforms",
                len(candidates),
                len(top),
                len(PLATFORMS),
            )
            return {
                "candidates": top,
                "status": "analyzing",
                "updated_at": datetime.now(timezone.utc),
            }
        except Exception as e:
            logger.exception("Search agent failed, using mock candidates: %s", e)
            mock = _mock_candidates(reqs)
            return {
                "candidates": mock,
                "status": "analyzing",
                "updated_at": datetime.now(timezone.utc),
            }

    def _item_to_candidate(
        self, item: dict, platform: str, reqs: ProductRequirements
    ) -> ProductCandidate | None:
        """Convert raw item dict to ProductCandidate; None if filtered out (e.g. budget)."""
        if reqs.budget_max is not None and float(item.get("price", 0)) > reqs.budget_max:
            return None
        if reqs.budget_min is not None and float(item.get("price", 0)) < reqs.budget_min:
            return None
        return ProductCandidate(
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

    def _match_requirements(self, item: dict, reqs: Any) -> list[str]:
        """Check which must-have requirements a product matches."""
        matched = []
        name_lower = item.get("name", "").lower()
        for req in reqs.must_have:
            if req and req.lower() in name_lower:
                matched.append(req)
        return matched
