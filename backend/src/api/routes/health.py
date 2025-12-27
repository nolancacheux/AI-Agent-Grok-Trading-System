from fastapi import APIRouter
from src.broker.ibkr_client import get_ibkr_client
from src.scheduler import get_scheduler

router = APIRouter()


@router.get("/health")
async def health_check():
    ibkr = get_ibkr_client()
    scheduler = get_scheduler()
    return {
        "status": "healthy",
        "ibkr_connected": ibkr.connected,
        "scheduler_mode": scheduler.mode,
        "scheduler_running": scheduler.is_running,
        "market_status": scheduler.get_status().get("market_status", "UNKNOWN")
    }


@router.get("/health/ibkr")
async def ibkr_health():
    ibkr = get_ibkr_client()
    if ibkr.connected:
        try:
            cash = await ibkr.get_cash_balance()
            return {
                "connected": True,
                "cash_balance": cash
            }
        except Exception as e:
            return {
                "connected": False,
                "error": str(e)
            }
    return {
        "connected": False,
        "error": "Not connected to IBKR"
    }
