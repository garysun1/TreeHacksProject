"""Trust Agent — verifies seller reputation and review authenticity."""

import logging
import random
from datetime import datetime, timezone
from typing import Any

from agents.base import BaseAgent
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


class TrustAgent(BaseAgent):
    """Performs deep trust verification on product candidates."""

    name = "trust"
    system_prompt = SYSTEM_PROMPT

    async def _run(self, state: SharedState) -> dict[str, Any]:
        """Analyze trust signals for each candidate."""
        trust_scores: dict[str, TrustScore] = {}

        for candidate in state.candidates:
            # TODO: Replace with real Perplexity research calls
            seller_query = f"Is {candidate.seller_name} a reliable seller on {candidate.platform}?"
            research = await perplexity.research(seller_query)

            review_query = f"{candidate.name} review authenticity analysis"
            review_research = await perplexity.research(review_query)

            # Mock scoring logic
            seller_score = random.uniform(60, 95)
            review_score = random.uniform(50, 95)
            legitimacy_score = random.uniform(70, 98)
            overall = (seller_score * 0.3 + review_score * 0.4 + legitimacy_score * 0.3)

            flags: list[TrustFlag] = []
            if review_score < 65:
                flags.append(
                    TrustFlag(
                        severity="warning",
                        category="fake_reviews",
                        description="Review pattern analysis suggests possible incentivized reviews",
                    )
                )
            if seller_score < 70:
                flags.append(
                    TrustFlag(
                        severity="warning",
                        category="seller_history",
                        description="Seller has limited history or mixed feedback",
                    )
                )

            trust_scores[candidate.id] = TrustScore(
                candidate_id=candidate.id,
                overall_score=round(overall, 1),
                seller_score=round(seller_score, 1),
                review_authenticity_score=round(review_score, 1),
                product_legitimacy_score=round(legitimacy_score, 1),
                flags=flags,
                reasoning=(
                    f"Seller '{candidate.seller_name}' on {candidate.platform}: "
                    f"seller reputation {seller_score:.0f}/100, "
                    f"review authenticity {review_score:.0f}/100, "
                    f"product legitimacy {legitimacy_score:.0f}/100."
                ),
                sources_checked=research.get("sources", []) + review_research.get("sources", []),
            )

        logger.info("Trust analysis complete for %d candidates", len(trust_scores))
        return {
            "trust_scores": trust_scores,
            "updated_at": datetime.now(timezone.utc),
        }
