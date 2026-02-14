"""Pydantic v2 data models for ShopAgent pipeline."""

from models.requirements import ProductRequirements
from models.candidates import ProductCandidate
from models.trust import TrustScore, TrustFlag
from models.price import (
    PriceAnalysis,
    PriceHistory,
    CompetitorPrice,
    Coupon,
    CashbackOption,
)
from models.negotiation import NegotiationResult
from models.state import SharedState, AgentError, RankedCandidate

__all__ = [
    "ProductRequirements",
    "ProductCandidate",
    "TrustScore",
    "TrustFlag",
    "PriceAnalysis",
    "PriceHistory",
    "CompetitorPrice",
    "Coupon",
    "CashbackOption",
    "NegotiationResult",
    "SharedState",
    "AgentError",
    "RankedCandidate",
]
