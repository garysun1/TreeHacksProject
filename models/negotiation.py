"""NegotiationResult model — output of the Negotiation Agent."""

from typing import Optional

from pydantic import BaseModel, Field


class NegotiationResult(BaseModel):
    """Results of a negotiation attempt for a product candidate."""

    candidate_id: str
    strategy_used: str = Field(description="e.g. 'price_match', 'bundle_discount', 'direct_negotiation'")
    original_price: float
    negotiated_price: Optional[float] = None
    savings: Optional[float] = None
    success: bool = False
    conversation_log: list[dict] = Field(default_factory=list)
    reasoning: str = Field(description="Why this strategy was chosen")
    next_steps: list[str] = Field(default_factory=list, description="Actions for the user to take")
