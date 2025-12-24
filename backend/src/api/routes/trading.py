from fastapi import APIRouter, HTTPException
from src.broker.ibkr_client import get_ibkr_client
from src.models import TradeOrder, TradeResult

router = APIRouter()


@router.post("/trade", response_model=TradeResult)
async def execute_trade(order: TradeOrder):
    """Execute a trade order."""
    ibkr = get_ibkr_client()

    if not ibkr.connected:
        raise HTTPException(status_code=503, detail="IBKR not connected")

    result = await ibkr.execute_order(order)
    return result


@router.get("/price/{symbol}")
async def get_stock_price(symbol: str):
    """Get current stock price."""
    ibkr = get_ibkr_client()

    if not ibkr.connected:
        raise HTTPException(status_code=503, detail="IBKR not connected")

    try:
        price = await ibkr.get_stock_price(symbol.upper())
        return {
            "symbol": symbol.upper(),
            "price": price
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
