"""Tests for Pydantic data model validation."""

import pytest

from models.requirements import ProductRequirements
from models.candidates import ProductCandidate
from models.trust import TrustFlag, TrustScore
from models.price import PriceAnalysis, PriceHistory, CompetitorPrice, Coupon, CashbackOption
from models.negotiation import NegotiationResult
from models.state import SharedState, AgentError, RankedCandidate


def test_product_requirements_defaults():
    reqs = ProductRequirements(
        category="camera",
        description="A travel camera",
        must_have=["lightweight"],
        use_case="travel photography",
    )
    assert reqs.urgency == "no_rush"
    assert reqs.condition == "new"
    assert "price" in reqs.priority_weights


def test_product_requirements_full():
    reqs = ProductRequirements(
        category="laptop",
        description="Gaming laptop",
        must_have=["RTX 4060", "16GB RAM"],
        nice_to_have=["thunderbolt"],
        dealbreakers=["over 6 lbs"],
        budget_min=800,
        budget_max=1500,
        brand_preferences=["ASUS", "Lenovo"],
        brand_exclusions=["HP"],
        use_case="gaming and development",
        urgency="this_week",
        condition="new",
        priority_weights={"price": 0.4, "quality": 0.3, "brand": 0.1, "reviews": 0.2},
    )
    assert reqs.budget_max == 1500
    assert len(reqs.must_have) == 2


def test_product_candidate():
    c = ProductCandidate(
        id="abc123",
        name="Sony Alpha a6400",
        brand="Sony",
        price=899.99,
        url="https://amazon.com/product/abc",
        platform="amazon",
        seller_name="Amazon.com",
        rating=4.7,
        review_count=1234,
    )
    assert c.currency == "USD"
    assert c.availability == "in_stock"


def test_trust_score_validation():
    ts = TrustScore(
        candidate_id="abc",
        overall_score=85.0,
        seller_score=90.0,
        review_authenticity_score=80.0,
        product_legitimacy_score=85.0,
        reasoning="Good seller with authentic reviews.",
    )
    assert 0 <= ts.overall_score <= 100


def test_trust_score_out_of_range():
    with pytest.raises(Exception):
        TrustScore(
            candidate_id="abc",
            overall_score=150.0,  # Out of range
            seller_score=90.0,
            review_authenticity_score=80.0,
            product_legitimacy_score=85.0,
            reasoning="Invalid",
        )


def test_price_analysis():
    pa = PriceAnalysis(
        candidate_id="abc",
        current_price=299.99,
        deal_quality_score=75.0,
        effective_price=269.99,
        reasoning="Good deal.",
    )
    assert pa.total_savings_potential == 0.0


def test_negotiation_result():
    nr = NegotiationResult(
        candidate_id="abc",
        strategy_used="price_match",
        original_price=299.99,
        negotiated_price=279.99,
        savings=20.0,
        success=True,
        reasoning="Price matched with Walmart.",
        next_steps=["Contact customer service"],
    )
    assert nr.savings == 20.0


def test_shared_state_defaults():
    state = SharedState(session_id="test-123", user_query="I need a camera")
    assert state.status == "intent"
    assert state.requirements is None
    assert state.candidates == []
    assert state.errors == []


def test_ranked_candidate():
    candidate = ProductCandidate(
        id="abc",
        name="Test Product",
        brand="TestBrand",
        price=100.0,
        url="https://example.com",
        platform="amazon",
        seller_name="TestSeller",
    )
    rc = RankedCandidate(candidate=candidate, composite_score=85.5, rank=1)
    assert rc.rank == 1
    assert rc.trust_score is None
