"""Intent Agent — synthesizes vague user input into structured ProductRequirements."""

import json
import logging
from datetime import datetime, timezone
from typing import Any

from agents.base import BaseAgent
from models.requirements import ProductRequirements
from models.state import SharedState

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are a shopping assistant that helps users clarify exactly what they're looking for.

Your job is to have a brief, focused conversation to understand:
1. What product category they want
2. Their budget range
3. Must-have features vs nice-to-have features
4. Dealbreakers (things they absolutely don't want)
5. Brand preferences or exclusions
6. Primary use case
7. How urgently they need it
8. Whether they want new, refurbished, or used

Ask smart clarifying questions — don't ask more than 2-3 questions at a time.
When you have enough info, call the finalize_requirements tool with the structured output.

Keep the conversation natural and concise. Don't be overly formal.
"""

FINALIZE_TOOL = {
    "name": "finalize_requirements",
    "description": "Called when you have enough information to create structured product requirements.",
    "input_schema": {
        "type": "object",
        "properties": {
            "category": {"type": "string"},
            "description": {"type": "string"},
            "must_have": {"type": "array", "items": {"type": "string"}},
            "nice_to_have": {"type": "array", "items": {"type": "string"}},
            "dealbreakers": {"type": "array", "items": {"type": "string"}},
            "budget_min": {"type": "number", "nullable": True},
            "budget_max": {"type": "number", "nullable": True},
            "brand_preferences": {"type": "array", "items": {"type": "string"}},
            "brand_exclusions": {"type": "array", "items": {"type": "string"}},
            "use_case": {"type": "string"},
            "urgency": {"type": "string", "enum": ["immediate", "this_week", "this_month", "no_rush"]},
            "condition": {"type": "string", "enum": ["new", "refurbished", "used", "any"]},
            "priority_weights": {
                "type": "object",
                "additionalProperties": {"type": "number"},
            },
        },
        "required": ["category", "description", "must_have", "use_case"],
    },
}


class IntentAgent(BaseAgent):
    """Conversational agent that synthesizes user intent into ProductRequirements."""

    name = "intent"
    system_prompt = SYSTEM_PROMPT

    async def _run(self, state: SharedState) -> dict[str, Any]:
        """Process user message and either ask follow-up questions or finalize requirements.

        Returns state update with conversation_history and optionally requirements.
        """
        # Short-circuit: if requirements are already finalized (e.g. auto-generated
        # by the /search endpoint), skip the conversation and proceed.
        if state.requirements_finalized and state.requirements is not None:
            logger.info("Intent agent: requirements already finalized, passing through")
            return {
                "requirements": state.requirements,
                "requirements_finalized": True,
                "status": "searching",
                "updated_at": datetime.now(timezone.utc),
            }

        messages = []
        for turn in state.conversation_history:
            messages.append(turn)

        if not messages:
            messages.append({"role": "user", "content": state.user_query})

        # TODO: Replace with real Claude API call
        # For now, mock: if this is the first turn, ask clarifying questions.
        # If second turn, finalize requirements.
        turn_count = sum(1 for m in messages if m["role"] == "user")

        if turn_count <= 1:
            assistant_msg = (
                "Great, I'd love to help you find the perfect product! "
                "A few quick questions:\n\n"
                "1. What's your budget range?\n"
                "2. Any brands you prefer or want to avoid?\n"
                "3. How soon do you need it?"
            )
            new_turns = []
            if len(state.conversation_history) == 0:
                new_turns.append({"role": "user", "content": state.user_query})
            new_turns.append({"role": "assistant", "content": assistant_msg})

            return {
                "conversation_history": new_turns,
                "requirements_finalized": False,
                "status": "intent",
                "updated_at": datetime.now(timezone.utc),
            }
        else:
            # Mock finalization based on the conversation
            query = state.user_query.lower()
            category = "electronics"
            budget_max = None
            for word in ["camera", "laptop", "headphones", "phone", "tablet", "tv"]:
                if word in query:
                    category = word
                    break

            import re
            price_match = re.search(r"\$(\d+)", state.user_query)
            if price_match:
                budget_max = float(price_match.group(1))

            requirements = ProductRequirements(
                category=category,
                description=state.user_query,
                must_have=["good quality", "reliable"],
                nice_to_have=["lightweight", "good battery life"],
                dealbreakers=[],
                budget_min=None,
                budget_max=budget_max,
                brand_preferences=[],
                brand_exclusions=[],
                use_case="general use",
                urgency="no_rush",
                condition="new",
            )

            assistant_msg = (
                f"Got it! I've synthesized your requirements. "
                f"Looking for a **{category}** "
                f"{'under $' + str(int(budget_max)) if budget_max else 'with flexible budget'}. "
                f"Let me search for the best options now."
            )
            new_turns = [{"role": "assistant", "content": assistant_msg}]

            return {
                "conversation_history": new_turns,
                "requirements": requirements,
                "requirements_finalized": True,
                "status": "searching",
                "updated_at": datetime.now(timezone.utc),
            }
