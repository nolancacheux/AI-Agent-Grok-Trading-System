from datetime import datetime

from loguru import logger

from src.agent.grok_client import get_grok_client
from src.broker.ibkr_client import get_ibkr_client
from src.config import get_settings
from src.database import get_db
from src.market_data.yahoo_finance import get_yahoo_client
from src.models import AgentState, AgentStatus, Position, Trade, TradeAction, TradeOrder


class TradingAgent:
    """Autonomous trading agent powered by Grok AI."""

    def __init__(self):
        self.settings = get_settings()
        self.ibkr = get_ibkr_client()
        self.grok = get_grok_client()
        self.yahoo = get_yahoo_client()
        self.db = get_db()

        self._status = AgentStatus.IDLE
        self._trades: list[Trade] = []
        self._initial_value: float | None = None
        self._last_action: str | None = None
        self._last_action_time: datetime | None = None
        self._last_decision: dict | None = None  # Store last decision for display

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
                last_action=self._last_action,
                last_action_time=self._last_action_time,
                trades_today=len(
                    [t for t in self._trades if t.timestamp.date() == datetime.now().date()]
                ),
            )

        except Exception as e:
            logger.error(f"Failed to get agent state: {e}")
            return AgentState(status=AgentStatus.ERROR)

    async def analyze_and_trade(self) -> Trade | None:
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
                        "change_5d": self._calculate_change(history, len(history)),
                    }

            # Format market data for Grok
            market_summary = "\n".join(
                [
                    f"  {sym}: ${data['current_price']:.2f} "
                    f"(1D: {data['change_1d']:+.2f}%, 5D: {data['change_5d']:+.2f}%)"
                    for sym, data in market_data.items()
                ]
            )

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
                            "pnl": p.pnl,
                        }
                        for p in state.positions
                    ],
                },
                market_data=market_summary,
                recent_trades=[
                    {
                        "timestamp": t.timestamp.isoformat(),
                        "action": t.action.value,
                        "symbol": t.symbol,
                        "quantity": t.quantity,
                        "price": t.price,
                    }
                    for t in self._trades[-5:]
                ],
            )

            logger.info(f"Grok decision: {decision}")

            # Store last decision for display
            self._last_decision = decision

            # Create context for logging
            decision_context = {
                "portfolio": {
                    "cash": state.cash,
                    "total_value": state.total_value,
                    "positions_count": len(state.positions),
                    "pnl_percent": state.pnl_percent,
                },
                "market_data": {
                    sym: {"price": d["current_price"], "change_1d": d["change_1d"]}
                    for sym, d in market_data.items()
                },
                "timestamp": datetime.now().isoformat(),
            }

            # Execute the decision
            if decision["action"] in ["HOLD", "KEEP"]:
                logger.info(f"Grok decided to {decision['action']} - no action taken")
                self._last_action = f"{decision['action']} - {decision.get('reasoning', 'Market analysis complete, no trades recommended')}"
                self._last_action_time = datetime.now()

                # Save KEEP decision to database
                self.db.save_decision(
                    action="keep",
                    reasoning=decision.get("reasoning", "No specific reasoning provided"),
                    symbol=decision.get("symbol"),
                    context=decision_context,
                    risk_score=decision.get("risk_score"),
                    executed=False,
                )

                self._status = AgentStatus.IDLE
                return None

            if decision["action"] in ["BUY", "SELL", "CLOSE"]:
                trade = await self._execute_decision(decision, market_data)

                # Save decision to database (with trade reference if executed)
                self.db.save_decision(
                    action=decision["action"].lower(),
                    reasoning=decision.get("reasoning", ""),
                    symbol=decision.get("symbol"),
                    quantity=decision.get("quantity"),
                    context=decision_context,
                    risk_score=decision.get("risk_score", 50),
                    executed=trade is not None,
                    trade_id=int(trade.id) if trade and trade.id.isdigit() else None,
                )

                return trade

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

    async def _close_position(self, position: Position, reason: str) -> Trade | None:
        """Close an existing position."""
        order = TradeOrder(
            symbol=position.symbol,
            action=TradeAction.CLOSE,
            quantity=abs(position.quantity),
            reasoning=reason,
            evaluated_risk=50,
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
                evaluated_risk=50,
            )
            self._trades.append(trade)
            self._last_action = f"Closed {position.symbol}: {reason}"
            self._last_action_time = result.timestamp
            self._status = AgentStatus.IDLE
            logger.info(f"Closed position: {trade}")
            return trade

        logger.error(f"Failed to close position: {result.error}")
        self._status = AgentStatus.IDLE
        return None

    async def _execute_decision(self, decision: dict, market_data: dict) -> Trade | None:
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
            evaluated_risk=decision.get("risk_score", 50),
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
                evaluated_risk=decision.get("risk_score", 50),
            )
            self._trades.append(trade)
            self._last_action = (
                f"{action.value.upper()} {result.quantity} {symbol} @ ${result.executed_price:.2f}"
            )
            self._last_action_time = result.timestamp
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
_trading_agent: TradingAgent | None = None


def get_trading_agent() -> TradingAgent:
    global _trading_agent
    if _trading_agent is None:
        _trading_agent = TradingAgent()
    return _trading_agent
