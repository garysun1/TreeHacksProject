"""Tests for the Intent Agent."""

import pytest

from agents.intent_agent import IntentAgent
from models.state import SharedState


@pytest.mark.asyncio
async def test_intent_first_turn_asks_questions():
    agent = IntentAgent()
    state = SharedState(
        session_id="test-1",
        user_query="I need a good camera for travel",
    )
    result = await agent.run(state)
    assert result.get("requirements_finalized") is False
    assert len(result.get("conversation_history", [])) > 0
    # Should have an assistant message asking questions
    assistant_msgs = [
        m for m in result["conversation_history"] if m["role"] == "assistant"
    ]
    assert len(assistant_msgs) >= 1


@pytest.mark.asyncio
async def test_intent_second_turn_finalizes():
    agent = IntentAgent()
    state = SharedState(
        session_id="test-2",
        user_query="I need a camera under $800",
        conversation_history=[
            {"role": "user", "content": "I need a camera under $800"},
            {"role": "assistant", "content": "What's your budget?"},
            {"role": "user", "content": "Under $800, prefer Sony, need it this week"},
        ],
    )
    result = await agent.run(state)
    assert result.get("requirements_finalized") is True
    assert result.get("requirements") is not None
    assert result["requirements"].category == "camera"
    assert result["requirements"].budget_max == 800.0
