"""Base agent class with common interface for all ShopAgent agents."""

import abc
import logging
from datetime import datetime, timezone
from typing import Any

import anthropic

from config import settings
from models.state import AgentError, SharedState

logger = logging.getLogger(__name__)


class BaseAgent(abc.ABC):
    """Abstract base class for all pipeline agents.

    Provides a standard async run() interface, error handling,
    and a configured Anthropic client.
    """

    name: str = "base"
    system_prompt: str = ""
    timeout: int = settings.agent_timeout
    model: str = "claude-sonnet-4-5-20250929"

    def __init__(self) -> None:
        self.client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    async def run(self, state: SharedState) -> dict[str, Any]:
        """Execute the agent and return a state update dict.

        Wraps _run() with error handling. Subclasses implement _run().

        Args:
            state: Current pipeline state.

        Returns:
            Dict of state fields to update (merged by LangGraph reducers).
        """
        logger.info("Agent [%s] starting", self.name)
        try:
            result = await self._run(state)
            logger.info("Agent [%s] completed", self.name)
            return result
        except Exception as exc:
            logger.exception("Agent [%s] failed: %s", self.name, exc)
            error = AgentError(
                agent=self.name,
                error_type=type(exc).__name__,
                message=str(exc),
                timestamp=datetime.now(timezone.utc),
            )
            return {
                "errors": [error],
                "status": "error",
                "updated_at": datetime.now(timezone.utc),
            }

    @abc.abstractmethod
    async def _run(self, state: SharedState) -> dict[str, Any]:
        """Agent-specific logic. Implemented by subclasses.

        Args:
            state: Current pipeline state.

        Returns:
            Dict of state fields to update.
        """
        ...

    async def _call_claude(
        self,
        messages: list[dict[str, str]],
        tools: list[dict] | None = None,
        max_tokens: int = 4096,
    ) -> anthropic.types.Message:
        """Call Claude with this agent's system prompt.

        Args:
            messages: Conversation messages.
            tools: Optional tool definitions.
            max_tokens: Max response tokens.

        Returns:
            Claude Message response.
        """
        kwargs: dict[str, Any] = {
            "model": self.model,
            "max_tokens": max_tokens,
            "system": self.system_prompt,
            "messages": messages,
        }
        if tools:
            kwargs["tools"] = tools
        return await self.client.messages.create(**kwargs)
