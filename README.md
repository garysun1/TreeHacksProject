# Vetted

Multi-agent AI shopping assistant that searches across platforms, verifies sellers, analyzes prices, and helps you negotiate — all from a single query. Built for **TreeHacks 2026**.

## How It Works

```
User: "I need a good camera for travel, not too heavy, under $800"
                    │
                    ▼
            ┌──────────────┐
            │ Intent Agent │  ← Understands what you need
            │ (Claude SDK) │
            └──────┬───────┘
                    ▼
            ┌──────────────┐
            │ Search Agent │  ← Amazon, Walmart, Best Buy,
            │ (Bright Data)│    FB Marketplace, Craigslist
            └──────┬───────┘
                    ▼
         ┌──────────┴──────────┐
         ▼                      ▼
  ┌─────────────┐      ┌──────────────┐
  │ Trust Agent │      │  Price Agent │  ← Run in parallel
  │   (Sonar)   │      │    (Sonar)   │
  └──────┬──────┘      └──────┬───────┘
         └──────────┬──────────┘
                    ▼
            ┌──────────────┐
            │   Ranking    │  ← Weighted scoring
            └──────┬───────┘
                    ▼
              Results Ready!
                    │
        ┌───────────┴───────────┐
        ▼                       ▼
   Marketplace?              Retail?
        │                       │
        ▼                       ▼
 ┌──────────────┐      ┌──────────────┐
 │  Negotiate   │      │ Find Savings │
 │  (OpenAI)    │      │ (Price Data) │
 └──────────────┘      └──────────────┘
  On-demand:             On-demand:
  • Haggling messages    • Coupon codes
  • Offer strategies     • Cashback portals
  • Counter-offer tips   • Price-match scripts
```

## Architecture

**Automatic pipeline** runs on every search:
- **Intent Agent** (Anthropic Claude) — Synthesizes vague input into structured product requirements
- **Search Agent** (Bright Data) — Searches Amazon, Walmart, Best Buy, Facebook Marketplace, and Craigslist in parallel
- **Trust Agent** (Perplexity Sonar) — Verifies seller reputation, detects fake reviews, flags scams
- **Price Agent** (Perplexity Sonar) — Compares prices across retailers, checks price history, finds coupons and cashback

**On-demand features** triggered by the user:
- **Negotiate** (OpenAI GPT-4o) — For marketplace listings (FB Marketplace, Craigslist, eBay). Generates persuasive negotiation messages in three tones using competitor prices and price history as leverage.
- **Find Savings** — For retail listings (Amazon, Walmart, Best Buy). Surfaces coupon codes, cashback portals, price-match opportunities, and buy/wait recommendations.

Orchestrated by **LangGraph** with parallel execution, state checkpointing, and streaming status updates.

## Quick Start

```bash
cd shopagent
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # Fill in your API keys
uvicorn main:app --reload
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

API docs at `http://localhost:8000/docs`

## API

```bash
# Create a session
curl -X POST http://localhost:8000/api/sessions \
  -H "Content-Type: application/json" \
  -d '{"query": "I need a camera under $800 for travel"}'

# Send a message to the intent agent
curl -X POST http://localhost:8000/api/sessions/{id}/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Under $800, prefer Sony, need it this week"}'

# Run the full pipeline
curl -X POST http://localhost:8000/api/sessions/{id}/search

# Get ranked results
curl http://localhost:8000/api/sessions/{id}/candidates

# On-demand: negotiate a marketplace listing
curl -X POST http://localhost:8000/api/sessions/{id}/negotiate/{candidate_id}

# On-demand: get savings breakdown for a retail listing
curl http://localhost:8000/api/sessions/{id}/savings/{candidate_id}
```

## Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| Backend | FastAPI | API + WebSocket streaming |
| Orchestration | LangGraph | Agent pipeline with parallel execution |
| Intent Agent | Anthropic Claude | Conversational requirement synthesis |
| Search Agent | Bright Data | Multi-platform product scraping |
| Trust Agent | Perplexity Sonar | Seller verification and review analysis |
| Price Agent | Perplexity Sonar | Price comparison, history, coupons, cashback |
| Negotiation Agent | OpenAI GPT-4o | Marketplace haggling strategy and messages |
| Frontend | Next.js + Tailwind | Product search UI deployed on Vercel |
| Data Models | Pydantic v2 | Validation across the pipeline |