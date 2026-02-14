# ShopAgent — Multi-Agent AI Shopping Assistant

> TreeHacks 2026 hackathon project

## Purpose
ShopAgent helps users go from a vague shopping intent to the best possible purchase by orchestrating 5 specialized AI agents in a pipeline.

## Architecture
Five agents orchestrated by a LangGraph StateGraph:

1. **Intent Agent** — Multi-turn conversation → structured `ProductRequirements`
2. **Search Agent** — Fans out across Amazon, Walmart, Best Buy → `ProductCandidate` list
3. **Trust Agent** — Verifies seller reputation, review authenticity → `TrustScore` per candidate
4. **Price Agent** — Price history, coupons, cashback, deal quality → `PriceAnalysis` per candidate
5. **Negotiation Agent** — Price-match, direct negotiation → `NegotiationResult`

Trust + Price agents run **in parallel** via `asyncio.gather` in the `analyze` node.

## Tech Stack
- **Backend:** FastAPI + uvicorn
- **Orchestration:** LangGraph StateGraph with MemorySaver checkpointing
- **Agents:** Anthropic Claude SDK (each agent has its own system prompt + tools)
- **Data Models:** Pydantic v2
- **External APIs:** Bright Data (scraping), Browserbase/Stagehand (automation), Perplexity Sonar (research)
- **Utilities:** httpx, tenacity (retries), rich (logging)

## LangGraph Graph Structure
```
START → intent (loops via conditional edge until requirements_finalized)
      → search
      → analyze (trust + price in parallel)
      → rank
      → negotiate (conditional — skipped if enable_negotiation=False)
      → END
```
- Node names: `intent`, `search`, `analyze`, `rank`, `negotiate`
- Conditional edges: `should_continue_intent`, `should_negotiate`
- Checkpointing: `MemorySaver` for in-memory session persistence
- Interrupt: `interrupt_before=["intent"]` for human-in-the-loop intent flow

## Conventions
- All agent logic is `async`
- Pydantic v2 models for all data structures
- Type hints on every function
- LangGraph nodes are thin wrappers in `orchestrator/nodes.py` that call `agent.run()`
- Python `logging` module throughout (no print statements)
- External API calls use `tenacity` retry with exponential backoff

## How to Run
```bash
cd shopagent
cp .env.example .env   # Fill in API keys
pip install -r requirements.txt
uvicorn main:app --reload
```

## API Overview
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/sessions` | Create session, start intent conversation |
| POST | `/api/sessions/{id}/message` | Send message to intent agent |
| POST | `/api/sessions/{id}/search` | Trigger full search pipeline |
| GET | `/api/sessions/{id}` | Get session state |
| GET | `/api/sessions/{id}/candidates` | Get ranked candidates |
| WS | `/ws/{id}` | Stream real-time agent updates |
| GET | `/health` | Health check |

## Key Files
- `main.py` — FastAPI app entry point
- `config.py` — pydantic-settings configuration
- `models/state.py` — `SharedState` (central pipeline state)
- `agents/base.py` — `BaseAgent` abstract class
- `orchestrator/graph.py` — LangGraph graph definition
- `orchestrator/pipeline.py` — Pipeline runner with session management
- `orchestrator/nodes.py` — Thin node wrappers for each agent
- `orchestrator/ranking.py` — Candidate ranking logic
- `api/routes.py` — REST endpoints
- `api/websocket.py` — WebSocket streaming handler
