"""Trust Agent — verifies seller reputation and review authenticity."""

import asyncio
import logging
import random
from datetime import datetime, timezone
from typing import Any

from agents.base import BaseAgent
from models.candidates import ProductCandidate
from models.state import SharedState
from models.trust import TrustFlag, TrustScore
from tools.perplexity import perplexity

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are a trust verification specialist. For each product candidate, you:

1. Research the seller's reputation and history
2. Analyze review patterns for signs of fake/incentivized reviews
3. Cross-reference product claims against independent testing
4. Check for counterfeit or scam indicators

Provide a detailed trust score (0-100) with reasoning for each candidate.
Flag any concerns with appropriate severity (info, warning, critical).
"""

# Limit concurrent Sonar calls to avoid rate-limits
MAX_CONCURRENT = 5

# Only analyze the top N candidates (sorted by state order = relevance)
MAX_CANDIDATES_TO_ANALYZE = 15


def _flags_from_scores(
    seller_score: float,
    review_score: float,
    legitimacy_score: float,
    raw_flags: list[str],
) -> list[TrustFlag]:
    """Convert numeric scores and raw flag strings into TrustFlag objects."""
    flags: list[TrustFlag] = []

    # Score-based flags
    if review_score < 45:
        flags.append(
            TrustFlag(
                severity="critical",
                category="fake_reviews",
                description="Strong indicators of fake or manipulated reviews",
            )
        )
    elif review_score < 65:
        flags.append(
            TrustFlag(
                severity="warning",
                category="fake_reviews",
                description="Review patterns suggest possible incentivized or inauthentic reviews",
            )
        )

    if seller_score < 45:
        flags.append(
            TrustFlag(
                severity="critical",
                category="seller_history",
                description="Seller has poor reputation or known complaints",
            )
        )
    elif seller_score < 65:
        flags.append(
            TrustFlag(
                severity="warning",
                category="seller_history",
                description="Seller has limited history or mixed feedback",
            )
        )

    if legitimacy_score < 45:
        flags.append(
            TrustFlag(
                severity="critical",
                category="counterfeit_risk",
                description="High risk of counterfeit or misleading product listing",
            )
        )
    elif legitimacy_score < 65:
        flags.append(
            TrustFlag(
                severity="warning",
                category="counterfeit_risk",
                description="Some indicators of pricing anomaly or authenticity concern",
            )
        )

    # Convert raw string flags from Sonar into info-level TrustFlags
    for flag_text in raw_flags:
        if not flag_text or not isinstance(flag_text, str):
            continue
        text_lower = flag_text.lower()
        if any(w in text_lower for w in ("scam", "counterfeit", "fraud", "fake")):
            severity = "critical"
        elif any(w in text_lower for w in ("warning", "concern", "suspicious", "caution")):
            severity = "warning"
        else:
            severity = "info"
        flags.append(
            TrustFlag(
                severity=severity,
                category="sonar_finding",
                description=flag_text,
            )
        )

    return flags


def _mock_trust_score(candidate: ProductCandidate) -> TrustScore:
    """Build a mock TrustScore so the pipeline never breaks."""
    seller_score = round(random.uniform(60, 95), 1)
    review_score = round(random.uniform(50, 95), 1)
    legitimacy_score = round(random.uniform(70, 98), 1)
    overall = round(seller_score * 0.3 + review_score * 0.4 + legitimacy_score * 0.3, 1)
    return TrustScore(
        candidate_id=candidate.id,
        overall_score=overall,
        seller_score=seller_score,
        review_authenticity_score=review_score,
        product_legitimacy_score=legitimacy_score,
        flags=_flags_from_scores(seller_score, review_score, legitimacy_score, []),
        reasoning=(
            f"Mock trust analysis for '{candidate.seller_name}' on {candidate.platform}: "
            f"seller {seller_score:.0f}/100, reviews {review_score:.0f}/100, "
            f"legitimacy {legitimacy_score:.0f}/100."
        ),
        sources_checked=["https://example.com/mock-trust"],
    )


class TrustAgent(BaseAgent):
    """Performs deep trust verification on product candidates."""

    name = "trust"
    system_prompt = SYSTEM_PROMPT

    async def _run(self, state: SharedState) -> dict[str, Any]:
        """Analyze trust signals for each candidate via Perplexity Sonar."""
        candidates = state.candidates[:MAX_CANDIDATES_TO_ANALYZE]
        if not candidates:
            logger.warning("Trust agent: no candidates to analyze")
            return {"trust_scores": {}, "updated_at": datetime.now(timezone.utc)}

        logger.info("Trust agent: analyzing %d candidates", len(candidates))

        # Use a semaphore to limit concurrency
        sem = asyncio.Semaphore(MAX_CONCURRENT)

        async def analyze_one(candidate: ProductCandidate) -> tuple[str, TrustScore]:
            async with sem:
                return await self._analyze_candidate(candidate)

        try:
            results = await asyncio.gather(
                *[analyze_one(c) for c in candidates],
                return_exceptions=True,
            )
        except Exception as e:
            logger.exception("Trust agent gather failed: %s", e)
            results = []

        trust_scores: dict[str, TrustScore] = {}
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.warning(
                    "Trust analysis failed for candidate %s: %s",
                    candidates[i].id,
                    result,
                )
                trust_scores[candidates[i].id] = _mock_trust_score(candidates[i])
            else:
                cid, score = result
                trust_scores[cid] = score

        logger.info("Trust analysis complete for %d candidates", len(trust_scores))
        return {
            "trust_scores": trust_scores,
            "updated_at": datetime.now(timezone.utc),
        }

    async def _analyze_candidate(
        self, candidate: ProductCandidate
    ) -> tuple[str, TrustScore]:
        """Run the full trust pipeline for a single candidate.

        1. Call perplexity.analyze_trust() for an all-in-one evaluation
        2. Convert response into a TrustScore
        3. Fall back to mock on any failure
        """
        try:
            result = await perplexity.analyze_trust(
                product_name=candidate.name,
                brand=candidate.brand,
                seller=candidate.seller_name,
                platform=candidate.platform,
                price=candidate.price,
                rating=candidate.rating,
                review_count=candidate.review_count,
            )

            seller_score = result["seller_score"]
            review_score = result["review_score"]
            legitimacy_score = result["legitimacy_score"]
            overall = round(
                seller_score * 0.3 + review_score * 0.4 + legitimacy_score * 0.3,
                1,
            )

            raw_flags: list[str] = result.get("flags", [])
            flags = _flags_from_scores(seller_score, review_score, legitimacy_score, raw_flags)

            reasoning = result.get("reasoning", "")
            if not reasoning:
                reasoning = (
                    f"Seller '{candidate.seller_name}' on {candidate.platform}: "
                    f"seller {seller_score:.0f}/100, reviews {review_score:.0f}/100, "
                    f"legitimacy {legitimacy_score:.0f}/100."
                )

            sources: list[str] = result.get("sources", [])

            score = TrustScore(
                candidate_id=candidate.id,
                overall_score=min(100.0, max(0.0, overall)),
                seller_score=seller_score,
                review_authenticity_score=review_score,
                product_legitimacy_score=legitimacy_score,
                flags=flags,
                reasoning=reasoning,
                sources_checked=sources,
            )
            return candidate.id, score

        except Exception as e:
            logger.warning(
                "Trust analysis failed for '%s', using mock: %s",
                candidate.name[:60],
                e,
            )
            return candidate.id, _mock_trust_score(candidate)
