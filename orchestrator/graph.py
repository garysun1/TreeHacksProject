"""LangGraph StateGraph definition for the Vetted pipeline."""

import logging
from typing import Literal

from langgraph.checkpoint.memory import MemorySaver
from langgraph.graph import END, StateGraph

from models.state import SharedState
from orchestrator.nodes import (
    analyze_node,
    intent_node,
    rank_candidates_node,
    search_node,
)

logger = logging.getLogger(__name__)


def should_continue_intent(state: SharedState) -> Literal["continue", "done"]:
    """Route after intent node: loop for more conversation or proceed to search.

    Returns 'done' when requirements have been finalized, 'continue' otherwise.
    """
    if state.requirements_finalized and state.requirements is not None:
        return "done"
    return "continue"


def build_graph() -> StateGraph:
    """Construct the Vetted pipeline graph.

    Graph structure (4 nodes):
        START -> intent (loops until requirements finalized)
              -> search
              -> analyze (trust + price in parallel)
              -> rank
              -> END

    Negotiation is handled on-demand via a separate API endpoint,
    not as an automatic pipeline step.

    Returns:
        Configured StateGraph (not yet compiled).
    """
    graph = StateGraph(SharedState)

    # Add nodes (4 total: intent, search, analyze, rank)
    graph.add_node("intent", intent_node)
    graph.add_node("search", search_node)
    graph.add_node("analyze", analyze_node)
    graph.add_node("rank", rank_candidates_node)

    # Set entry point
    graph.set_entry_point("intent")

    # Intent loops until requirements are finalized
    graph.add_conditional_edges(
        "intent",
        should_continue_intent,
        {"continue": "intent", "done": "search"},
    )

    # Linear flow: search -> analyze -> rank -> END
    graph.add_edge("search", "analyze")
    graph.add_edge("analyze", "rank")
    graph.add_edge("rank", END)

    return graph


def compile_graph(interrupt_before_intent: bool = True) -> tuple:
    """Build and compile the graph with checkpointing.

    Args:
        interrupt_before_intent: If True, interrupt before intent node
            for human-in-the-loop conversation flow.

    Returns:
        Tuple of (compiled_app, checkpointer).
    """
    graph = build_graph()
    checkpointer = MemorySaver()

    interrupt = ["intent"] if interrupt_before_intent else []
    app = graph.compile(
        checkpointer=checkpointer,
        interrupt_before=interrupt,
    )

    logger.info("Graph compiled with %d nodes", len(graph.nodes))
    return app, checkpointer
