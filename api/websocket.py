"""WebSocket handler for streaming real-time agent status updates."""

import json
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from orchestrator.pipeline import pipeline

logger = logging.getLogger(__name__)
ws_router = APIRouter()


class ConnectionManager:
    """Manages active WebSocket connections per session."""

    def __init__(self) -> None:
        self.active: dict[str, list[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket) -> None:
        """Accept a WebSocket connection and register it."""
        await websocket.accept()
        if session_id not in self.active:
            self.active[session_id] = []
        self.active[session_id].append(websocket)
        logger.info("WebSocket connected for session %s", session_id)

    def disconnect(self, session_id: str, websocket: WebSocket) -> None:
        """Remove a WebSocket connection."""
        if session_id in self.active:
            self.active[session_id] = [
                ws for ws in self.active[session_id] if ws is not websocket
            ]
            if not self.active[session_id]:
                del self.active[session_id]
        logger.info("WebSocket disconnected for session %s", session_id)

    async def broadcast(self, session_id: str, data: dict[str, Any]) -> None:
        """Send a message to all connections for a session."""
        connections = self.active.get(session_id, [])
        dead: list[WebSocket] = []
        for ws in connections:
            try:
                await ws.send_text(json.dumps(data, default=str))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(session_id, ws)


manager = ConnectionManager()


@ws_router.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str) -> None:
    """WebSocket endpoint for streaming pipeline updates.

    Clients connect and receive events like:
        {"event": "agent_started", "agent": "search", "timestamp": "..."}
        {"event": "agent_completed", "agent": "search", "timestamp": "..."}
        {"event": "pipeline_complete", "timestamp": "..."}

    Clients can also send messages (for intent agent conversation):
        {"action": "message", "content": "Under $500, prefer Sony"}
        {"action": "run_pipeline"}
    """
    state = pipeline.get_session(session_id)
    if not state:
        await websocket.close(code=4004, reason="Session not found")
        return

    await manager.connect(session_id, websocket)

    try:
        while True:
            raw = await websocket.receive_text()
            try:
                msg = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_text(
                    json.dumps({"event": "error", "message": "Invalid JSON"})
                )
                continue

            action = msg.get("action")

            if action == "message":
                # Send message to intent agent
                content = msg.get("content", "")
                updated = await pipeline.resume_with_message(session_id, content)
                last_msg = ""
                for turn in reversed(updated.conversation_history):
                    if turn.get("role") == "assistant":
                        last_msg = turn.get("content", "")
                        break
                await manager.broadcast(session_id, {
                    "event": "intent_response",
                    "message": last_msg,
                    "requirements_finalized": updated.requirements_finalized,
                    "status": updated.status,
                })

            elif action == "run_pipeline":
                # Stream the full pipeline
                await manager.broadcast(session_id, {
                    "event": "pipeline_started",
                })
                async for event in pipeline.stream_updates(session_id):
                    await manager.broadcast(session_id, event)

            else:
                await websocket.send_text(
                    json.dumps({"event": "error", "message": f"Unknown action: {action}"})
                )

    except WebSocketDisconnect:
        manager.disconnect(session_id, websocket)
