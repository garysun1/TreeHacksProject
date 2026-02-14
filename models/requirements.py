"""ProductRequirements model — output of the Intent Agent."""

from typing import Literal, Optional

from pydantic import BaseModel, Field


class ProductRequirements(BaseModel):
    """Structured product requirements synthesized from user conversation."""

    category: str = Field(description="Product category, e.g. 'camera', 'laptop'")
    description: str = Field(description="Natural language summary of what the user wants")
    must_have: list[str] = Field(default_factory=list, description="Non-negotiable features")
    nice_to_have: list[str] = Field(default_factory=list, description="Preferred but not required")
    dealbreakers: list[str] = Field(default_factory=list, description="Things to absolutely avoid")
    budget_min: Optional[float] = Field(default=None, description="Minimum budget in USD")
    budget_max: Optional[float] = Field(default=None, description="Maximum budget in USD")
    brand_preferences: list[str] = Field(default_factory=list, description="Preferred brands")
    brand_exclusions: list[str] = Field(default_factory=list, description="Brands to avoid")
    use_case: str = Field(default="", description="Primary use case description")
    urgency: Literal["immediate", "this_week", "this_month", "no_rush"] = "no_rush"
    condition: Literal["new", "refurbished", "used", "any"] = "new"
    priority_weights: dict[str, float] = Field(
        default_factory=lambda: {
            "price": 0.25,
            "quality": 0.30,
            "brand": 0.15,
            "reviews": 0.30,
        },
        description="Weighted priorities that sum to ~1.0",
    )
