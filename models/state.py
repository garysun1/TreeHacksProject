"""SharedState — the central state object passed through the LangGraph pipeline."""

from datetime import datetime, timezone
from typing import Annotated, Literal, Optional

from pydantic import BaseModel, Field

from models.requirements import ProductRequirements
from models.candidates import ProductCandidate
from models.trust import TrustScore
from models.price import PriceAnalysis
from models.negotiation import NegotiationResult


class AgentError(BaseModel):
    """An error that occurred during pipeline execution."""

    agent: str
    error_type: str
    message: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RankedCandidate(BaseModel):
    """A product candidate with its final composite score."""

    candidate: ProductCandidate
    trust_score: Optional[TrustScore] = None
    price_analysis: Optional[PriceAnalysis] = None
    negotiation_result: Optional[NegotiationResult] = None
    composite_score: float = Field(ge=0, le=100, description="Final weighted score")
    rank: int = Field(ge=1)


def _merge_list(left: list, right: list) -> list:
    """Reducer that concatenates lists for LangGraph state updates."""
    return left + right


def _merge_dict(left: dict, right: dict) -> dict:
    """Reducer that merges dicts for LangGraph state updates."""
    merged = {**left}
    merged.update(right)
    return merged


class SharedState(BaseModel):
    """Central state object for the Vetted pipeline.

    Used as the LangGraph StateGraph schema. Fields use Annotated reducers
    so that node returns are merged properly.
    """

    session_id: str = ""
    # "negotiating" is not part of the automatic pipeline flow — it's set
    # only when an on-demand negotiation request is in progress.
    status: Literal[
        "intent", "searching", "analyzing", "negotiating", "complete", "error"
    ] = "intent"
    user_query: str = ""
    conversation_history: Annotated[list[dict], _merge_list] = Field(default_factory=list)
    requirements: Optional[ProductRequirements] = None
    requirements_finalized: bool = False
    candidates: Annotated[list[ProductCandidate], _merge_list] = Field(default_factory=list)
    trust_scores: Annotated[dict[str, TrustScore], _merge_dict] = Field(default_factory=dict)
    price_analyses: Annotated[dict[str, PriceAnalysis], _merge_dict] = Field(default_factory=dict)
    ranked_candidates: list[RankedCandidate] = Field(default_factory=list)
    negotiation_results: Annotated[dict[str, NegotiationResult], _merge_dict] = Field(
        default_factory=dict
    )
    errors: Annotated[list[AgentError], _merge_list] = Field(default_factory=list)
    enable_negotiation: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
