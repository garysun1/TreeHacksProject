"""Negotiation Agent — generates deal strategies and negotiation messages.

Uses OpenAI GPT-4o (not Claude) to demonstrate multi-provider AI usage.
Receives candidates with TrustScores and PriceAnalysis from prior agents.
"""

import json
import logging
import random
from datetime import datetime, timezone
from typing import Any

from openai import AsyncOpenAI
from tenacity import retry, retry_if_not_exception_type, stop_after_attempt, wait_exponential

from config import settings
from models.candidates import ProductCandidate
from models.negotiation import NegotiationResult
from models.price import PriceAnalysis
from models.state import RankedCandidate, SharedState
from models.trust import TrustScore

logger = logging.getLogger(__name__)

OPENAI_MODEL = "gpt-4o"

SYSTEM_PROMPT = """\
You are an expert deal negotiation strategist for online shopping.
You analyze product listings, competitor prices, price history, and seller
trust data to craft personalized negotiation strategies and messages.

You are realistic: if a product is on a fixed-price platform with no
negotiation path, you say so honestly and recommend the best available deal
instead of fabricating a strategy.
"""

# Platform capabilities
NEGOTIABLE_PLATFORMS = {"ebay", "facebook", "facebook_marketplace", "craigslist", "offerup", "mercari"}
PRICE_MATCH_PLATFORMS = {"bestbuy", "walmart", "target"}
FIXED_PRICE_PLATFORMS = {"amazon"}

TOP_N_CANDIDATES = 3


def _use_openai() -> bool:
    """True if we have an OpenAI API key."""
    return bool(settings.openai_api_key and settings.openai_api_key.strip())


def _build_candidate_brief(
    candidate: ProductCandidate,
    trust: TrustScore | None,
    price: PriceAnalysis | None,
) -> str:
    """Build a text brief of all available data for GPT-4o."""
    lines = [
        f"PRODUCT: {candidate.name}",
        f"Brand: {candidate.brand}",
        f"Platform: {candidate.platform}",
        f"Seller: {candidate.seller_name}",
        f"URL: {candidate.url}",
        f"Current price: ${candidate.price:.2f}",
        f"Rating: {candidate.rating}/5 ({candidate.review_count} reviews)"
        if candidate.rating
        else "Rating: unknown",
    ]

    if price:
        if price.price_history:
            h = price.price_history
            lines.append(
                f"PRICE HISTORY: low ${h.lowest_price:.2f}, "
                f"avg ${h.average_price:.2f}, high ${h.highest_price:.2f}, "
                f"trend={h.price_trend}"
            )
        if price.competitor_prices:
            for cp in price.competitor_prices:
                stock = "in stock" if cp.in_stock else "out of stock"
                lines.append(f"COMPETITOR: {cp.platform} ${cp.price:.2f} ({stock}) — {cp.url}")
        if price.available_coupons:
            for c in price.available_coupons:
                disc = f"{c.discount_percent}%" if c.discount_percent else f"${c.discount_amount}"
                lines.append(f"COUPON: {c.code} — {disc} via {c.source}")
        if price.cashback_options:
            for cb in price.cashback_options:
                lines.append(f"CASHBACK: {cb.provider} {cb.cashback_percent}%")
        lines.append(f"Effective price after savings: ${price.effective_price:.2f}")
        lines.append(f"Deal quality score: {price.deal_quality_score}/100")

    if trust:
        lines.append(
            f"TRUST: overall {trust.overall_score}/100 "
            f"(seller={trust.seller_score}, reviews={trust.review_authenticity_score}, "
            f"legitimacy={trust.product_legitimacy_score})"
        )
        for flag in trust.flags:
            lines.append(f"  FLAG [{flag.severity}]: {flag.description}")

    return "\n".join(lines)


def _build_user_prompt(brief: str, platform: str) -> str:
    """Build the GPT-4o user prompt for negotiation analysis."""
    return (
        f"{brief}\n\n"
        f"Based on this data, provide a complete negotiation strategy.\n\n"
        f"Reply ONLY with a JSON object:\n"
        f'{{\n'
        f'  "strategy": "price_match" | "direct_negotiation" | "no_negotiation",\n'
        f'  "viable": true/false,\n'
        f'  "reasoning": "Why this strategy, referencing specific data points",\n'
        f'  "offer_price": <number or null if no negotiation possible>,\n'
        f'  "leverage_points": ["point1", "point2", ...],\n'
        f'  "messages": {{\n'
        f'    "aggressive": "Full message text proposing 15-20% below asking...",\n'
        f'    "moderate": "Full message text proposing ~10% below asking...",\n'
        f'    "friendly": "Full message text proposing 5-10% below asking..."\n'
        f'  }},\n'
        f'  "next_steps": ["step1", "step2", ...],\n'
        f'  "counter_offer_range": {{"low": <number>, "high": <number>}},\n'
        f'  "walk_away_price": <number>,\n'
        f'  "fallback_plan": "What to do if negotiation fails"\n'
        f'}}'
    )


def _mock_negotiation(
    candidate: ProductCandidate,
    price: PriceAnalysis | None,
    trust: TrustScore | None,
) -> NegotiationResult:
    """Build a plausible mock NegotiationResult."""
    platform = candidate.platform.lower()
    current = candidate.price

    if platform in NEGOTIABLE_PLATFORMS:
        offer = round(current * 0.85, 2)
        return NegotiationResult(
            candidate_id=candidate.id,
            strategy_used="direct_negotiation",
            original_price=current,
            negotiated_price=offer,
            savings=round(current - offer, 2),
            success=False,
            conversation_log=[
                {
                    "role": "buyer",
                    "content": (
                        f"Hi, I'm interested in your {candidate.name}. "
                        f"Would you consider ${offer:.2f}? Ready to buy today."
                    ),
                }
            ],
            reasoning=f"Mock: Marketplace listing — offering 15% below ${current:.2f}.",
            next_steps=["Send the drafted message", "Be prepared to counter at 10% below"],
        )

    if platform in PRICE_MATCH_PLATFORMS and price and price.competitor_prices:
        cheapest = min(
            (cp for cp in price.competitor_prices if cp.in_stock),
            key=lambda c: c.price,
            default=None,
        )
        if cheapest and cheapest.price < current:
            savings = round(current - cheapest.price, 2)
            return NegotiationResult(
                candidate_id=candidate.id,
                strategy_used="price_match",
                original_price=current,
                negotiated_price=cheapest.price,
                savings=savings,
                success=True,
                conversation_log=[
                    {
                        "role": "system",
                        "content": f"Mock: Price match ${cheapest.price:.2f} from {cheapest.platform}",
                    }
                ],
                reasoning=f"Mock: Price match available — {cheapest.platform} at ${cheapest.price:.2f}.",
                next_steps=[f"Contact {platform} customer service for price match"],
            )

    return NegotiationResult(
        candidate_id=candidate.id,
        strategy_used="no_negotiation",
        original_price=current,
        success=False,
        reasoning=f"Mock: No negotiation path on {platform} at this time.",
        next_steps=["Apply available coupons/cashback", "Monitor for price drops"],
    )


class NegotiationAgent:
    """Generates negotiation strategies and messages using OpenAI GPT-4o.

    Does NOT inherit from BaseAgent (which uses Anthropic). Instead manages
    its own OpenAI client and replicates the run()/error-handling pattern.
    """

    name = "negotiation"

    def __init__(self) -> None:
        if _use_openai():
            self.client = AsyncOpenAI(api_key=settings.openai_api_key)
        else:
            self.client = None

    async def run(self, state: SharedState) -> dict[str, Any]:
        """Execute the agent and return a state update dict."""
        logger.info("Agent [%s] starting", self.name)
        try:
            result = await self._run(state)
            logger.info("Agent [%s] completed", self.name)
            return result
        except Exception as exc:
            logger.exception("Agent [%s] failed: %s", self.name, exc)
            from models.state import AgentError

            return {
                "errors": [
                    AgentError(
                        agent=self.name,
                        error_type=type(exc).__name__,
                        message=str(exc),
                    )
                ],
                "status": "error",
                "updated_at": datetime.now(timezone.utc),
            }

    async def _run(self, state: SharedState) -> dict[str, Any]:
        """Run negotiation strategies on top-ranked candidates."""
        negotiation_results: dict[str, NegotiationResult] = {}

        top = state.ranked_candidates[:TOP_N_CANDIDATES]
        if not top:
            logger.warning("Negotiation agent: no ranked candidates")
            return {
                "negotiation_results": {},
                "status": "complete",
                "updated_at": datetime.now(timezone.utc),
            }

        logger.info("Negotiation agent: strategizing for %d candidates", len(top))

        for ranked in top:
            candidate = ranked.candidate
            trust = state.trust_scores.get(candidate.id)
            price = state.price_analyses.get(candidate.id)

            result = await self._negotiate_candidate(candidate, trust, price)
            negotiation_results[candidate.id] = result

            logger.info(
                "Negotiation [%s] strategy=%s viable=%s offer=$%s",
                candidate.id,
                result.strategy_used,
                result.success,
                f"{result.negotiated_price:.2f}" if result.negotiated_price else "N/A",
            )

        logger.info("Negotiation complete for %d candidates", len(negotiation_results))
        return {
            "negotiation_results": negotiation_results,
            "status": "complete",
            "updated_at": datetime.now(timezone.utc),
        }

    @retry(
        stop=stop_after_attempt(2),
        wait=wait_exponential(min=1, max=8),
        retry=retry_if_not_exception_type((PermissionError, KeyError)),
    )
    async def _call_gpt4o(self, system: str, user: str) -> str:
        """Call OpenAI GPT-4o and return the message content.

        Raises PermissionError on auth failure so tenacity skips retries.
        """
        if not self.client:
            raise PermissionError("No OpenAI API key configured")

        resp = await self.client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            temperature=0.7,
            max_tokens=2048,
        )
        content = resp.choices[0].message.content or ""
        return content

    async def _negotiate_candidate(
        self,
        candidate: ProductCandidate,
        trust: TrustScore | None,
        price: PriceAnalysis | None,
    ) -> NegotiationResult:
        """Run the full negotiation pipeline for one candidate."""
        if not _use_openai():
            logger.debug("No OpenAI key, using mock negotiation for %s", candidate.id)
            return _mock_negotiation(candidate, price, trust)

        try:
            brief = _build_candidate_brief(candidate, trust, price)
            user_prompt = _build_user_prompt(brief, candidate.platform)

            raw = await self._call_gpt4o(SYSTEM_PROMPT, user_prompt)

            # Parse JSON from GPT-4o
            clean = raw.strip()
            if clean.startswith("```"):
                clean = clean.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            parsed = json.loads(clean)

            return self._build_result(candidate, parsed, price)

        except Exception as e:
            logger.warning(
                "Negotiation failed for '%s', using mock: %s",
                candidate.name[:50],
                e,
            )
            return _mock_negotiation(candidate, price, trust)

    def _build_result(
        self,
        candidate: ProductCandidate,
        parsed: dict[str, Any],
        price: PriceAnalysis | None,
    ) -> NegotiationResult:
        """Convert GPT-4o JSON into NegotiationResult."""
        strategy = parsed.get("strategy", "no_negotiation")
        viable = bool(parsed.get("viable", False))
        reasoning = parsed.get("reasoning", "")
        offer_price = parsed.get("offer_price")
        if offer_price is not None:
            try:
                offer_price = round(float(offer_price), 2)
            except (TypeError, ValueError):
                offer_price = None

        savings = round(candidate.price - offer_price, 2) if offer_price else None

        # Build conversation log from the 3 message variants
        messages_raw = parsed.get("messages", {})
        conversation_log: list[dict[str, str]] = []
        for tone, text in messages_raw.items():
            if text and isinstance(text, str):
                conversation_log.append({"role": f"buyer_{tone}", "content": text})

        # Build next steps
        next_steps = parsed.get("next_steps", [])
        if not isinstance(next_steps, list):
            next_steps = [str(next_steps)]

        # Add fallback plan and walk-away info
        fallback = parsed.get("fallback_plan", "")
        walk_away = parsed.get("walk_away_price")
        counter_range = parsed.get("counter_offer_range", {})

        if walk_away:
            next_steps.append(f"Walk-away price: ${float(walk_away):.2f}")
        if counter_range and isinstance(counter_range, dict):
            lo = counter_range.get("low")
            hi = counter_range.get("high")
            if lo and hi:
                next_steps.append(f"Expected counter-offer range: ${float(lo):.2f}–${float(hi):.2f}")
        if fallback:
            next_steps.append(f"Fallback: {fallback}")

        # Add savings-regardless tips (coupons/cashback)
        if price:
            if price.available_coupons:
                codes = ", ".join(c.code for c in price.available_coupons[:3])
                next_steps.append(f"Apply coupon(s) regardless: {codes}")
            if price.cashback_options:
                best_cb = max(price.cashback_options, key=lambda x: x.cashback_percent)
                next_steps.append(
                    f"Use {best_cb.provider} for {best_cb.cashback_percent}% cashback"
                )

        return NegotiationResult(
            candidate_id=candidate.id,
            strategy_used=strategy,
            original_price=candidate.price,
            negotiated_price=offer_price,
            savings=savings,
            success=viable,
            conversation_log=conversation_log,
            reasoning=reasoning,
            next_steps=next_steps,
        )
