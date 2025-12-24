from fastapi import APIRouter, HTTPException
from src.agent.trading_agent import get_trading_agent

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
                }
            }
        else:
            return {
                "status": "no_trade",
                "message": "Analysis complete, no trade executed"
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
