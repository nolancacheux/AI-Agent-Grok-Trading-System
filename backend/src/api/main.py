"""Main FastAPI application with all integrations."""

from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import sys

from src.config import get_settings
from src.broker.ibkr_client import get_ibkr_client
from src.database import init_db, get_db
from src.scheduler import get_scheduler
from src.agent.trading_agent import get_trading_agent
from src.agent.reflections import get_reflection_engine
from src.api.routes import trading, portfolio, health, agent
from src.api.websocket import websocket_handler, get_connection_manager


# Configure logging
logger.remove()
logger.add(
    sys.stdout,
    format="<green>{time:YYYY-MM-DD HH:mm:ss}</green> | <level>{level: <8}</level> | <cyan>{name}</cyan>:<cyan>{function}</cyan> - <level>{message}</level>",
    level=get_settings().log_level
)


async def take_portfolio_snapshot():
    """Take a portfolio snapshot and broadcast."""
    try:
        ibkr = get_ibkr_client()
        db = get_db()
        manager = get_connection_manager()

        if not ibkr.connected:
            return

        cash = await ibkr.get_cash_balance()
        total_value = await ibkr.get_portfolio_value()
        positions = await ibkr.get_positions()

        holdings_value = sum(p.value for p in positions)
        initial_value = db.get_initial_value() or total_value
        pnl = total_value - initial_value
        pnl_percent = (pnl / initial_value * 100) if initial_value > 0 else 0

        # Save snapshot
        positions_data = [p.model_dump() for p in positions]
        db.save_portfolio_snapshot(
            total_value=total_value,
            cash=cash,
            holdings_value=holdings_value,
            pnl=pnl,
            pnl_percent=pnl_percent,
            positions=positions_data
        )

        # Broadcast update
        await manager.broadcast_portfolio_update({
            "cash": cash,
            "holdings_value": holdings_value,
            "total_value": total_value,
            "pnl": pnl,
            "pnl_percent": pnl_percent,
            "positions": positions_data
        })

    except Exception as e:
        logger.error(f"Portfolio snapshot error: {e}")


async def run_trading_loop():
    """Run the trading analysis loop."""
    try:
        agent = get_trading_agent()
        manager = get_connection_manager()

        # Broadcast status change
        await manager.broadcast_agent_status({"status": "ANALYZING"})

        # Run analysis
        result = await agent.analyze_and_trade()

        if result:
            await manager.broadcast_trade(result.model_dump())

        # Broadcast completion
        state = await agent.get_state()
        await manager.broadcast_agent_status(state.model_dump())

    except Exception as e:
        logger.error(f"Trading loop error: {e}")
        await get_connection_manager().broadcast_log({
            "level": "ERROR",
            "message": f"Trading loop error: {str(e)}",
            "component": "trading"
        })


async def run_reflection():
    """Generate trading reflections."""
    try:
        engine = get_reflection_engine()
        manager = get_connection_manager()

        reflection = await engine.generate_reflection(period_hours=24)

        await manager.broadcast_reflection(reflection)

    except Exception as e:
        logger.error(f"Reflection error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    # Startup
    logger.info("Starting Grok Trading Bot API...")
    settings = get_settings()

    # Initialize database
    db = init_db()
    logger.info("Database initialized")

    # Connect to IBKR
    ibkr = get_ibkr_client()
    connected = await ibkr.connect()
    if connected:
        logger.info("IBKR connection established")

        # Set initial value if not set
        if db.get_initial_value() is None:
            initial_value = await ibkr.get_portfolio_value()
            db.set_initial_value(initial_value)
            logger.info(f"Initial portfolio value set: ${initial_value:,.2f}")
    else:
        logger.warning("IBKR connection failed - running in offline mode")

    # Initialize scheduler
    scheduler = get_scheduler()
    scheduler.set_trading_callback(run_trading_loop)
    scheduler.set_snapshot_callback(take_portfolio_snapshot)
    scheduler.set_reflection_callback(run_reflection)
    scheduler.start()
    logger.info("Scheduler started")

    # Log startup
    db.log(
        message="Grok Trading Bot API started",
        component="api",
        level="INFO",
        details={"ibkr_connected": connected}
    )

    yield

    # Shutdown
    logger.info("Shutting down...")
    scheduler.stop()
    await ibkr.disconnect()

    db.log(
        message="Grok Trading Bot API stopped",
        component="api",
        level="INFO"
    )


app = FastAPI(
    title="Grok Trading Bot API",
    description="Automated trading bot powered by Grok AI",
    version="0.2.0",
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
app.include_router(agent.router, prefix="/api", tags=["Agent"])


@app.get("/")
async def root():
    return {
        "name": "Grok Trading Bot",
        "version": "0.2.0",
        "status": "running"
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket endpoint for real-time updates."""
    await websocket_handler(websocket)


# Additional API endpoints for new features

@app.get("/api/scheduler/status")
async def get_scheduler_status():
    """Get scheduler status."""
    scheduler = get_scheduler()
    return scheduler.get_status()


@app.post("/api/scheduler/mode/{mode}")
async def set_scheduler_mode(mode: str):
    """Set scheduler mode (MANUAL or AUTO)."""
    scheduler = get_scheduler()
    scheduler.set_mode(mode)
    return {"mode": scheduler.mode}


@app.post("/api/scheduler/trigger")
async def trigger_trading():
    """Manually trigger trading loop."""
    scheduler = get_scheduler()
    scheduler.trigger_now()
    return {"message": "Trading loop triggered"}


@app.get("/api/chat/history")
async def get_chat_history(limit: int = 50):
    """Get chat history."""
    db = get_db()
    messages = db.get_chat_history(limit=limit)
    return {"messages": [m.to_dict() for m in messages]}


@app.get("/api/reflections")
async def get_reflections(limit: int = 10):
    """Get trading reflections."""
    db = get_db()
    reflections = db.get_reflections(limit=limit)
    return {"reflections": [r.to_dict() for r in reflections]}


@app.post("/api/reflections/generate")
async def generate_reflection(hours: int = 24):
    """Generate a new reflection."""
    engine = get_reflection_engine()
    reflection = await engine.generate_reflection(period_hours=hours)
    return reflection


@app.get("/api/logs")
async def get_logs(limit: int = 100, level: str = None, component: str = None):
    """Get system logs."""
    db = get_db()
    logs = db.get_logs(limit=limit, level=level, component=component)
    return {"logs": [l.to_dict() for l in logs]}


@app.get("/api/stats")
async def get_stats(days: int = 30):
    """Get trading statistics."""
    db = get_db()
    stats = db.get_trade_stats(days=days)
    return stats


@app.get("/api/portfolio/history")
async def get_portfolio_history(hours: int = 24):
    """Get portfolio value history."""
    db = get_db()
    history = db.get_portfolio_history(hours=hours)
    return {
        "history": [h.to_dict() for h in history],
        "count": len(history)
    }
