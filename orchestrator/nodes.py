"""LangGraph node wrapper functions that call each agent's run() method."""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from agents.intent_agent import IntentAgent
from agents.negotiation_agent import NegotiationAgent
from agents.price_agent import PriceAgent
from agents.search_agent import SearchAgent
from agents.trust_agent import TrustAgent
from models.state import SharedState
from orchestrator.ranking import rank_candidates

logger = logging.getLogger(__name__)

# Singleton agent instances
_intent_agent = IntentAgent()
_search_agent = SearchAgent()
_trust_agent = TrustAgent()
_price_agent = PriceAgent()
_negotiation_agent = NegotiationAgent()


async def intent_node(state: SharedState) -> dict[str, Any]:
    """Node: run the intent agent for one conversation turn."""
    return await _intent_agent.run(state)


async def search_node(state: SharedState) -> dict[str, Any]:
    """Node: run the search agent to find product candidates."""
    return await _search_agent.run(state)


async def analyze_node(state: SharedState) -> dict[str, Any]:
    """Node: run trust + price agents in parallel, merge results."""
    trust_result, price_result = await asyncio.gather(
        _trust_agent.run(state),
        _price_agent.run(state),
    )
    # Merge both results into a single state update
    merged: dict[str, Any] = {}
    for result in [trust_result, price_result]:
        for key, value in result.items():
            if key in merged and isinstance(value, dict):
                merged[key].update(value)
            elif key in merged and isinstance(value, list):
                merged[key].extend(value)
            else:
                merged[key] = value
    return merged


async def rank_candidates_node(state: SharedState) -> dict[str, Any]:
    """Node: rank candidates using trust + price analysis."""
    ranked = rank_candidates(state)
    return {
        "ranked_candidates": ranked,
        "status": "negotiating" if state.enable_negotiation else "complete",
        "updated_at": datetime.now(timezone.utc),
    }


async def negotiate_node(state: SharedState) -> dict[str, Any]:
    """Node: run the negotiation agent on top candidates."""
    return await _negotiation_agent.run(state)
