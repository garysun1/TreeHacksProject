"""PriceAnalysis model — output of the Price Intelligence Agent."""

from typing import Literal, Optional

from pydantic import BaseModel, Field


class PriceHistory(BaseModel):
    """Historical pricing data for a product."""

    lowest_price: float
    highest_price: float
    average_price: float
    lowest_price_date: Optional[str] = None
    price_trend: Literal["rising", "falling", "stable", "volatile"]


class CompetitorPrice(BaseModel):
    """Price for the same product on a different platform."""

    platform: str
    price: float
    url: str
    in_stock: bool


class Coupon(BaseModel):
    """A coupon or promo code."""

    code: str
    description: str
    discount_amount: Optional[float] = None
    discount_percent: Optional[float] = None
    verified: bool = False
    source: str


class CashbackOption(BaseModel):
    """A cashback opportunity for the purchase."""

    provider: str = Field(description="e.g. 'Rakuten', 'TopCashback'")
    cashback_percent: float
    url: str


class PriceAnalysis(BaseModel):
    """Price intelligence results for a product candidate."""

    candidate_id: str
    current_price: float
    deal_quality_score: float = Field(ge=0, le=100, description="0=terrible deal, 100=amazing deal")
    price_history: Optional[PriceHistory] = None
    competitor_prices: list[CompetitorPrice] = Field(default_factory=list)
    available_coupons: list[Coupon] = Field(default_factory=list)
    cashback_options: list[CashbackOption] = Field(default_factory=list)
    price_prediction: Optional[str] = None
    total_savings_potential: float = 0.0
    effective_price: float = Field(description="Price after best available savings")
    reasoning: str = ""
