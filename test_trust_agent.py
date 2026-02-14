"""Quick end-to-end test for the TrustAgent with real Perplexity Sonar API."""

import asyncio
import logging

from dotenv import load_dotenv
load_dotenv()

from config import settings
from models.candidates import ProductCandidate
from models.state import SharedState
from agents.trust_agent import TrustAgent

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


async def main() -> None:
    has_pplx = bool(settings.perplexity_api_key and settings.perplexity_api_key.strip())
    print(f"\n=== Trust Agent E2E Test ===")
    print(f"Perplexity API key configured: {has_pplx}")

    # Build a small set of realistic candidates (2 real-ish, 1 suspicious)
    candidates = [
        ProductCandidate(
            id="c001",
            name="Sony Alpha ZV-E10 Mirrorless Camera",
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
            name="Canon EOS R100 Mirrorless Camera Kit",
            brand="Canon",
            price=715.89,
            url="https://www.amazon.com/dp/B0FP496DLW",
            platform="amazon",
            seller_name="Camera Photo Photo",
            rating=4.5,
            review_count=35,
        ),
        ProductCandidate(
            id="c003",
            name="ProShot 8K Ultra Camera AMAZING DEAL",
            brand="Unknown",
            price=29.99,
            url="https://www.amazon.com/dp/B0FAKE12345",
            platform="amazon",
            seller_name="BestDealzXtreme",
            rating=5.0,
            review_count=12000,
        ),
    ]

    state = SharedState(
        session_id="trust-test-001",
        user_query="mirrorless camera for travel",
        candidates=candidates,
        status="analyzing",
    )

    agent = TrustAgent()
    print(f"\nRunning TrustAgent on {len(candidates)} candidates...\n")
    result = await agent.run(state)

    trust_scores = result.get("trust_scores", {})
    print(f"--- Results: {len(trust_scores)} trust scores ---\n")

    for cid, score in trust_scores.items():
        c = next((x for x in candidates if x.id == cid), None)
        name = c.name[:50] if c else cid
        print(f"  [{cid}] {name}")
        print(f"    Overall: {score.overall_score}/100")
        print(f"    Seller:  {score.seller_score}/100")
        print(f"    Reviews: {score.review_authenticity_score}/100")
        print(f"    Legit:   {score.product_legitimacy_score}/100")
        if score.flags:
            for f in score.flags:
                print(f"    FLAG [{f.severity}] {f.category}: {f.description}")
        print(f"    Reasoning: {score.reasoning[:200]}...")
        print(f"    Sources: {score.sources_checked[:3]}")
        print()

    # Check if we got real or mock data
    mock_count = sum(
        1 for s in trust_scores.values() if "Mock" in s.reasoning
    )
    if mock_count == len(trust_scores):
        print(">>> Data source: MOCK (all scores are mock)")
    elif mock_count > 0:
        print(f">>> Data source: MIXED ({len(trust_scores) - mock_count} real, {mock_count} mock)")
    else:
        print(">>> Data source: REAL API (all scores from Perplexity Sonar)")


if __name__ == "__main__":
    asyncio.run(main())
