"""Quick end-to-end test for the SearchAgent."""

import asyncio
import logging
import sys

# Load .env before anything else imports settings
from dotenv import load_dotenv
load_dotenv()

from config import settings
from models.requirements import ProductRequirements
from models.state import SharedState
from agents.search_agent import SearchAgent

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


async def main() -> None:
    # 1. Check API key status
    has_bright = bool(settings.brightdata_api_key and settings.brightdata_api_key.strip())
    print(f"\n=== Search Agent E2E Test ===")
    print(f"Bright Data API key configured: {has_bright}")
    print(f"Bright Data zone: {settings.brightdata_zone or '(none)'}")
    print(f"Amazon search dataset ID: {settings.brightdata_amazon_search_dataset_id or '(none)'}")
    print(f"Amazon product dataset ID: {settings.brightdata_amazon_product_dataset_id or '(none)'}")
    print(f"Amazon reviews dataset ID: {settings.brightdata_amazon_reviews_dataset_id or '(none)'}")

    # 2. Build requirements
    reqs = ProductRequirements(
        category="mirrorless camera",
        description="mirrorless camera for travel photography",
        must_have=["mirrorless", "4K video"],
        nice_to_have=["image stabilization", "weather sealed", "compact"],
        dealbreakers=["DSLR only"],
        budget_min=None,
        budget_max=800.0,
        brand_preferences=["Sony", "Fujifilm"],
        brand_exclusions=[],
        use_case="travel photography",
        urgency="this_month",
        condition="new",
    )

    # 3. Minimal shared state
    state = SharedState(
        session_id="test-001",
        user_query="mirrorless camera, budget $500-800, Sony or Fujifilm, for travel photography",
        requirements=reqs,
        requirements_finalized=True,
        status="searching",
    )

    # 4. Run the search agent
    from agents.search_agent import _build_search_query
    print(f"\nBuilt search query: \"{_build_search_query(reqs)}\"")

    agent = SearchAgent()
    print("Running SearchAgent...")
    result = await agent.run(state)

    # 5. Print results
    candidates = result.get("candidates", [])
    print(f"\n--- Results ---")
    print(f"Status: {result.get('status')}")
    print(f"Candidates returned: {len(candidates)}")

    if result.get("errors"):
        print(f"Errors: {result['errors']}")

    for i, c in enumerate(candidates, 1):
        print(f"\n  {i}. {c.name}")
        print(f"     Brand: {c.brand} | Price: ${c.price:.2f} | Platform: {c.platform}")
        print(f"     Rating: {c.rating} | Reviews: {c.review_count}")
        print(f"     URL: {c.url}")
        if c.matched_requirements:
            print(f"     Matched reqs: {c.matched_requirements}")

    # 6. Detect mock vs real
    mock_indicators = sum(1 for c in candidates if "Mock" in c.name)
    if mock_indicators == len(candidates) and candidates:
        print(f"\n>>> Data source: MOCK (all {len(candidates)} candidates are mock data)")
    elif mock_indicators > 0:
        print(f"\n>>> Data source: MIXED ({len(candidates) - mock_indicators} real, {mock_indicators} mock fallback)")
    else:
        print(f"\n>>> Data source: REAL API (no mock candidates detected)")


if __name__ == "__main__":
    asyncio.run(main())
