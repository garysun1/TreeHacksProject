"""FastAPI application entry point for ShopAgent."""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from rich.logging import RichHandler

from api.routes import router
from api.websocket import ws_router
from config import settings

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(name)s - %(message)s",
    handlers=[RichHandler(rich_tracebacks=True)],
)

app = FastAPI(
    title="ShopAgent",
    description="Multi-agent AI shopping assistant — TreeHacks 2026",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(ws_router)


@app.get("/health")
async def health() -> dict[str, str]:
    """Health check endpoint."""
    return {"status": "ok", "service": "shopagent"}
