"""FastAPI REST endpoints for the ShopAgent API."""

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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


@router.post("/sessions/{session_id}/search")
async def trigger_search(session_id: str) -> dict[str, Any]:
    """Trigger the full search pipeline (after intent is finalized).

    Runs search -> analyze -> rank -> negotiate (if enabled).
    """
    state = pipeline.get_session(session_id)
    if not state:
        raise HTTPException(status_code=404, detail="Session not found")
    if not state.requirements:
        raise HTTPException(status_code=400, detail="Requirements not yet finalized")

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
