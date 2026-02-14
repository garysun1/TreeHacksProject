"""Quick end-to-end test for the NegotiationAgent with OpenAI GPT-4o."""

import asyncio
import logging

from dotenv import load_dotenv
load_dotenv()

from config import settings
from models.candidates import ProductCandidate
from models.price import CashbackOption, CompetitorPrice, Coupon, PriceAnalysis, PriceHistory
from models.trust import TrustFlag, TrustScore
from models.state import RankedCandidate, SharedState
from agents.negotiation_agent import NegotiationAgent

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


def _build_state() -> SharedState:
    """Build a realistic SharedState with ranked candidates, trust, and price data."""

    # Candidate 1: eBay listing (negotiable marketplace)
    c1 = ProductCandidate(
        id="neg-001",
        name="Sony Alpha a6400 Mirrorless Camera with 16-50mm Lens",
        brand="Sony",
        price=748.00,
        url="https://www.ebay.com/itm/1234567890",
        platform="ebay",
        seller_name="camera_deals_2024",
        rating=4.5,
        review_count=320,
    )
    t1 = TrustScore(
        candidate_id="neg-001",
        overall_score=72,
        seller_score=65,
        review_authenticity_score=78,
        product_legitimacy_score=74,
        flags=[
            TrustFlag(severity="warning", category="seller_history", description="Seller has only 6 months of history"),
        ],
        reasoning="Relatively new seller with limited track record.",
        sources_checked=["eBay seller profile", "Perplexity"],
    )
    p1 = PriceAnalysis(
        candidate_id="neg-001",
        current_price=748.00,
        deal_quality_score=62,
        price_history=PriceHistory(
            lowest_price=649.00, highest_price=899.00, average_price=749.00, price_trend="falling"
        ),
        competitor_prices=[
            CompetitorPrice(platform="Amazon", price=798.00, url="https://amazon.com/dp/B0XXX", in_stock=True),
            CompetitorPrice(platform="B&H Photo", price=698.00, url="https://bhphoto.com/1234", in_stock=True),
        ],
        available_coupons=[
            Coupon(code="SAVE10", description="10% off cameras", discount_percent=10, verified=True, source="RetailMeNot"),
        ],
        cashback_options=[
            CashbackOption(provider="Rakuten", cashback_percent=3.0, url="https://rakuten.com/ebay"),
        ],
        total_savings_potential=97.40,
        effective_price=650.60,
        reasoning="Decent deal; below average price.",
    )

    # Candidate 2: Best Buy listing (price-match eligible)
    c2 = ProductCandidate(
        id="neg-002",
        name="Canon EOS R100 Mirrorless Camera with RF-S 18-45mm Lens",
        brand="Canon",
        price=479.00,
        url="https://www.bestbuy.com/site/canon-eos-r100/6543210",
        platform="bestbuy",
        seller_name="Best Buy",
        rating=4.5,
        review_count=839,
    )
    t2 = TrustScore(
        candidate_id="neg-002",
        overall_score=95,
        seller_score=98,
        review_authenticity_score=92,
        product_legitimacy_score=96,
        flags=[],
        reasoning="Major retailer with excellent reputation.",
        sources_checked=["Best Buy profile", "BBB"],
    )
    p2 = PriceAnalysis(
        candidate_id="neg-002",
        current_price=479.00,
        deal_quality_score=73,
        price_history=PriceHistory(
            lowest_price=399.00, highest_price=499.99, average_price=449.00, price_trend="stable"
        ),
        competitor_prices=[
            CompetitorPrice(platform="Amazon", price=479.00, url="https://amazon.com/dp/B0YYY", in_stock=True),
            CompetitorPrice(platform="Adorama", price=449.00, url="https://adorama.com/canr100", in_stock=True),
            CompetitorPrice(platform="Walmart", price=479.99, url="https://walmart.com/ip/12345", in_stock=True),
        ],
        available_coupons=[],
        cashback_options=[
            CashbackOption(provider="TopCashback", cashback_percent=1.5, url="https://topcashback.com/bestbuy"),
        ],
        total_savings_potential=37.19,
        effective_price=441.81,
        reasoning="Adorama is $30 cheaper — eligible for Best Buy price match.",
    )

    # Candidate 3: Amazon listing (fixed price)
    c3 = ProductCandidate(
        id="neg-003",
        name="Fujifilm X-S20 Mirrorless Camera Body",
        brand="Fujifilm",
        price=1299.00,
        url="https://www.amazon.com/dp/B0CZZZ",
        platform="amazon",
        seller_name="Amazon.com",
        rating=4.7,
        review_count=1203,
    )
    t3 = TrustScore(
        candidate_id="neg-003",
        overall_score=97,
        seller_score=99,
        review_authenticity_score=94,
        product_legitimacy_score=98,
        flags=[],
        reasoning="Sold and shipped by Amazon. Highly trustworthy.",
        sources_checked=["Amazon", "Fakespot"],
    )
    p3 = PriceAnalysis(
        candidate_id="neg-003",
        current_price=1299.00,
        deal_quality_score=45,
        price_history=PriceHistory(
            lowest_price=1199.00, highest_price=1399.00, average_price=1279.00, price_trend="rising"
        ),
        competitor_prices=[
            CompetitorPrice(platform="B&H Photo", price=1299.00, url="https://bhphoto.com/fuji", in_stock=True),
            CompetitorPrice(platform="Adorama", price=1299.00, url="https://adorama.com/fuji", in_stock=True),
        ],
        available_coupons=[],
        cashback_options=[
            CashbackOption(provider="Rakuten", cashback_percent=2.0, url="https://rakuten.com/amazon"),
        ],
        total_savings_potential=25.98,
        effective_price=1273.02,
        reasoning="All retailers at same price. Limited savings opportunity.",
    )

    ranked = [
        RankedCandidate(candidate=c1, trust_score=t1, price_analysis=p1, composite_score=74, rank=1),
        RankedCandidate(candidate=c2, trust_score=t2, price_analysis=p2, composite_score=82, rank=2),
        RankedCandidate(candidate=c3, trust_score=t3, price_analysis=p3, composite_score=68, rank=3),
    ]

    return SharedState(
        session_id="negotiation-test-001",
        user_query="mirrorless camera for travel under $800",
        status="negotiating",
        ranked_candidates=ranked,
        trust_scores={t.candidate_id: t for t in [t1, t2, t3]},
        price_analyses={p.candidate_id: p for p in [p1, p2, p3]},
    )


async def main() -> None:
    has_key = bool(settings.openai_api_key and settings.openai_api_key.strip())
    print("\n=== Negotiation Agent E2E Test ===")
    print(f"OpenAI API key configured: {has_key}")
    print(f"Model: gpt-4o\n")

    state = _build_state()
    agent = NegotiationAgent()
    print(f"Running NegotiationAgent on {len(state.ranked_candidates)} candidates...\n")
    result = await agent.run(state)

    results = result.get("negotiation_results", {})
    print(f"--- Results: {len(results)} negotiation strategies ---\n")

    mock_count = 0
    for cid, nr in results.items():
        rc = next((r for r in state.ranked_candidates if r.candidate.id == cid), None)
        name = rc.candidate.name[:55] if rc else cid
        platform = rc.candidate.platform if rc else "?"
        if "Mock" in nr.reasoning:
            mock_count += 1

        print(f"  [{cid}] {name}")
        print(f"    Platform: {platform}")
        print(f"    Strategy: {nr.strategy_used}")
        print(f"    Viable: {nr.success}")
        print(f"    Original price: ${nr.original_price:.2f}")
        if nr.negotiated_price is not None:
            print(f"    Proposed price: ${nr.negotiated_price:.2f}")
        if nr.savings:
            print(f"    Potential savings: ${nr.savings:.2f}")
        print(f"    Reasoning: {nr.reasoning[:250]}")

        if nr.conversation_log:
            print(f"    Messages ({len(nr.conversation_log)}):")
            for msg in nr.conversation_log:
                role = msg.get("role", "?")
                text = msg.get("content", "")[:180]
                print(f"      [{role}]: {text}")

        if nr.next_steps:
            print(f"    Next steps:")
            for step in nr.next_steps:
                print(f"      - {step[:150]}")
        print()

    if mock_count == len(results):
        print(">>> Data source: MOCK")
    elif mock_count > 0:
        print(f">>> Data source: MIXED ({len(results) - mock_count} real, {mock_count} mock)")
    else:
        print(">>> Data source: REAL API (OpenAI GPT-4o)")


if __name__ == "__main__":
    asyncio.run(main())
