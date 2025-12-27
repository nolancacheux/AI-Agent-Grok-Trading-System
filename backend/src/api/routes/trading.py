from fastapi import APIRouter, HTTPException
from src.broker.ibkr_client import get_ibkr_client
from src.market_data.yahoo_finance import get_yahoo_client
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
    """Get current stock price with IBKR primary, Yahoo fallback."""
    symbol = symbol.upper()
    ibkr = get_ibkr_client()
    yahoo = get_yahoo_client()

    price = None
    source = None

    # Try IBKR first if connected
    if ibkr.connected:
        try:
            price = await ibkr.get_stock_price(symbol)
            if price and price > 0:
                source = "ibkr"
        except Exception:
            pass  # Fall through to Yahoo

    # Try Yahoo Finance as fallback
    if price is None or price <= 0:
        try:
            price = yahoo.get_stock_price(symbol)
            if price and price > 0:
                source = "yahoo"
        except Exception:
            pass

    if price is None or price <= 0:
        raise HTTPException(
            status_code=404,
            detail=f"Could not get price for {symbol} from any source"
        )

    return {
        "symbol": symbol,
        "price": round(price, 2),
        "source": source
    }
