"""Tests for the Search Agent."""

import pytest

from agents.search_agent import SearchAgent
from models.requirements import ProductRequirements
from models.state import SharedState


@pytest.mark.asyncio
async def test_search_returns_candidates():
    agent = SearchAgent()
    state = SharedState(
        session_id="test-search",
        user_query="travel camera",
        requirements=ProductRequirements(
            category="camera",
            description="lightweight travel camera",
            must_have=["lightweight", "good autofocus"],
            use_case="travel photography",
            budget_max=800.0,
        ),
    )
    result = await agent.run(state)
    candidates = result.get("candidates", [])
    assert len(candidates) > 0
    # All candidates should be within budget
    for c in candidates:
        assert c.price <= 800.0
    assert result.get("status") == "analyzing"


@pytest.mark.asyncio
async def test_search_without_requirements_errors():
    agent = SearchAgent()
    state = SharedState(session_id="test-no-req", user_query="camera")
    result = await agent.run(state)
    assert result.get("status") == "error"
