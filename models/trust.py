"""TrustScore model — output of the Trust Agent."""

from typing import Literal

from pydantic import BaseModel, Field


class TrustFlag(BaseModel):
    """A warning or red flag about a product or seller."""

    severity: Literal["info", "warning", "critical"]
    category: str = Field(description="e.g. 'fake_reviews', 'counterfeit_risk', 'seller_history'")
    description: str


class TrustScore(BaseModel):
    """Trust verification results for a product candidate."""

    candidate_id: str
    overall_score: float = Field(ge=0, le=100, description="Overall trust score 0-100")
    seller_score: float = Field(ge=0, le=100)
    review_authenticity_score: float = Field(ge=0, le=100)
    product_legitimacy_score: float = Field(ge=0, le=100)
    flags: list[TrustFlag] = Field(default_factory=list)
    reasoning: str = Field(description="Detailed explanation of the score")
    sources_checked: list[str] = Field(default_factory=list)
