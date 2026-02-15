"""Tests for LangGraph graph compilation, routing, and conditional edges."""

from models.state import SharedState
from models.requirements import ProductRequirements
from orchestrator.graph import (
    build_graph,
    compile_graph,
    should_continue_intent,
)


def test_graph_builds():
    """Graph should have 4 nodes: intent, search, analyze, rank."""
    graph = build_graph()
    assert "intent" in graph.nodes
    assert "search" in graph.nodes
    assert "analyze" in graph.nodes
    assert "rank" in graph.nodes
    # negotiate is no longer an automatic pipeline node
    assert "negotiate" not in graph.nodes


def test_graph_has_four_nodes():
    """Verify exactly 4 nodes in the graph."""
    graph = build_graph()
    assert len(graph.nodes) == 4


def test_graph_compiles():
    app, checkpointer = compile_graph(interrupt_before_intent=False)
    assert app is not None
    assert checkpointer is not None


def test_should_continue_intent_continue():
    state = SharedState(
        session_id="test",
        user_query="camera",
        requirements_finalized=False,
    )
    assert should_continue_intent(state) == "continue"


def test_should_continue_intent_done():
    state = SharedState(
        session_id="test",
        user_query="camera",
        requirements_finalized=True,
        requirements=ProductRequirements(
            category="camera",
            description="test",
            must_have=[],
            use_case="test",
        ),
    )
    assert should_continue_intent(state) == "done"
