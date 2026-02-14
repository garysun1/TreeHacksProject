"""Quick end-to-end test for the PriceAgent with real Perplexity Sonar API."""

import asyncio
import logging

from dotenv import load_dotenv
load_dotenv()

from config import settings
from models.candidates import ProductCandidate
from models.requirements import ProductRequirements
from models.state import SharedState
from agents.price_agent import PriceAgent

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


async def main() -> None:
    has_pplx = bool(settings.perplexity_api_key and settings.perplexity_api_key.strip())
    print(f"\n=== Price Agent E2E Test ===")
    print(f"Perplexity API key configured: {has_pplx}")

    reqs = ProductRequirements(
        category="mirrorless camera",
        description="mirrorless camera for travel photography",
        budget_max=800.0,
    )

    candidates = [
        ProductCandidate(
            id="c001",
            name="Sony Alpha ZV-E10 - APS-C Interchangeable Lens Mirrorless Vlog Camera Kit",
            brand="Sony",
            price=798.00,
            url="https://www.amazon.com/dp/B0FLSPG85G",
            platform="amazon",
            seller_name="Amazon.com",
            rating=4.6,
            review_count=905,
        ),
        ProductCandidate(
            id="c002",
            name="Canon EOS R100 Mirrorless Camera with RF-S 18-45mm Lens",
            brand="Canon",
            price=479.00,
            url="https://www.amazon.com/dp/B0C5PGRP7V",
            platform="amazon",
            seller_name="Amazon.com",
            rating=4.5,
            review_count=839,
        ),
    ]

    state = SharedState(
        session_id="price-test-001",
        user_query="mirrorless camera for travel",
        requirements=reqs,
        candidates=candidates,
        status="analyzing",
    )

    agent = PriceAgent()
    print(f"\nRunning PriceAgent on {len(candidates)} candidates...\n")
    result = await agent.run(state)

    analyses = result.get("price_analyses", {})
    print(f"--- Results: {len(analyses)} price analyses ---\n")

    for cid, pa in analyses.items():
        c = next((x for x in candidates if x.id == cid), None)
        name = c.name[:50] if c else cid
        print(f"  [{cid}] {name}")
        print(f"    Current price: ${pa.current_price:.2f}")
        print(f"    Deal score: {pa.deal_quality_score}/100")
        print(f"    Effective price: ${pa.effective_price:.2f}")
        print(f"    Total savings: ${pa.total_savings_potential:.2f}")

        if pa.price_history:
            h = pa.price_history
            print(f"    History: low ${h.lowest_price:.2f} / avg ${h.average_price:.2f} / high ${h.highest_price:.2f} ({h.price_trend})")

        if pa.competitor_prices:
            for cp in pa.competitor_prices[:4]:
                stock = "in stock" if cp.in_stock else "OOS"
                print(f"    Competitor: {cp.platform} ${cp.price:.2f} ({stock})")

        if pa.available_coupons:
            for coupon in pa.available_coupons[:3]:
                disc = f"{coupon.discount_percent}%" if coupon.discount_percent else f"${coupon.discount_amount}"
                print(f"    Coupon: {coupon.code} — {disc} ({coupon.source})")

        if pa.cashback_options:
            for cb in pa.cashback_options[:3]:
                print(f"    Cashback: {cb.provider} {cb.cashback_percent}%")

        if pa.price_prediction:
            print(f"    Prediction: {pa.price_prediction[:120]}")

        print(f"    Reasoning: {pa.reasoning[:200]}...")
        print()

    mock_count = sum(1 for pa in analyses.values() if "Mock" in pa.reasoning)
    if mock_count == len(analyses):
        print(">>> Data source: MOCK")
    elif mock_count > 0:
        print(f">>> Data source: MIXED ({len(analyses) - mock_count} real, {mock_count} mock)")
    else:
        print(">>> Data source: REAL API")


if __name__ == "__main__":
    asyncio.run(main())
