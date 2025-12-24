from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import sys

from src.config import get_settings
from src.broker.ibkr_client import get_ibkr_client
from src.api.routes import trading, portfolio, health


# Configure logging
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level=get_settings().log_level
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Grok Trading Bot API...")
    settings = get_settings()

    # Connect to IBKR
    ibkr = get_ibkr_client()
    connected = await ibkr.connect()
    if connected:
        logger.info("IBKR connection established")
    else:
        logger.warning("IBKR connection failed - running in offline mode")

    yield

    # Shutdown
    logger.info("Shutting down...")
    await ibkr.disconnect()


app = FastAPI(
    title="Grok Trading Bot API",
    description="Automated trading bot powered by Grok AI",
    version="0.1.0",
    lifespan=lifespan
)

# CORS
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(health.router, tags=["Health"])
app.include_router(portfolio.router, prefix="/api", tags=["Portfolio"])
app.include_router(trading.router, prefix="/api", tags=["Trading"])


@app.get("/")
async def root():
    return {
        "name": "Grok Trading Bot",
        "version": "0.1.0",
        "status": "running"
    }
