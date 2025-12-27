from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from src.agent.trading_agent import get_trading_agent
from src.database import get_db

router = APIRouter()


@router.get("/agent/status")
async def get_agent_status():
    """Get trading agent status."""
    agent = get_trading_agent()
    state = await agent.get_state()
    return state.model_dump()


@router.post("/agent/analyze")
async def trigger_analysis():
    """Manually trigger market analysis and trading."""
    agent = get_trading_agent()

    try:
        trade = await agent.analyze_and_trade()

        # Get the last decision for full context
        last_decision = getattr(agent, '_last_decision', None)

        if trade:
            return {
                "status": "trade_executed",
                "trade": {
                    "id": trade.id,
                    "action": trade.action.value,
                    "symbol": trade.symbol,
                    "quantity": trade.quantity,
                    "price": trade.price,
                    "reasoning": trade.reasoning
                },
                "decision": last_decision
            }
        else:
            return {
                "status": "no_trade",
                "message": "Analysis complete, no trade executed",
                "decision": last_decision
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agent/trades")
async def get_trades():
    """Get all trades executed by the agent."""
    agent = get_trading_agent()
    trades = agent.get_trades()
    return {
        "trades": [
            {
                "id": t.id,
                "timestamp": t.timestamp.isoformat(),
                "action": t.action.value,
                "symbol": t.symbol,
                "quantity": t.quantity,
                "price": t.price,
                "total_value": t.total_value,
                "fee": t.fee,
                "reasoning": t.reasoning,
                "risk_score": t.evaluated_risk
            }
            for t in trades
        ]
    }


@router.get("/agent/decisions")
async def get_decisions(
    limit: int = Query(default=50, ge=1, le=500),
    action: Optional[str] = Query(default=None, description="Filter by action: buy, sell, close, keep"),
    symbol: Optional[str] = Query(default=None, description="Filter by symbol")
):
    """Get all trading decisions (including KEEP decisions)."""
    db = get_db()
    decisions = db.get_decisions(limit=limit, action=action, symbol=symbol)
    return {
        "decisions": [d.to_dict() for d in decisions]
    }


@router.get("/agent/last-decision")
async def get_last_decision():
    """Get the most recent trading decision with full context."""
    agent = get_trading_agent()
    db = get_db()

    # Get the last decision from agent memory (most recent)
    last_decision = getattr(agent, '_last_decision', None)

    # Also get from database for persistence
    decisions = db.get_decisions(limit=1)
    db_decision = decisions[0].to_dict() if decisions else None

    return {
        "current_session": last_decision,
        "last_persisted": db_decision
    }
