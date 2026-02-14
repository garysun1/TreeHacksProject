"""Tests for the pipeline runner."""

import pytest

from orchestrator.pipeline import PipelineRunner


@pytest.mark.asyncio
async def test_create_session():
    runner = PipelineRunner()
    session_id = runner.create_session("I need a camera under $500")
    assert session_id is not None
    state = runner.get_session(session_id)
    assert state is not None
    assert state.user_query == "I need a camera under $500"
    assert state.status == "intent"


@pytest.mark.asyncio
async def test_get_nonexistent_session():
    runner = PipelineRunner()
    assert runner.get_session("nonexistent") is None
