import asyncio
from datetime import datetime
from typing import Optional
from loguru import logger

from src.config import get_settings
from src.models import (
    AgentState, AgentStatus, TradeOrder, TradeAction,
    OrderType, Trade, Position
)
from src.broker.ibkr_client import get_ibkr_client
from src.agent.grok_client import get_grok_client
from src.market_data.yahoo_finance import get_yahoo_client


class TradingAgent:
    """Autonomous trading agent powered by Grok AI."""

    def __init__(self):
        self.settings = get_settings()
        self.ibkr = get_ibkr_client()
        self.grok = get_grok_client()
        self.yahoo = get_yahoo_client()

        self._status = AgentStatus.IDLE
        self._trades: list[Trade] = []
        self._initial_value: Optional[float] = None

    @property
    def status(self) -> AgentStatus:
        return self._status

    async def get_state(self) -> AgentState:
        """Get current agent state."""
        try:
            if not self.ibkr.connected:
                await self.ibkr.connect()

            cash = await self.ibkr.get_cash_balance()
            total_value = await self.ibkr.get_portfolio_value()
            positions = await self.ibkr.get_positions()

            if self._initial_value is None:
                self._initial_value = total_value

            pnl = total_value - self._initial_value
            pnl_percent = (pnl / self._initial_value) * 100 if self._initial_value > 0 else 0

            return AgentState(
                status=self._status,
                cash=cash,
                initial_value=self._initial_value,
                total_value=total_value,
                pnl=pnl,
                pnl_percent=pnl_percent,
                positions=positions,
                last_action=self._trades[-1].timestamp if self._trades else None,
                trades_today=len([t for t in self._trades if t.timestamp.date() == datetime.now().date()])
            )

        except Exception as e:
            logger.error(f"Failed to get agent state: {e}")
            return AgentState(status=AgentStatus.ERROR)

    async def analyze_and_trade(self) -> Optional[Trade]:
        """Main trading loop - analyze market and execute trades."""
        self._status = AgentStatus.ANALYZING
        logger.info("Starting market analysis...")

        try:
            # Get current portfolio state
            state = await self.get_state()

            # Check if we should close any positions first
            for position in state.positions:
                pnl_pct = position.pnl_percent

                # Stop loss: close if down more than 10%
                if pnl_pct < -10:
                    logger.info(f"Stop loss triggered for {position.symbol}: {pnl_pct:.2f}%")
                    return await self._close_position(position, "Stop loss triggered")

                # Take profit: close if up more than 15%
                if pnl_pct > 15:
                    logger.info(f"Taking profit on {position.symbol}: {pnl_pct:.2f}%")
                    return await self._close_position(position, "Taking profits")

            # Get market data for analysis
            trending = self.yahoo.get_trending_tickers()
            market_data = {}

            for symbol in trending[:5]:  # Analyze top 5
                price = self.yahoo.get_stock_price(symbol)
                history = self.yahoo.get_price_history(symbol, period="5d", interval="1h")
                if price and history:
                    market_data[symbol] = {
                        "current_price": price,
                        "history": history[-20:],  # Last 20 hours
                        "change_1d": self._calculate_change(history, 24),
                        "change_5d": self._calculate_change(history, len(history))
                    }

            # Format market data for Grok
            market_summary = "\n".join([
                f"  {sym}: ${data['current_price']:.2f} "
                f"(1D: {data['change_1d']:+.2f}%, 5D: {data['change_5d']:+.2f}%)"
                for sym, data in market_data.items()
            ])

            # Ask Grok for a trading decision
            self._status = AgentStatus.TRADING
            decision = self.grok.decide_trade(
                portfolio_state={
                    "cash": state.cash,
                    "total_value": state.total_value,
                    "pnl": state.pnl,
                    "pnl_percent": state.pnl_percent,
                    "positions": [
                        {
                            "symbol": p.symbol,
                            "quantity": p.quantity,
                            "avg_price": p.avg_price,
                            "current_price": p.current_price,
                            "pnl": p.pnl
                        }
                        for p in state.positions
                    ]
                },
                market_data=market_summary,
                recent_trades=[
                    {
                        "timestamp": t.timestamp.isoformat(),
                        "action": t.action.value,
                        "symbol": t.symbol,
                        "quantity": t.quantity,
                        "price": t.price
                    }
                    for t in self._trades[-5:]
                ]
            )

            logger.info(f"Grok decision: {decision}")

            # Execute the decision
            if decision["action"] == "HOLD":
                logger.info("Grok decided to HOLD - no action taken")
                self._status = AgentStatus.IDLE
                return None

            if decision["action"] in ["BUY", "SELL", "CLOSE"]:
                return await self._execute_decision(decision, market_data)

            self._status = AgentStatus.IDLE
            return None

        except Exception as e:
            logger.error(f"Trading analysis failed: {e}")
            self._status = AgentStatus.ERROR
            return None

    def _calculate_change(self, history: list[dict], periods: int) -> float:
        """Calculate percentage change over a period."""
        if len(history) < 2:
            return 0.0

        periods = min(periods, len(history) - 1)
        old_price = history[-periods - 1]["close"]
        new_price = history[-1]["close"]

        if old_price == 0:
            return 0.0

        return ((new_price - old_price) / old_price) * 100

    async def _close_position(self, position: Position, reason: str) -> Optional[Trade]:
        """Close an existing position."""
        order = TradeOrder(
            symbol=position.symbol,
            action=TradeAction.CLOSE,
            quantity=abs(position.quantity),
            reasoning=reason,
            evaluated_risk=50
        )

        result = await self.ibkr.execute_order(order)

        if result.success:
            trade = Trade(
                id=result.order_id or str(datetime.now().timestamp()),
                timestamp=result.timestamp,
                action=TradeAction.CLOSE,
                symbol=position.symbol,
                quantity=abs(position.quantity),
                price=result.executed_price,
                total_value=result.total_value,
                fee=result.fee,
                reasoning=reason,
                evaluated_risk=50
            )
            self._trades.append(trade)
            logger.info(f"Closed position: {trade}")
            return trade

        logger.error(f"Failed to close position: {result.error}")
        return None

    async def _execute_decision(self, decision: dict, market_data: dict) -> Optional[Trade]:
        """Execute a trading decision from Grok."""
        symbol = decision.get("symbol")
        if not symbol:
            logger.warning("No symbol in decision")
            return None

        action_str = decision["action"].upper()
        try:
            action = TradeAction(action_str.lower())
        except ValueError:
            logger.warning(f"Invalid action: {action_str}")
            return None

        quantity = decision.get("quantity", 0)
        if not quantity and action != TradeAction.CLOSE:
            # Calculate quantity based on available cash
            state = await self.get_state()
            if symbol in market_data:
                price = market_data[symbol]["current_price"]
                max_investment = state.cash * 0.95  # Max 95%
                quantity = int(max_investment / price)

        if quantity <= 0 and action != TradeAction.CLOSE:
            logger.warning("Invalid quantity")
            return None

        order = TradeOrder(
            symbol=symbol,
            action=action,
            quantity=quantity,
            reasoning=decision.get("reasoning", ""),
            evaluated_risk=decision.get("risk_score", 50)
        )

        logger.info(f"Executing order: {order}")
        result = await self.ibkr.execute_order(order)

        if result.success:
            trade = Trade(
                id=result.order_id or str(datetime.now().timestamp()),
                timestamp=result.timestamp,
                action=action,
                symbol=symbol,
                quantity=result.quantity,
                price=result.executed_price,
                total_value=result.total_value,
                fee=result.fee,
                reasoning=decision.get("reasoning", ""),
                evaluated_risk=decision.get("risk_score", 50)
            )
            self._trades.append(trade)
            logger.info(f"Trade executed: {trade}")
            self._status = AgentStatus.IDLE
            return trade

        logger.error(f"Trade failed: {result.error}")
        self._status = AgentStatus.IDLE
        return None

    def get_trades(self) -> list[Trade]:
        """Get all trades."""
        return self._trades.copy()


# Singleton
_trading_agent: Optional[TradingAgent] = None


def get_trading_agent() -> TradingAgent:
    global _trading_agent
    if _trading_agent is None:
        _trading_agent = TradingAgent()
    return _trading_agent
