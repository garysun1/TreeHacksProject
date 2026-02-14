"""Negotiation Agent — attempts to get better deals for top candidates."""

import logging
from datetime import datetime, timezone
from typing import Any

from agents.base import BaseAgent
from models.negotiation import NegotiationResult
from models.state import SharedState

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are a negotiation specialist. For each top-ranked product candidate, you:

1. Determine the best negotiation strategy based on the platform:
   - Marketplaces (eBay, FB Marketplace): Draft negotiation messages
   - Traditional retailers: Check price-match policies, student discounts
   - Online retailers: Look for chat-based negotiation opportunities

2. Execute the negotiation strategy (text-based by default)

3. Report results including any price reductions achieved and
   concrete next steps for the user.
"""

# Platform-specific negotiation strategies
PLATFORM_STRATEGIES: dict[str, str] = {
    "amazon": "price_match",
    "walmart": "price_match",
    "bestbuy": "price_match",
    "ebay": "direct_negotiation",
    "facebook": "direct_negotiation",
    "craigslist": "direct_negotiation",
}


class NegotiationAgent(BaseAgent):
    """Attempts to negotiate better deals on top candidates."""

    name = "negotiation"
    system_prompt = SYSTEM_PROMPT

    async def _run(self, state: SharedState) -> dict[str, Any]:
        """Run negotiation strategies on top-ranked candidates."""
        negotiation_results: dict[str, NegotiationResult] = {}

        # Only negotiate on top 3 candidates
        top_candidates = state.ranked_candidates[:3]

        for ranked in top_candidates:
            candidate = ranked.candidate
            strategy = PLATFORM_STRATEGIES.get(candidate.platform, "price_match")

            # TODO: Replace with real negotiation logic
            if strategy == "price_match":
                result = await self._attempt_price_match(candidate, state)
            else:
                result = await self._attempt_direct_negotiation(candidate)

            negotiation_results[candidate.id] = result

        logger.info("Negotiation complete for %d candidates", len(negotiation_results))
        return {
            "negotiation_results": negotiation_results,
            "status": "complete",
            "updated_at": datetime.now(timezone.utc),
        }

    async def _attempt_price_match(self, candidate: Any, state: SharedState) -> NegotiationResult:
        """Attempt price-match negotiation for traditional retailers."""
        # Check if any competitor has a lower price
        price_analysis = state.price_analyses.get(candidate.id)
        best_competitor = None
        if price_analysis:
            for cp in price_analysis.competitor_prices:
                if cp.in_stock and cp.price < candidate.price:
                    if best_competitor is None or cp.price < best_competitor.price:
                        best_competitor = cp

        if best_competitor:
            savings = round(candidate.price - best_competitor.price, 2)
            return NegotiationResult(
                candidate_id=candidate.id,
                strategy_used="price_match",
                original_price=candidate.price,
                negotiated_price=best_competitor.price,
                savings=savings,
                success=True,
                conversation_log=[
                    {
                        "role": "system",
                        "content": (
                            f"Found lower price ${best_competitor.price:.2f} on "
                            f"{best_competitor.platform}. {candidate.platform.title()} "
                            f"may match this price."
                        ),
                    }
                ],
                reasoning=(
                    f"Found same product for ${best_competitor.price:.2f} on "
                    f"{best_competitor.platform}. {candidate.platform.title()}'s "
                    f"price-match policy could save ${savings:.2f}."
                ),
                next_steps=[
                    f"Contact {candidate.platform.title()} customer service",
                    f"Reference competitor price: ${best_competitor.price:.2f} on {best_competitor.platform}",
                    f"Request price match to save ${savings:.2f}",
                ],
            )

        return NegotiationResult(
            candidate_id=candidate.id,
            strategy_used="price_match",
            original_price=candidate.price,
            success=False,
            reasoning="No lower competitor prices found for price-match.",
            next_steps=["Monitor prices for future drops", "Check for seasonal sales"],
        )

    async def _attempt_direct_negotiation(self, candidate: Any) -> NegotiationResult:
        """Draft a negotiation message for marketplace listings."""
        # TODO: Replace with real Claude-powered negotiation
        offer_price = round(candidate.price * 0.85, 2)
        return NegotiationResult(
            candidate_id=candidate.id,
            strategy_used="direct_negotiation",
            original_price=candidate.price,
            negotiated_price=offer_price,
            savings=round(candidate.price - offer_price, 2),
            success=False,  # Pending — user must send the message
            conversation_log=[
                {
                    "role": "buyer",
                    "content": (
                        f"Hi, I'm interested in your {candidate.name}. "
                        f"Would you consider ${offer_price:.2f}? "
                        f"I can pick up today and pay cash."
                    ),
                }
            ],
            reasoning=(
                f"Marketplace listing — offering 15% below asking price "
                f"(${offer_price:.2f} vs ${candidate.price:.2f}) "
                f"with convenience incentives."
            ),
            next_steps=[
                f"Send the drafted message to the seller",
                f"Be prepared to negotiate up to ${candidate.price * 0.9:.2f}",
                "Mention flexible pickup time as additional leverage",
            ],
        )
