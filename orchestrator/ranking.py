"""Candidate ranking logic — merges trust + price signals into final ranking."""

import logging

from models.candidates import ProductCandidate
from models.price import PriceAnalysis
from models.state import RankedCandidate, SharedState
from models.trust import TrustScore

logger = logging.getLogger(__name__)


def rank_candidates(state: SharedState) -> list[RankedCandidate]:
    """Produce a final ranked list by combining trust and price scores.

    Composite score formula (weights from user's priority_weights):
      - trust_weight  * trust_overall_score
      - price_weight  * deal_quality_score
      - review_weight * review_authenticity_score
      - quality_weight * product_legitimacy_score

    Falls back to even weights if priority_weights is unavailable.

    Args:
        state: Pipeline state with candidates, trust_scores, and price_analyses.

    Returns:
        Sorted list of RankedCandidate objects.
    """
    weights = {
        "price": 0.25,
        "quality": 0.30,
        "brand": 0.15,
        "reviews": 0.30,
    }
    if state.requirements and state.requirements.priority_weights:
        weights = state.requirements.priority_weights

    w_price = weights.get("price", 0.25)
    w_quality = weights.get("quality", 0.30)
    w_reviews = weights.get("reviews", 0.30)
    # brand weight contributes to trust overall
    w_brand = weights.get("brand", 0.15)

    scored: list[tuple[float, ProductCandidate]] = []

    for candidate in state.candidates:
        trust: TrustScore | None = state.trust_scores.get(candidate.id)
        price: PriceAnalysis | None = state.price_analyses.get(candidate.id)

        trust_overall = trust.overall_score if trust else 50.0
        review_auth = trust.review_authenticity_score if trust else 50.0
        legitimacy = trust.product_legitimacy_score if trust else 50.0
        deal_quality = price.deal_quality_score if price else 50.0

        composite = (
            w_price * deal_quality
            + w_quality * legitimacy
            + w_reviews * review_auth
            + w_brand * trust_overall
        )
        scored.append((composite, candidate))

    scored.sort(key=lambda x: x[0], reverse=True)

    ranked: list[RankedCandidate] = []
    for rank, (score, candidate) in enumerate(scored, start=1):
        ranked.append(
            RankedCandidate(
                candidate=candidate,
                trust_score=state.trust_scores.get(candidate.id),
                price_analysis=state.price_analyses.get(candidate.id),
                composite_score=round(score, 2),
                rank=rank,
            )
        )

    logger.info("Ranked %d candidates", len(ranked))
    return ranked
