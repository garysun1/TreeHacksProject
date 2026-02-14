"""Price Intelligence Agent — analyzes pricing, coupons, and deal quality."""

import logging
import random
from datetime import datetime, timezone
from typing import Any

from agents.base import BaseAgent
from models.price import (
    CashbackOption,
    CompetitorPrice,
    Coupon,
    PriceAnalysis,
    PriceHistory,
)
from models.state import SharedState

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


class PriceAgent(BaseAgent):
    """Analyzes pricing, finds deals, and calculates effective price."""

    name = "price"
    system_prompt = SYSTEM_PROMPT

    async def _run(self, state: SharedState) -> dict[str, Any]:
        """Analyze pricing for each candidate."""
        price_analyses: dict[str, PriceAnalysis] = {}

        for candidate in state.candidates:
            # TODO: Replace with real price history/coupon API calls
            current = candidate.price
            lowest = current * random.uniform(0.7, 0.95)
            highest = current * random.uniform(1.05, 1.4)
            average = (lowest + highest + current) / 3

            history = PriceHistory(
                lowest_price=round(lowest, 2),
                highest_price=round(highest, 2),
                average_price=round(average, 2),
                lowest_price_date="2025-11-29",
                price_trend=random.choice(["stable", "falling", "rising"]),
            )

            # Mock competitor prices
            competitors = [
                CompetitorPrice(
                    platform=p,
                    price=round(current * random.uniform(0.9, 1.15), 2),
                    url=f"https://{p}.com/product/{candidate.id}",
                    in_stock=random.choice([True, True, False]),
                )
                for p in ["amazon", "walmart", "bestbuy"]
                if p != candidate.platform
            ]

            # Mock coupons
            coupons: list[Coupon] = []
            if random.random() > 0.5:
                coupons.append(
                    Coupon(
                        code="SAVE10",
                        description="10% off select electronics",
                        discount_percent=10.0,
                        verified=True,
                        source="RetailMeNot",
                    )
                )

            # Mock cashback
            cashback: list[CashbackOption] = []
            if random.random() > 0.4:
                cashback.append(
                    CashbackOption(
                        provider="Rakuten",
                        cashback_percent=random.uniform(1.0, 5.0),
                        url=f"https://rakuten.com/shop/{candidate.platform}",
                    )
                )

            coupon_savings = sum(
                (c.discount_percent or 0) / 100 * current for c in coupons
            )
            cashback_savings = sum(cb.cashback_percent / 100 * current for cb in cashback)
            total_savings = round(coupon_savings + cashback_savings, 2)
            effective = round(current - total_savings, 2)

            deal_score = 50.0
            if current <= average:
                deal_score += 20
            if current <= lowest * 1.1:
                deal_score += 20
            if coupons:
                deal_score += 10
            deal_score = min(deal_score, 100.0)

            price_analyses[candidate.id] = PriceAnalysis(
                candidate_id=candidate.id,
                current_price=current,
                deal_quality_score=round(deal_score, 1),
                price_history=history,
                competitor_prices=competitors,
                available_coupons=coupons,
                cashback_options=cashback,
                price_prediction="Prices likely stable for the next 2 weeks",
                total_savings_potential=total_savings,
                effective_price=effective,
                reasoning=(
                    f"Current price ${current:.2f} vs average ${average:.2f}. "
                    f"{'Good deal!' if deal_score >= 70 else 'Fair price.'} "
                    f"Potential savings: ${total_savings:.2f}."
                ),
            )

        logger.info("Price analysis complete for %d candidates", len(price_analyses))
        return {
            "price_analyses": price_analyses,
            "updated_at": datetime.now(timezone.utc),
        }
