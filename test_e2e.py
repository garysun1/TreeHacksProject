"""End-to-end test — runs the full ShopAgent pipeline from intent through negotiation."""

import asyncio
import logging
import time
from pathlib import Path

from dotenv import load_dotenv

# Load .env before any config imports
load_dotenv(Path(__file__).parent / ".env")

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph

from config import settings
from models.requirements import ProductRequirements
from models.state import SharedState
from orchestrator.nodes import (
    analyze_node,
    negotiate_node,
    rank_candidates_node,
    search_node,
)


def _compile_graph_skip_intent():
    """Build a graph that skips intent and starts at search."""
    graph = StateGraph(SharedState)
    graph.add_node("search", search_node)
    graph.add_node("analyze", analyze_node)
    graph.add_node("rank", rank_candidates_node)
    graph.add_node("negotiate", negotiate_node)
    graph.set_entry_point("search")
    graph.add_edge("search", "analyze")
    graph.add_edge("analyze", "rank")
    graph.add_edge("rank", "negotiate")
    graph.add_edge("negotiate", END)
    checkpointer = MemorySaver()
    return graph.compile(checkpointer=checkpointer), checkpointer

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger("test_e2e")

USER_QUERY = (
    "I need a good mirrorless camera for travel, budget $500-800, "
    "preferably Sony or Fujifilm"
)

# Pre-built requirements so we skip the multi-turn intent conversation
PRE_BUILT_REQUIREMENTS = ProductRequirements(
    category="camera",
    description=USER_QUERY,
    must_have=["mirrorless", "lightweight", "good autofocus"],
    nice_to_have=["4K video", "weather sealed", "in-body stabilization", "USB-C charging"],
    dealbreakers=["DSLR", "no viewfinder"],
    budget_min=500.0,
    budget_max=800.0,
    brand_preferences=["Sony", "Fujifilm"],
    brand_exclusions=[],
    use_case="travel photography",
    urgency="this_month",
    condition="new",
    priority_weights={
        "price": 0.25,
        "quality": 0.30,
        "brand": 0.20,
        "reviews": 0.25,
    },
)

SEPARATOR = "=" * 70


def _api_status() -> dict[str, str]:
    """Check which API keys are configured."""
    return {
        "Anthropic (Claude)": "configured" if settings.anthropic_api_key else "MISSING",
        "Bright Data": "configured" if settings.brightdata_api_key else "MISSING — will use mock",
        "Perplexity Sonar": "configured" if settings.perplexity_api_key else "MISSING — will use mock",
        "OpenAI (GPT-4o)": "configured" if settings.openai_api_key else "MISSING — will use mock",
    }


async def main() -> None:
    t_start = time.perf_counter()

    # ── API key status ──────────────────────────────────────────────────
    print(f"\n{SEPARATOR}")
    print("  ShopAgent End-to-End Pipeline Test")
    print(SEPARATOR)
    api = _api_status()
    print("\nAPI key status:")
    for name, status in api.items():
        print(f"  {name:25s} {status}")

    # ── Build initial state with pre-injected requirements ──────────────
    state = SharedState(
        session_id="e2e-test",
        user_query=USER_QUERY,
        requirements=PRE_BUILT_REQUIREMENTS,
        requirements_finalized=True,      # skip intent multi-turn loop
        enable_negotiation=True,
        conversation_history=[
            {"role": "user", "content": USER_QUERY},
            {"role": "assistant", "content": "Requirements pre-loaded for E2E test."},
        ],
    )

    # ── 1. INTENT (skipped — pre-built) ────────────────────────────────
    t_intent = time.perf_counter()
    print(f"\n{SEPARATOR}")
    print("  STAGE 1: INTENT  (pre-built — skipping multi-turn conversation)")
    print(SEPARATOR)
    reqs = state.requirements
    print(f"  Category       : {reqs.category}")
    print(f"  Description    : {reqs.description}")
    print(f"  Must-have      : {', '.join(reqs.must_have)}")
    print(f"  Nice-to-have   : {', '.join(reqs.nice_to_have)}")
    print(f"  Dealbreakers   : {', '.join(reqs.dealbreakers)}")
    print(f"  Budget         : ${reqs.budget_min:.0f} – ${reqs.budget_max:.0f}")
    print(f"  Brands         : {', '.join(reqs.brand_preferences)}")
    print(f"  Use case       : {reqs.use_case}")
    print(f"  Urgency        : {reqs.urgency}")
    print(f"  Condition      : {reqs.condition}")
    print(f"  Weights        : {reqs.priority_weights}")
    print(f"  Data source    : PRE-BUILT (no API call)")
    dt_intent = time.perf_counter() - t_intent

    # ── Compile graph that skips intent (starts at search) ─────────────
    app, _ = _compile_graph_skip_intent()
    config = {"configurable": {"thread_id": "e2e-test"}}

    # ── Run the full graph ──────────────────────────────────────────────
    print(f"\n  Running full pipeline …\n")
    result = await app.ainvoke(state.model_dump(), config=config)
    final = SharedState(**result)

    t_after_pipeline = time.perf_counter()

    # ── 2. SEARCH ──────────────────────────────────────────────────────
    print(f"\n{SEPARATOR}")
    print("  STAGE 2: SEARCH")
    print(SEPARATOR)
    candidates = final.candidates
    print(f"  Candidates found: {len(candidates)}")
    uses_real_bright_data = bool(settings.brightdata_api_key)
    print(f"  Data source     : {'Bright Data API' if uses_real_bright_data else 'MOCK fallback'}")
    if candidates:
        print(f"\n  Top 3 candidates:")
        for i, c in enumerate(candidates[:3], 1):
            print(f"    {i}. {c.name}")
            print(f"       Brand: {c.brand}  |  Price: ${c.price:.2f}  |  Platform: {c.platform}")
            print(f"       Rating: {c.rating}/5 ({c.review_count} reviews)  |  Seller: {c.seller_name}")

    # ── 3. TRUST ───────────────────────────────────────────────────────
    print(f"\n{SEPARATOR}")
    print("  STAGE 3: TRUST")
    print(SEPARATOR)
    uses_real_perplexity = bool(settings.perplexity_api_key)
    print(f"  Data source: {'Perplexity Sonar API' if uses_real_perplexity else 'MOCK fallback'}")
    for cid, ts in final.trust_scores.items():
        # Find candidate name
        cname = next((c.name for c in candidates if c.id == cid), cid)
        flag_summary = ""
        if ts.flags:
            flag_summary = " | Flags: " + ", ".join(
                f"[{f.severity}] {f.category}" for f in ts.flags
            )
        print(
            f"  {cname[:50]:50s}  "
            f"overall={ts.overall_score:5.1f}  seller={ts.seller_score:5.1f}  "
            f"reviews={ts.review_authenticity_score:5.1f}  legit={ts.product_legitimacy_score:5.1f}"
            f"{flag_summary}"
        )

    # ── 4. PRICE ───────────────────────────────────────────────────────
    print(f"\n{SEPARATOR}")
    print("  STAGE 4: PRICE")
    print(SEPARATOR)
    print(f"  Data source: {'Perplexity Sonar API' if uses_real_perplexity else 'MOCK fallback'}")
    for cid, pa in final.price_analyses.items():
        cname = next((c.name for c in candidates if c.id == cid), cid)
        print(
            f"  {cname[:50]:50s}  "
            f"deal={pa.deal_quality_score:5.1f}  current=${pa.current_price:7.2f}  "
            f"effective=${pa.effective_price:7.2f}  savings=${pa.total_savings_potential:6.2f}"
        )

    # ── 5. RANKING ─────────────────────────────────────────────────────
    print(f"\n{SEPARATOR}")
    print("  STAGE 5: RANKING")
    print(SEPARATOR)
    print(f"  Data source: computed from trust + price scores")
    for rc in final.ranked_candidates:
        c = rc.candidate
        print(
            f"  #{rc.rank:2d}  {c.name[:50]:50s}  "
            f"score={rc.composite_score:5.1f}  ${c.price:.2f}"
        )

    # ── 6. NEGOTIATION ─────────────────────────────────────────────────
    print(f"\n{SEPARATOR}")
    print("  STAGE 6: NEGOTIATION")
    print(SEPARATOR)
    uses_real_openai = bool(settings.openai_api_key)
    print(f"  Data source: {'OpenAI GPT-4o' if uses_real_openai else 'MOCK fallback'}")
    for cid, nr in final.negotiation_results.items():
        cname = next((c.name for c in candidates if c.id == cid), cid)
        proposed = f"${nr.negotiated_price:.2f}" if nr.negotiated_price else "N/A"
        savings = f"${nr.savings:.2f}" if nr.savings else "$0.00"
        print(f"\n  {cname[:60]}")
        print(f"    Strategy : {nr.strategy_used}")
        print(f"    Original : ${nr.original_price:.2f}")
        print(f"    Proposed : {proposed}")
        print(f"    Savings  : {savings}")
        print(f"    Viable   : {nr.success}")
        print(f"    Reasoning: {nr.reasoning[:120]}")
        if nr.next_steps:
            print(f"    Next steps:")
            for step in nr.next_steps[:3]:
                print(f"      - {step}")

    # ── ERRORS ─────────────────────────────────────────────────────────
    if final.errors:
        print(f"\n{SEPARATOR}")
        print("  ERRORS")
        print(SEPARATOR)
        for err in final.errors:
            print(f"  [{err.agent}] {err.error_type}: {err.message}")

    # ── SUMMARY ────────────────────────────────────────────────────────
    t_total = time.perf_counter() - t_start
    print(f"\n{SEPARATOR}")
    print("  PIPELINE SUMMARY")
    print(SEPARATOR)
    print(f"  Total candidates searched : {len(final.candidates)}")
    print(f"  Trust scores computed     : {len(final.trust_scores)}")
    print(f"  Price analyses computed   : {len(final.price_analyses)}")
    print(f"  Ranked candidates         : {len(final.ranked_candidates)}")
    print(f"  Negotiation results       : {len(final.negotiation_results)}")
    print(f"  Errors                    : {len(final.errors)}")
    print(f"  Final status              : {final.status}")
    print()
    print(f"  API usage:")
    print(f"    Intent       : PRE-BUILT (skipped)")
    print(f"    Search       : {'Bright Data' if uses_real_bright_data else 'Mock'}")
    print(f"    Trust        : {'Perplexity Sonar' if uses_real_perplexity else 'Mock'}")
    print(f"    Price        : {'Perplexity Sonar' if uses_real_perplexity else 'Mock'}")
    print(f"    Negotiation  : {'OpenAI GPT-4o' if uses_real_openai else 'Mock'}")
    print()
    print(f"  Total execution time: {t_total:.2f}s")
    print(SEPARATOR)
    print()


if __name__ == "__main__":
    asyncio.run(main())
