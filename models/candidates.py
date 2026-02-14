"""ProductCandidate model — output of the Search Agent."""

from typing import Optional

from pydantic import BaseModel, Field


class ProductCandidate(BaseModel):
    """A product found by the Search Agent."""

    id: str = Field(description="Generated unique ID")
    name: str
    brand: str
    price: float
    currency: str = "USD"
    url: str
    platform: str = Field(description="Source platform, e.g. 'amazon', 'walmart'")
    seller_name: str
    seller_url: Optional[str] = None
    image_urls: list[str] = Field(default_factory=list)
    rating: Optional[float] = Field(default=None, description="Platform rating 0-5")
    review_count: Optional[int] = None
    review_snippets: list[str] = Field(default_factory=list)
    specifications: dict[str, str] = Field(default_factory=dict)
    availability: str = "in_stock"
    shipping_info: Optional[str] = None
    return_policy: Optional[str] = None
    matched_requirements: list[str] = Field(default_factory=list)
    missing_requirements: list[str] = Field(default_factory=list)
