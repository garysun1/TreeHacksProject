"""Pipeline runner — manages sessions, runs the graph, and handles streaming."""

import logging
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncGenerator

from models.state import SharedState
from orchestrator.graph import compile_graph

logger = logging.getLogger(__name__)


class PipelineRunner:
    """Manages the LangGraph pipeline lifecycle.

    Handles session creation, graph execution, human-in-the-loop resume,
    and streaming of status updates.
    """

    def __init__(self) -> None:
        self.app, self.checkpointer = compile_graph(interrupt_before_intent=True)
        self.sessions: dict[str, SharedState] = {}

    def create_session(self, user_query: str, enable_negotiation: bool = True) -> str:
        """Create a new shopping session.

        Args:
            user_query: Initial user message.
            enable_negotiation: Kept for API compatibility. Negotiation is now
                on-demand and no longer part of the automatic pipeline.

        Returns:
            Session ID string.
        """
        session_id = str(uuid.uuid4())[:12]
        now = datetime.now(timezone.utc)
        state = SharedState(
            session_id=session_id,
            user_query=user_query,
            enable_negotiation=enable_negotiation,
            created_at=now,
            updated_at=now,
        )
        self.sessions[session_id] = state
        logger.info("Created session %s", session_id)
        return session_id

    def get_session(self, session_id: str) -> SharedState | None:
        """Get the current state for a session."""
        return self.sessions.get(session_id)

    async def start(self, session_id: str) -> SharedState:
        """Start the pipeline for a session. Runs until first interrupt.

        Args:
            session_id: Session to start.

        Returns:
            Updated SharedState after the intent node's first turn.
        """
        state = self.sessions.get(session_id)
        if not state:
            raise ValueError(f"Session {session_id} not found")

        config = {"configurable": {"thread_id": session_id}}
        input_state = state.model_dump()

        # Run until interrupt (before intent node on second+ turns)
        result = await self.app.ainvoke(input_state, config=config)
        updated = SharedState(**result) if isinstance(result, dict) else result
        self.sessions[session_id] = updated
        return updated

    async def resume_with_message(
        self, session_id: str, user_message: str
    ) -> SharedState:
        """Resume the pipeline after human input (intent agent conversation).

        Args:
            session_id: Session to resume.
            user_message: User's response to the intent agent's question.

        Returns:
            Updated SharedState.
        """
        state = self.sessions.get(session_id)
        if not state:
            raise ValueError(f"Session {session_id} not found")

        config = {"configurable": {"thread_id": session_id}}

        # Add user message to conversation and update state for resume
        update = {
            "conversation_history": [{"role": "user", "content": user_message}],
            "updated_at": datetime.now(timezone.utc),
        }

        result = await self.app.ainvoke(update, config=config)
        updated = SharedState(**result) if isinstance(result, dict) else result
        self.sessions[session_id] = updated
        return updated

    async def run_full_pipeline(self, session_id: str) -> SharedState:
        """Run the full pipeline without interrupts (for testing/automation).

        Compiles a separate graph without interrupt_before.

        Args:
            session_id: Session to run.

        Returns:
            Final SharedState.
        """
        from orchestrator.graph import compile_graph

        app, _ = compile_graph(interrupt_before_intent=False)
        state = self.sessions.get(session_id)
        if not state:
            raise ValueError(f"Session {session_id} not found")

        config = {"configurable": {"thread_id": session_id}}
        result = await app.ainvoke(state.model_dump(), config=config)
        updated = SharedState(**result) if isinstance(result, dict) else result
        self.sessions[session_id] = updated
        return updated

    async def stream_updates(
        self, session_id: str
    ) -> AsyncGenerator[dict[str, Any], None]:
        """Stream status updates as the pipeline runs.

        Yields event dicts compatible with the WebSocket handler:
            {"event": "agent_started", "agent": "<name>", "timestamp": "..."}
            {"event": "agent_completed", "agent": "<name>", "timestamp": "..."}

        Args:
            session_id: Session to stream.

        Yields:
            Event dicts.
        """
        state = self.sessions.get(session_id)
        if not state:
            raise ValueError(f"Session {session_id} not found")

        config = {"configurable": {"thread_id": session_id}}
        input_state = state.model_dump()

        app_no_interrupt, _ = compile_graph(interrupt_before_intent=False)

        async for event in app_no_interrupt.astream(input_state, config=config, stream_mode="updates"):
            for node_name, node_output in event.items():
                now = datetime.now(timezone.utc).isoformat()
                yield {
                    "event": "agent_completed",
                    "agent": node_name,
                    "timestamp": now,
                    "data": {
                        k: v
                        for k, v in (node_output if isinstance(node_output, dict) else {}).items()
                        if k in ("status", "requirements_finalized")
                    },
                }

            # Update stored session state
            if isinstance(node_output, dict):
                current = self.sessions[session_id]
                merged = current.model_dump()
                for k, v in node_output.items():
                    if isinstance(v, list) and isinstance(merged.get(k), list):
                        merged[k] = merged[k] + v
                    elif isinstance(v, dict) and isinstance(merged.get(k), dict):
                        merged[k].update(v)
                    else:
                        merged[k] = v
                self.sessions[session_id] = SharedState(**merged)

        yield {
            "event": "pipeline_complete",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }


# Global singleton
pipeline = PipelineRunner()
