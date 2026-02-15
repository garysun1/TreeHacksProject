"""Price Intelligence Agent — analyzes pricing, coupons, and deal quality."""

import asyncio
import logging
import random
from datetime import datetime, timezone
from typing import Any

from agents.base import BaseAgent
from models.candidates import ProductCandidate
from models.price import (
    CashbackOption,
    CompetitorPrice,
    Coupon,
    PriceAnalysis,
    PriceHistory,
)
from models.state import SharedState
from tools.perplexity import perplexity

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are a price intelligence specialist. For each product candidate, you:

1. Research price history — is the current price a good deal or inflated?
2. Compare prices across retailers for the same product
3. Find working coupon/promo codes
4. Check cashback portal availability (Rakuten, TopCashback, etc.)
5. Predict near-term price movements based on seasonal patterns

Provide a deal quality score (0-100) and calculate the effective price
after all available savings.
"""

# Limit concurrent Sonar calls
MAX_CONCURRENT = 3

# Only analyze the top N candidates
MAX_CANDIDATES_TO_ANALYZE = 10

# URL base per platform for mock competitor links
_MOCK_COMPETITOR_URL_BASE: dict[str, str] = {
    "amazon": "https://www.amazon.com/dp/",
    "ebay": "https://www.ebay.com/itm/",
    "walmart": "https://www.walmart.com/ip/",
    "bestbuy": "https://www.bestbuy.com/site/",
    "facebook_marketplace": "https://www.facebook.com/marketplace/item/",
    "craigslist": "https://craigslist.org/",
}


def _safe_float(val: Any, default: float = 0.0) -> float:
    """Safely convert to float."""
    if val is None:
        return default
    try:
        return float(val)
    except (TypeError, ValueError):
        return default


def _build_competitor_prices(
    raw: list[dict[str, Any]], exclude_platform: str
) -> list[CompetitorPrice]:
    """Convert raw Sonar competitor data to CompetitorPrice models."""
    out: list[CompetitorPrice] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        plat = str(item.get("platform", "")).strip().lower()
        if not plat or plat == exclude_platform:
            continue
        price = _safe_float(item.get("price"))
        if price <= 0:
            continue
        url = item.get("url") or f"https://{plat}.com"
        out.append(
            CompetitorPrice(
                platform=plat,
                price=round(price, 2),
                url=str(url),
                in_stock=bool(item.get("in_stock", True)),
            )
        )
    return out


def _build_price_history(raw: dict[str, Any], current_price: float) -> PriceHistory:
    """Convert raw Sonar price history to PriceHistory model."""
    lowest = _safe_float(raw.get("lowest_price"), current_price * 0.85)
    highest = _safe_float(raw.get("highest_price"), current_price * 1.15)
    average = _safe_float(raw.get("average_price"), current_price)
    trend = raw.get("price_trend", "stable")
    if trend not in ("rising", "falling", "stable", "volatile"):
        trend = "stable"
    return PriceHistory(
        lowest_price=round(lowest, 2),
        highest_price=round(highest, 2),
        average_price=round(average, 2),
        lowest_price_date=raw.get("lowest_price_date"),
        price_trend=trend,
    )


def _build_coupons(raw: list[dict[str, Any]]) -> list[Coupon]:
    """Convert raw Sonar coupon data to Coupon models."""
    out: list[Coupon] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        code = str(item.get("code", "")).strip()
        if not code:
            continue
        out.append(
            Coupon(
                code=code,
                description=item.get("description", ""),
                discount_amount=_safe_float(item.get("discount_amount")) or None,
                discount_percent=_safe_float(item.get("discount_percent")) or None,
                verified=bool(item.get("verified", False)),
                source=item.get("source", "Perplexity Sonar"),
            )
        )
    return out


def _build_cashback(raw: list[dict[str, Any]], platform: str) -> list[CashbackOption]:
    """Convert raw Sonar cashback data to CashbackOption models."""
    out: list[CashbackOption] = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        pct = _safe_float(item.get("cashback_percent"))
        if pct <= 0:
            continue
        cb_url = item.get("url") or f"https://www.rakuten.com/shop/{platform}"
        out.append(
            CashbackOption(
                provider=item.get("provider", "Unknown"),
                cashback_percent=round(pct, 2),
                url=str(cb_url),
            )
        )
    return out


def _calculate_deal_score(
    current_price: float,
    history: PriceHistory,
    competitors: list[CompetitorPrice],
    coupons: list[Coupon],
    cashback: list[CashbackOption],
) -> float:
    """Calculate a 0-100 deal quality score from the gathered data."""
    score = 50.0

    # Price vs. history
    if history.average_price > 0 and current_price <= history.average_price:
        score += 10
    if history.lowest_price > 0 and current_price <= history.lowest_price * 1.05:
        score += 15  # near historical low
    elif history.lowest_price > 0 and current_price <= history.lowest_price * 1.15:
        score += 8
    if history.price_trend == "falling":
        score += 5
    elif history.price_trend == "rising":
        score -= 5

    # Competitive positioning
    if competitors:
        avg_comp = sum(c.price for c in competitors) / len(competitors)
        if current_price <= avg_comp:
            score += 10
        elif current_price > avg_comp * 1.1:
            score -= 10

    # Savings available
    if coupons:
        score += 5
    if cashback:
        score += 5

    return max(0.0, min(100.0, round(score, 1)))


def _mock_price_analysis(candidate: ProductCandidate) -> PriceAnalysis:
    """Build a plausible mock PriceAnalysis so the pipeline never breaks."""
    current = candidate.price
    lowest = round(current * random.uniform(0.70, 0.95), 2)
    highest = round(current * random.uniform(1.05, 1.40), 2)
    average = round((lowest + highest + current) / 3, 2)

    history = PriceHistory(
        lowest_price=lowest,
        highest_price=highest,
        average_price=average,
        lowest_price_date="2025-11-29",
        price_trend=random.choice(["stable", "falling", "rising"]),
    )
    def _competitor_url(plat: str) -> str:
        base = _MOCK_COMPETITOR_URL_BASE.get(plat) or f"https://{plat}.com/product/"
        return f"{base}{candidate.id}"

    competitors = [
        CompetitorPrice(
            platform=p,
            price=round(current * random.uniform(0.90, 1.15), 2),
            url=_competitor_url(p),
            in_stock=random.choice([True, True, False]),
        )
        for p in ["amazon", "ebay", "walmart", "bestbuy", "facebook_marketplace", "craigslist"]
        if p != candidate.platform
    ]
    return PriceAnalysis(
        candidate_id=candidate.id,
        current_price=current,
        deal_quality_score=50.0,
        price_history=history,
        competitor_prices=competitors,
        available_coupons=[],
        cashback_options=[],
        price_prediction="Mock: Prices likely stable for the next 2 weeks.",
        total_savings_potential=0.0,
        effective_price=current,
        reasoning=f"Mock price analysis for {candidate.name[:40]} at ${current:.2f}.",
    )


class PriceAgent(BaseAgent):
    """Analyzes pricing, finds deals, and calculates effective price."""

    name = "price"
    system_prompt = SYSTEM_PROMPT

    async def _run(self, state: SharedState) -> dict[str, Any]:
        """Analyze pricing for each candidate via Perplexity Sonar."""
        candidates = state.candidates[:MAX_CANDIDATES_TO_ANALYZE]
        if not candidates:
            logger.warning("Price agent: no candidates to analyze")
            return {"price_analyses": {}, "updated_at": datetime.now(timezone.utc)}

        logger.info("Price agent: analyzing %d candidates", len(candidates))

        sem = asyncio.Semaphore(MAX_CONCURRENT)

        async def analyze_one(c: ProductCandidate, idx: int) -> tuple[str, PriceAnalysis]:
            # Stagger requests to avoid Perplexity 429s (trust agent runs in parallel)
            await asyncio.sleep(idx * 0.3)
            async with sem:
                return await self._analyze_candidate(c, state)

        try:
            results = await asyncio.gather(
                *[analyze_one(c, i) for i, c in enumerate(candidates)],
                return_exceptions=True,
            )
        except Exception as e:
            logger.exception("Price agent gather failed: %s", e)
            results = []

        price_analyses: dict[str, PriceAnalysis] = {}
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.warning(
                    "Price analysis failed for %s: %s", candidates[i].id, result
                )
                price_analyses[candidates[i].id] = _mock_price_analysis(candidates[i])
            else:
                cid, analysis = result
                price_analyses[cid] = analysis

        logger.info("Price analysis complete for %d candidates", len(price_analyses))
        return {
            "price_analyses": price_analyses,
            "updated_at": datetime.now(timezone.utc),
        }

    async def _analyze_candidate(
        self, candidate: ProductCandidate, state: SharedState
    ) -> tuple[str, PriceAnalysis]:
        """Run full price intelligence for a single candidate."""
        try:
            category = state.requirements.category if state.requirements else ""
            result = await perplexity.analyze_price(
                product_name=candidate.name,
                brand=candidate.brand,
                current_price=candidate.price,
                platform=candidate.platform,
                category=category,
            )

            # Build structured models from Sonar response
            competitors = _build_competitor_prices(
                result.get("competitor_prices", []), candidate.platform
            )
            history = _build_price_history(
                result.get("price_history", {}), candidate.price
            )
            coupons = _build_coupons(result.get("coupons", []))
            cashback = _build_cashback(
                result.get("cashback", []), candidate.platform
            )
            prediction = result.get("price_prediction", "")
            sources = result.get("sources", [])

            # Calculate savings
            coupon_savings = sum(
                (c.discount_percent or 0) / 100 * candidate.price
                + (c.discount_amount or 0)
                for c in coupons
            )
            cashback_savings = sum(
                cb.cashback_percent / 100 * candidate.price for cb in cashback
            )
            total_savings = round(coupon_savings + cashback_savings, 2)
            effective = round(candidate.price - total_savings, 2)

            deal_score = _calculate_deal_score(
                candidate.price, history, competitors, coupons, cashback
            )

            # Build reasoning
            comp_str = ""
            if competitors:
                prices_str = ", ".join(
                    f"{c.platform} ${c.price:.2f}" for c in competitors[:3]
                )
                comp_str = f" Competitors: {prices_str}."
            reasoning = (
                f"${candidate.price:.2f} vs avg ${history.average_price:.2f} "
                f"(low ${history.lowest_price:.2f}, high ${history.highest_price:.2f}). "
                f"Trend: {history.price_trend}.{comp_str} "
                f"{'Savings available!' if total_savings > 0 else 'No active promos found.'} "
                f"{prediction}"
            )

            analysis = PriceAnalysis(
                candidate_id=candidate.id,
                current_price=candidate.price,
                deal_quality_score=deal_score,
                price_history=history,
                competitor_prices=competitors,
                available_coupons=coupons,
                cashback_options=cashback,
                price_prediction=prediction,
                total_savings_potential=total_savings,
                effective_price=effective,
                reasoning=reasoning,
            )
            return candidate.id, analysis

        except Exception as e:
            logger.warning(
                "Price analysis failed for '%s', using mock: %s",
                candidate.name[:50],
                e,
            )
            return candidate.id, _mock_price_analysis(candidate)
