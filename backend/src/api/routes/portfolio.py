from fastapi import APIRouter, HTTPException
from src.broker.ibkr_client import get_ibkr_client
from src.models import AgentState, AgentStatus, Position

router = APIRouter()


@router.get("/portfolio")
async def get_portfolio():
    """Get current portfolio state."""
    ibkr = get_ibkr_client()

    if not ibkr.connected:
        raise HTTPException(status_code=503, detail="IBKR not connected")

    try:
        cash = await ibkr.get_cash_balance()
        total_value = await ibkr.get_portfolio_value()
        positions = await ibkr.get_positions()

        holdings_value = sum(p.value for p in positions)

        return {
            "cash": cash,
            "total_value": total_value,
            "holdings_value": holdings_value,
            "positions": [p.model_dump() for p in positions]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/portfolio/positions")
async def get_positions():
    """Get all current positions."""
    ibkr = get_ibkr_client()

    if not ibkr.connected:
        raise HTTPException(status_code=503, detail="IBKR not connected")

    try:
        positions = await ibkr.get_positions()
        return {"positions": [p.model_dump() for p in positions]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/portfolio/cash")
async def get_cash():
    """Get available cash balance."""
    ibkr = get_ibkr_client()

    if not ibkr.connected:
        raise HTTPException(status_code=503, detail="IBKR not connected")

    try:
        cash = await ibkr.get_cash_balance()
        return {"cash": cash}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agent/state")
async def get_agent_state():
    """Get current agent state."""
    ibkr = get_ibkr_client()

    try:
        if ibkr.connected:
            cash = await ibkr.get_cash_balance()
            total_value = await ibkr.get_portfolio_value()
            positions = await ibkr.get_positions()
            initial_value = 1000000.0  # TODO: Store and retrieve from DB

            pnl = total_value - initial_value
            pnl_percent = (pnl / initial_value) * 100 if initial_value > 0 else 0

            state = AgentState(
                status=AgentStatus.IDLE,
                cash=cash,
                initial_value=initial_value,
                total_value=total_value,
                pnl=pnl,
                pnl_percent=pnl_percent,
                positions=positions
            )
        else:
            state = AgentState(
                status=AgentStatus.ERROR,
                cash=0,
                initial_value=1000000.0,
                total_value=0,
                pnl=0,
                pnl_percent=0,
                positions=[]
            )

        return state.model_dump()

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
