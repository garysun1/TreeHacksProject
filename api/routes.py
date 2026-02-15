"""FastAPI REST endpoints for the Vetted API."""

import logging
import re
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from agents.negotiation_agent import NegotiationAgent
from models.requirements import ProductRequirements
from orchestrator.pipeline import pipeline

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api")


# ── Request / Response schemas ──────────────────────────────────────


class CreateSessionRequest(BaseModel):
    """Request body for creating a new session."""
    query: str
    enable_negotiation: bool = True


class CreateSessionResponse(BaseModel):
    """Response after creating a session."""
    session_id: str
    status: str
    message: str


class SendMessageRequest(BaseModel):
    """Request body for sending a message to the intent agent."""
    message: str


# ── Endpoints ───────────────────────────────────────────────────────


@router.post("/sessions", response_model=CreateSessionResponse)
async def create_session(req: CreateSessionRequest) -> CreateSessionResponse:
    """Create a new shopping session and start the intent conversation.

    The pipeline begins at the intent agent, which will ask clarifying questions.
    """
    session_id = pipeline.create_session(req.query, req.enable_negotiation)

    # Run until first interrupt (intent agent asks first question)
    state = await pipeline.start(session_id)

    last_msg = ""
    if state.conversation_history:
        for turn in reversed(state.conversation_history):
            if turn.get("role") == "assistant":
                last_msg = turn.get("content", "")
                break

    return CreateSessionResponse(
        session_id=session_id,
        status=state.status,
        message=last_msg,
    )


@router.post("/sessions/{session_id}/message")
async def send_message(session_id: str, req: SendMessageRequest) -> dict[str, Any]:
    """Send a message to the intent agent for multi-turn conversation.

    Once requirements are finalized, the pipeline automatically proceeds.
    """
    state = pipeline.get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    updated = await pipeline.resume_with_message(session_id, req.message)

    last_msg = ""
    if updated.conversation_history:
        for turn in reversed(updated.conversation_history):
            if turn.get("role") == "assistant":
                last_msg = turn.get("content", "")
                break

    return {
        "session_id": session_id,
        "status": updated.status,
        "message": last_msg,
        "requirements_finalized": updated.requirements_finalized,
        "requirements": updated.requirements.model_dump() if updated.requirements else None,
    }


def _auto_requirements(query: str) -> ProductRequirements:
    """Generate basic ProductRequirements from a raw user query.

    Used as a fallback when the intent agent hasn't finalized requirements
    (e.g. the frontend skipped the multi-turn conversation).
    """
    q = query.lower()

    # Try to extract a budget
    budget_max = None
    price_match = re.search(r"\$\s?(\d[\d,]*)", query)
    if price_match:
        budget_max = float(price_match.group(1).replace(",", ""))
    elif re.search(r"under\s+(\d[\d,]*)", q):
        m = re.search(r"under\s+(\d[\d,]*)", q)
        if m:
            budget_max = float(m.group(1).replace(",", ""))

    # Use the full query as description; the search agent will
    # build proper search queries from it.
    return ProductRequirements(
        category=query,
        description=query,
        must_have=[],
        nice_to_have=[],
        dealbreakers=[],
        budget_min=None,
        budget_max=budget_max,
        brand_preferences=[],
        brand_exclusions=[],
        use_case=query,
        urgency="no_rush",
        condition="any",
    )


@router.post("/sessions/{session_id}/search")
async def trigger_search(session_id: str) -> dict[str, Any]:
    """Trigger the full search pipeline.

    If requirements haven't been finalized by the intent agent, auto-generates
    basic requirements from the original user query so the pipeline can proceed.
    """
    state = pipeline.get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    # Auto-generate requirements if intent agent hasn't finalized them
    if not state.requirements:
        logger.info(
            "Session %s: requirements not finalized, auto-generating from query: %s",
            session_id,
            state.user_query[:80],
        )
        state.requirements = _auto_requirements(state.user_query)
        state.requirements_finalized = True
        pipeline.sessions[session_id] = state

    updated = await pipeline.run_full_pipeline(session_id)
    return {
        "session_id": session_id,
        "status": updated.status,
        "candidates_found": len(updated.candidates),
        "ranked_count": len(updated.ranked_candidates),
    }


@router.get("/sessions/{session_id}")
async def get_session(session_id: str) -> dict[str, Any]:
    """Get the full current state of a session."""
    state = pipeline.get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return state.model_dump(mode="json")


@router.get("/sessions/{session_id}/candidates")
async def get_candidates(session_id: str) -> dict[str, Any]:
    """Get ranked candidates with all analysis data."""
    state = pipeline.get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session_id,
        "status": state.status,
        "ranked_candidates": [rc.model_dump(mode="json") for rc in state.ranked_candidates],
        "negotiation_results": {
            k: v.model_dump(mode="json") for k, v in state.negotiation_results.items()
        },
    }


# ── On-demand negotiation & savings endpoints ────────────────────────

# Reuse the singleton from nodes.py so we share the OpenAI client
from orchestrator.nodes import _negotiation_agent


@router.post("/sessions/{session_id}/negotiate/{candidate_id}")
async def negotiate_candidate(session_id: str, candidate_id: str) -> dict[str, Any]:
    """Run the negotiation agent for a single candidate on-demand.

    Only makes sense for marketplace listings (facebook_marketplace, craigslist,
    etc.). For retail platforms the price agent data already has coupons/cashback
    — use the /savings/ endpoint instead.
    """
    state = pipeline.get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    # Find the candidate in ranked results
    candidate = None
    for rc in state.ranked_candidates:
        if rc.candidate.id == candidate_id:
            candidate = rc.candidate
            break

    # Fall back to raw candidates list
    if candidate is None:
        for c in state.candidates:
            if c.id == candidate_id:
                candidate = c
                break

    if candidate is None:
        raise HTTPException(status_code=404, detail="Candidate not found")

    trust_score = state.trust_scores.get(candidate_id)
    price_analysis = state.price_analyses.get(candidate_id)

    result = await _negotiation_agent.negotiate_single(
        candidate, trust_score, price_analysis
    )

    # Store the result in session state
    state.negotiation_results[candidate_id] = result
    pipeline.sessions[session_id] = state

    return result.model_dump(mode="json")


@router.get("/sessions/{session_id}/savings/{candidate_id}")
async def get_savings_detail(session_id: str, candidate_id: str) -> dict[str, Any]:
    """Get detailed savings breakdown for a candidate.

    Surfaces the price agent's existing data in a more actionable format.
    No new agent call needed — just reformats existing PriceAnalysis data.
    """
    state = pipeline.get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")

    price_analysis = state.price_analyses.get(candidate_id)
    if price_analysis is None:
        raise HTTPException(
            status_code=404,
            detail="Price analysis not found for this candidate",
        )

    cheapest_competitor = None
    if price_analysis.competitor_prices:
        cheapest = min(price_analysis.competitor_prices, key=lambda x: x.price)
        cheapest_competitor = {
            "platform": cheapest.platform,
            "price": cheapest.price,
            "url": cheapest.url,
            "in_stock": cheapest.in_stock,
        }

    return {
        "candidate_id": candidate_id,
        "current_price": price_analysis.current_price,
        "effective_price": price_analysis.effective_price,
        "total_savings": price_analysis.total_savings_potential,
        "coupons": [
            {
                "code": c.code,
                "description": c.description,
                "discount": c.discount_amount or c.discount_percent,
                "verified": c.verified,
            }
            for c in price_analysis.available_coupons
        ],
        "cashback": [
            {
                "provider": cb.provider,
                "percent": cb.cashback_percent,
                "url": cb.url,
            }
            for cb in price_analysis.cashback_options
        ],
        "competitor_prices": [
            {
                "platform": cp.platform,
                "price": cp.price,
                "url": cp.url,
                "in_stock": cp.in_stock,
            }
            for cp in price_analysis.competitor_prices
        ],
        "price_match_eligible": any(
            cp.price < price_analysis.current_price and cp.in_stock
            for cp in price_analysis.competitor_prices
        ),
        "cheapest_competitor": cheapest_competitor,
        "price_history": {
            "lowest": price_analysis.price_history.lowest_price if price_analysis.price_history else None,
            "average": price_analysis.price_history.average_price if price_analysis.price_history else None,
            "trend": price_analysis.price_history.price_trend if price_analysis.price_history else None,
        },
        "price_prediction": price_analysis.price_prediction,
        "deal_quality_score": price_analysis.deal_quality_score,
    }
