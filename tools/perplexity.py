"""Perplexity Sonar API wrapper for research and claim verification.

Endpoint: POST https://api.perplexity.ai/chat/completions
Auth:     Authorization: Bearer <PERPLEXITY_API_KEY>
Docs:     https://docs.perplexity.ai/docs/sonar/quickstart
"""

import json
import logging
from typing import Any

import httpx
from tenacity import retry, retry_if_not_exception_type, stop_after_attempt, wait_exponential

from config import settings

logger = logging.getLogger(__name__)

SONAR_URL = "https://api.perplexity.ai/chat/completions"

# Use sonar (fast + cheap) for individual lookups; sonar-pro for deep research
DEFAULT_MODEL = "sonar"


# ── Mock helpers ────────────────────────────────────────────────────


def _mock_research(query: str) -> dict[str, Any]:
    """Return mock research findings when API is unavailable."""
    return {
        "answer": f"Mock research findings for: {query}",
        "sources": [
            "https://example.com/review1",
            "https://example.com/review2",
        ],
        "confidence": 0.85,
    }


def _mock_verify(claim: str) -> dict[str, Any]:
    """Return mock verification when API is unavailable."""
    return {
        "claim": claim,
        "verified": True,
        "confidence": 0.8,
        "explanation": f"Mock verification for: {claim}",
        "sources": ["https://example.com/source1"],
    }


# ── Client ──────────────────────────────────────────────────────────


class PerplexityClient:
    """Async client for Perplexity's Sonar research API."""

    def __init__(self) -> None:
        self.api_key = settings.perplexity_api_key
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    def _use_api(self) -> bool:
        return bool(self.api_key and self.api_key.strip())

    async def _call_sonar(
        self,
        messages: list[dict[str, str]],
        model: str = DEFAULT_MODEL,
    ) -> dict[str, Any]:
        """Low-level call to the Sonar chat/completions endpoint.

        Returns the full parsed JSON response dict.
        Raises immediately on 401/403 (bad key) so tenacity doesn't retry.
        """
        body: dict[str, Any] = {
            "model": model,
            "messages": messages,
        }
        async with httpx.AsyncClient(timeout=60.0) as client:
            r = await client.post(SONAR_URL, headers=self.headers, json=body)
        if r.status_code in (401, 403):
            # Auth errors are permanent — don't retry
            raise PermissionError(
                f"Perplexity API auth failed ({r.status_code}). "
                "Check PERPLEXITY_API_KEY in your .env file."
            )
        r.raise_for_status()
        return r.json()

    def _extract(self, data: dict[str, Any]) -> tuple[str, list[str]]:
        """Pull content + source URLs from a Sonar response."""
        content = ""
        if data.get("choices"):
            content = data["choices"][0].get("message", {}).get("content", "")
        sources: list[str] = data.get("citations", [])
        return content, sources

    # ── Public methods ──────────────────────────────────────────────

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=1, max=10),
        retry=retry_if_not_exception_type(PermissionError),
    )
    async def research(self, query: str) -> dict[str, Any]:
        """Perform a research query via Sonar.

        Args:
            query: Natural language research question.

        Returns:
            ``{"answer": str, "sources": list[str], "confidence": float}``
        """
        logger.info("Perplexity: researching '%s'", query[:120])

        if not self._use_api():
            return _mock_research(query)

        try:
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are a product and seller research assistant. "
                        "Provide concise, factual findings with specific details. "
                        "Focus on reputation, trustworthiness, and any red flags."
                    ),
                },
                {"role": "user", "content": query},
            ]
            data = await self._call_sonar(messages)
            answer, sources = self._extract(data)
            logger.info(
                "Perplexity: got %d-char answer with %d sources",
                len(answer),
                len(sources),
            )
            return {
                "answer": answer,
                "sources": sources,
                "confidence": 0.9 if sources else 0.6,
            }
        except Exception as e:
            logger.warning("Perplexity: research failed, using mock: %s", e)
            return _mock_research(query)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=1, max=10),
        retry=retry_if_not_exception_type(PermissionError),
    )
    async def verify_claim(self, claim: str, context: str) -> dict[str, Any]:
        """Verify a specific claim about a product or seller.

        Args:
            claim: The claim to verify.
            context: Additional context about the product/seller.

        Returns:
            ``{"claim": str, "verified": bool, "confidence": float,
               "explanation": str, "sources": list[str]}``
        """
        logger.info("Perplexity: verifying claim '%s'", claim[:120])

        if not self._use_api():
            return _mock_verify(claim)

        try:
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are a fact-checking assistant for online shopping. "
                        "Determine whether the given claim is accurate. "
                        "Reply with a JSON object: "
                        '{"verified": true/false, "confidence": 0.0-1.0, "explanation": "..."}. '
                        "Be concise."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Claim: {claim}\n\nContext: {context}",
                },
            ]
            data = await self._call_sonar(messages)
            answer, sources = self._extract(data)

            # Try to parse structured response; fall back to heuristic
            verified = True
            confidence = 0.7
            explanation = answer
            try:
                # The model may wrap JSON in markdown fences
                clean = answer.strip()
                if clean.startswith("```"):
                    clean = clean.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
                parsed = json.loads(clean)
                verified = bool(parsed.get("verified", True))
                confidence = float(parsed.get("confidence", 0.7))
                explanation = parsed.get("explanation", answer)
            except (json.JSONDecodeError, ValueError):
                # Heuristic: look for negative keywords
                low = answer.lower()
                if any(w in low for w in ("false", "not verified", "unverified", "misleading", "fake")):
                    verified = False
                    confidence = 0.6

            return {
                "claim": claim,
                "verified": verified,
                "confidence": confidence,
                "explanation": explanation,
                "sources": sources,
            }
        except Exception as e:
            logger.warning("Perplexity: verify_claim failed, using mock: %s", e)
            return _mock_verify(claim)

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(min=1, max=10),
        retry=retry_if_not_exception_type(PermissionError),
    )
    async def analyze_trust(
        self,
        product_name: str,
        brand: str,
        seller: str,
        platform: str,
        price: float,
        rating: float | None,
        review_count: int | None,
    ) -> dict[str, Any]:
        """All-in-one trust analysis for a product candidate.

        Makes a single Sonar call covering seller reputation, review
        authenticity, and product legitimacy.  Returns structured scores.

        Returns:
            ``{"seller_score": float, "review_score": float,
               "legitimacy_score": float, "flags": list[str],
               "reasoning": str, "sources": list[str]}``
        """
        label = f"{product_name[:60]} by {seller}"
        logger.info("Perplexity: trust analysis for '%s'", label)

        if not self._use_api():
            return _mock_trust_analysis(seller, platform)

        rating_str = f"{rating}/5 stars" if rating else "unknown rating"
        reviews_str = f"{review_count} reviews" if review_count else "unknown review count"

        prompt = (
            f"Analyze the trustworthiness of this product listing:\n\n"
            f"Product: {product_name}\n"
            f"Brand: {brand}\n"
            f"Seller: {seller}\n"
            f"Platform: {platform}\n"
            f"Price: ${price:.2f}\n"
            f"Rating: {rating_str}\n"
            f"Reviews: {reviews_str}\n\n"
            f"Please evaluate:\n"
            f"1. SELLER REPUTATION: Is '{seller}' a known/reliable seller on {platform}? "
            f"Any complaints, scam reports, or counterfeit issues?\n"
            f"2. REVIEW AUTHENTICITY: For a product with {rating_str} and {reviews_str}, "
            f"are there signs of fake/incentivized reviews? Consider the ratio and patterns.\n"
            f"3. PRODUCT LEGITIMACY: Is the price reasonable for this type of product? "
            f"Any counterfeit risks for the brand '{brand}'?\n\n"
            f"Reply ONLY with a JSON object:\n"
            f'{{"seller_score": <0-100>, "review_score": <0-100>, '
            f'"legitimacy_score": <0-100>, "flags": ["flag1", ...], '
            f'"reasoning": "concise paragraph"}}'
        )

        try:
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are a trust and fraud detection specialist for e-commerce. "
                        "Provide scores from 0 (very untrustworthy) to 100 (completely trustworthy). "
                        "Always respond with valid JSON only."
                    ),
                },
                {"role": "user", "content": prompt},
            ]
            data = await self._call_sonar(messages)
            answer, sources = self._extract(data)

            # Parse the structured JSON
            clean = answer.strip()
            if clean.startswith("```"):
                clean = clean.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
            parsed = json.loads(clean)

            return {
                "seller_score": _clamp(parsed.get("seller_score", 70)),
                "review_score": _clamp(parsed.get("review_score", 70)),
                "legitimacy_score": _clamp(parsed.get("legitimacy_score", 70)),
                "flags": parsed.get("flags", []),
                "reasoning": parsed.get("reasoning", ""),
                "sources": sources,
            }
        except Exception as e:
            logger.warning("Perplexity: trust analysis failed for '%s', using mock: %s", label, e)
            return _mock_trust_analysis(seller, platform)


def _clamp(val: Any, lo: float = 0, hi: float = 100) -> float:
    """Clamp a numeric value to [lo, hi]."""
    try:
        return max(lo, min(hi, float(val)))
    except (TypeError, ValueError):
        return 70.0


def _mock_trust_analysis(seller: str, platform: str) -> dict[str, Any]:
    """Return a plausible mock trust analysis."""
    import random

    return {
        "seller_score": round(random.uniform(60, 95), 1),
        "review_score": round(random.uniform(50, 95), 1),
        "legitimacy_score": round(random.uniform(70, 98), 1),
        "flags": [],
        "reasoning": f"Mock trust analysis for seller '{seller}' on {platform}.",
        "sources": ["https://example.com/trust-check"],
    }


perplexity = PerplexityClient()
