# Vetted

Multi-agent AI shopping assistant that helps users go from vague shopping intent to the best possible purchase. Built for **TreeHacks 2026**.

## How It Works

```
User: "I need a good camera for travel, not too heavy, under $800"
                    │
                    ▼
            ┌──────────────┐
            │ Intent Agent  │  ← Clarifying conversation
            └──────┬───────┘
                    ▼
            ┌──────────────┐
            │ Search Agent  │  ← Amazon, Walmart, Best Buy
            └──────┬───────┘
                    ▼
         ┌──────────┴──────────┐
         ▼                      ▼
  ┌─────────────┐      ┌──────────────┐
  │ Trust Agent  │      │ Price Agent   │  ← Run in parallel
  └──────┬──────┘      └──────┬───────┘
         └──────────┬──────────┘
                    ▼
            ┌──────────────┐
            │   Ranking     │
            └──────┬───────┘
                    ▼
            ┌──────────────┐
            │ Negotiation   │  ← Optional
            └──────┬───────┘
                    ▼
              Best Deal!
```

## Quick Start

```bash
cd shopagent
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Fill in your API keys
uvicorn main:app --reload
```

API docs at `http://localhost:8000/docs`

## Tech Stack

- **FastAPI** — Backend API + WebSocket streaming
- **LangGraph** — Agent pipeline orchestration
- **Anthropic Claude** — Powers each agent's reasoning
- **Bright Data** — Product data scraping
- **Browserbase** — Dynamic site automation
- **Perplexity Sonar** — Research and verification
- **Pydantic v2** — Data validation

## API

```bash
# Create a session
curl -X POST http://localhost:8000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"query": "I need a camera under $800 for travel"}'

# Continue the conversation
curl -X POST http://localhost:8000/api/sessions/{id}/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Under $800, prefer Sony, need it this week"}'

# Run the full pipeline
curl -X POST http://localhost:8000/api/sessions/{id}/search

# Get ranked results
curl http://localhost:8000/api/sessions/{id}/candidates
```

## License

MIT
