from fastapi import APIRouter
from src.broker.ibkr_client import get_ibkr_client

router = APIRouter()


@router.get("/health")
async def health_check():
    ibkr = get_ibkr_client()
    return {
        "status": "healthy",
        "ibkr_connected": ibkr.connected
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
