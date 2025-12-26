"""Tool executor for Grok AI function calling."""

import json
from datetime import datetime
from typing import Any, Optional
from loguru import logger

from src.broker.ibkr_client import get_ibkr_client
from src.market_data.yahoo_finance import get_yahoo_client
from src.database import get_db
from src.models import TradeOrder, TradeAction, OrderType


class ToolExecutor:
    """Executes tool calls from Grok AI."""

    def __init__(self):
        self.ibkr = get_ibkr_client()
        self.yahoo = get_yahoo_client()
        self.db = get_db()
        self._pending_orders = {}  # For stop-loss/take-profit tracking

    async def execute(self, tool_name: str, arguments: dict) -> dict:
        """Execute a tool and return the result."""
        logger.info(f"Executing tool: {tool_name} with args: {arguments}")

        self.db.log(
            message=f"Tool call: {tool_name}",
            component="tools",
            level="INFO",
            details=arguments
        )

        try:
            # Route to appropriate handler
            handlers = {
                "get_stock_price_history": self._get_stock_price_history,
                "get_stock_info": self._get_stock_info,
                "get_current_price": self._get_current_price,
                "trade_stock": self._trade_stock,
                "get_portfolio_state": self._get_portfolio_state,
                "get_trending_stocks": self._get_trending_stocks,
                "search_stocks": self._search_stocks,
                "complete_hour_actions": self._complete_hour_actions,
                "get_recent_trades": self._get_recent_trades,
                "search_news": self._search_news,
                "set_stop_loss": self._set_stop_loss,
                "set_take_profit": self._set_take_profit,
            }

            handler = handlers.get(tool_name)
            if not handler:
                return {"error": f"Unknown tool: {tool_name}"}

            result = await handler(arguments)

            self.db.log(
                message=f"Tool result: {tool_name}",
                component="tools",
                level="DEBUG",
                details={"result": str(result)[:500]}
            )

            return result

        except Exception as e:
            logger.error(f"Tool execution error: {e}")
            self.db.log(
                message=f"Tool error: {tool_name} - {str(e)}",
                component="tools",
                level="ERROR"
            )
            return {"error": str(e)}

    async def _get_stock_price_history(self, args: dict) -> dict:
        """Get historical price data."""
        symbol = args.get("symbol", "").upper()
        period = args.get("period", "1mo")
        interval = args.get("interval", "1h")

        if not symbol:
            return {"error": "Symbol is required"}

        history = self.yahoo.get_price_history(symbol, period=period, interval=interval)

        if not history:
            return {"error": f"No data found for {symbol}"}

        # Format for readability
        formatted = []
        for point in history[-50:]:  # Last 50 data points
            formatted.append({
                "date": point["date"],
                "open": round(point["open"], 2),
                "high": round(point["high"], 2),
                "low": round(point["low"], 2),
                "close": round(point["close"], 2),
                "volume": point["volume"]
            })

        return {
            "symbol": symbol,
            "period": period,
            "interval": interval,
            "data_points": len(formatted),
            "history": formatted
        }

    async def _get_stock_info(self, args: dict) -> dict:
        """Get stock information."""
        symbol = args.get("symbol", "").upper()

        if not symbol:
            return {"error": "Symbol is required"}

        info = self.yahoo.get_stock_info(symbol)

        if not info:
            return {"error": f"No info found for {symbol}"}

        return info

    async def _get_current_price(self, args: dict) -> dict:
        """Get current stock price."""
        symbol = args.get("symbol", "").upper()

        if not symbol:
            return {"error": "Symbol is required"}

        # Try Yahoo Finance first (more reliable for real-time)
        price = self.yahoo.get_stock_price(symbol)

        if price:
            return {
                "symbol": symbol,
                "price": round(price, 2),
                "source": "yahoo_finance",
                "timestamp": datetime.now().isoformat()
            }

        # Try IBKR if connected
        if self.ibkr.connected:
            try:
                price = await self.ibkr.get_stock_price(symbol)
                if price:
                    return {
                        "symbol": symbol,
                        "price": round(price, 2),
                        "source": "ibkr",
                        "timestamp": datetime.now().isoformat()
                    }
            except Exception:
                pass

        return {"error": f"Could not get price for {symbol}"}

    async def _trade_stock(self, args: dict) -> dict:
        """Execute a stock trade."""
        action = args.get("action", "").lower()
        symbol = args.get("symbol", "").upper()
        quantity = args.get("quantity")
        order_type = args.get("order_type", "market").lower()
        limit_price = args.get("limit_price")
        reasoning = args.get("reasoning", "")
        risk_score = args.get("risk_score", 50)

        if not symbol:
            return {"error": "Symbol is required"}

        if action not in ["buy", "sell", "close"]:
            return {"error": f"Invalid action: {action}"}

        if action in ["buy", "sell"] and not quantity:
            return {"error": "Quantity is required for buy/sell"}

        if order_type == "limit" and not limit_price:
            return {"error": "Limit price required for limit orders"}

        # Check connection
        if not self.ibkr.connected:
            return {"error": "Not connected to broker"}

        try:
            order = TradeOrder(
                symbol=symbol,
                action=TradeAction(action),
                order_type=OrderType(order_type),
                quantity=quantity or 0,
                limit_price=limit_price,
                reasoning=reasoning,
                evaluated_risk=risk_score
            )

            result = await self.ibkr.execute_order(order)

            if result.success:
                # Save to database
                trade_data = {
                    "order_id": result.order_id,
                    "timestamp": result.timestamp,
                    "action": action,
                    "symbol": symbol,
                    "quantity": result.quantity,
                    "price": result.executed_price,
                    "total_value": result.total_value,
                    "fee": result.fee,
                    "reasoning": reasoning,
                    "evaluated_risk": risk_score
                }
                self.db.save_trade(trade_data)

                return {
                    "success": True,
                    "order_id": result.order_id,
                    "action": action,
                    "symbol": symbol,
                    "quantity": result.quantity,
                    "executed_price": result.executed_price,
                    "total_value": result.total_value,
                    "fee": result.fee,
                    "cash_remaining": result.cash_after,
                    "message": f"Successfully {action} {result.quantity} shares of {symbol} at ${result.executed_price:.2f}"
                }
            else:
                return {
                    "success": False,
                    "error": result.error,
                    "message": f"Trade failed: {result.error}"
                }

        except Exception as e:
            return {"error": str(e)}

    async def _get_portfolio_state(self, args: dict) -> dict:
        """Get current portfolio state."""
        if not self.ibkr.connected:
            return {"error": "Not connected to broker"}

        try:
            cash = await self.ibkr.get_cash_balance()
            total_value = await self.ibkr.get_portfolio_value()
            positions = await self.ibkr.get_positions()

            # Get initial value from database
            initial_value = self.db.get_initial_value()
            if initial_value is None:
                initial_value = total_value
                self.db.set_initial_value(total_value)

            pnl = total_value - initial_value
            pnl_percent = (pnl / initial_value * 100) if initial_value > 0 else 0

            positions_data = []
            for pos in positions:
                positions_data.append({
                    "symbol": pos.symbol,
                    "quantity": pos.quantity,
                    "avg_price": round(pos.avg_price, 2),
                    "current_price": round(pos.current_price, 2),
                    "value": round(pos.value, 2),
                    "pnl": round(pos.pnl, 2),
                    "pnl_percent": round(pos.pnl_percent, 2)
                })

            holdings_value = sum(p["value"] for p in positions_data)

            return {
                "cash": round(cash, 2),
                "holdings_value": round(holdings_value, 2),
                "total_value": round(total_value, 2),
                "initial_value": round(initial_value, 2),
                "pnl": round(pnl, 2),
                "pnl_percent": round(pnl_percent, 2),
                "positions": positions_data,
                "position_count": len(positions_data)
            }

        except Exception as e:
            return {"error": str(e)}

    async def _get_trending_stocks(self, args: dict) -> dict:
        """Get trending stocks."""
        limit = args.get("limit", 10)

        try:
            tickers = self.yahoo.get_trending_tickers()[:limit]

            # Get current prices for each
            trending = []
            for symbol in tickers:
                price = self.yahoo.get_stock_price(symbol)
                if price:
                    trending.append({
                        "symbol": symbol,
                        "price": round(price, 2)
                    })

            return {
                "trending_stocks": trending,
                "count": len(trending)
            }

        except Exception as e:
            return {"error": str(e)}

    async def _search_stocks(self, args: dict) -> dict:
        """Search for stocks."""
        query = args.get("query", "")

        if not query:
            return {"error": "Query is required"}

        try:
            results = self.yahoo.search_stocks(query)
            return {
                "query": query,
                "results": results[:10],
                "count": len(results)
            }
        except Exception as e:
            return {"error": str(e)}

    async def _complete_hour_actions(self, args: dict) -> dict:
        """Mark the current trading period as complete."""
        summary = args.get("summary", "")
        trades_made = args.get("trades_made", 0)
        sentiment = args.get("market_sentiment", "neutral")
        next_plan = args.get("next_action_plan", "")

        # Log to database
        self.db.log(
            message=f"Hour complete: {summary}",
            component="trading",
            level="INFO",
            details={
                "trades_made": trades_made,
                "sentiment": sentiment,
                "next_plan": next_plan
            }
        )

        # Save as chat message for history
        self.db.save_chat_message(
            role="assistant",
            content=f"[HOUR SUMMARY] {summary}\n\nTrades: {trades_made}\nSentiment: {sentiment}\nNext: {next_plan}",
            session_id=datetime.now().strftime("%Y-%m-%d")
        )

        return {
            "success": True,
            "message": "Hour actions completed and logged",
            "timestamp": datetime.now().isoformat(),
            "summary": summary,
            "trades_made": trades_made
        }

    async def _get_recent_trades(self, args: dict) -> dict:
        """Get recent trade history."""
        limit = args.get("limit", 10)

        trades = self.db.get_recent_trades(count=limit)

        return {
            "trades": [t.to_dict() for t in trades],
            "count": len(trades)
        }

    async def _search_news(self, args: dict) -> dict:
        """Search for news about a stock or topic."""
        query = args.get("query", "")
        symbol = args.get("symbol")

        if not query:
            return {"error": "Query is required"}

        # For now, return a placeholder - this would integrate with a news API
        # In production, this could use Grok's live search capability
        search_query = f"{symbol} {query}" if symbol else query

        # Log the search request
        self.db.log(
            message=f"News search: {search_query}",
            component="news",
            level="INFO"
        )

        return {
            "query": search_query,
            "message": "News search functionality - use Grok's web search capabilities for real-time news",
            "suggestion": f"Search the web for: '{search_query} stock news today'"
        }

    async def _set_stop_loss(self, args: dict) -> dict:
        """Set a stop-loss order."""
        symbol = args.get("symbol", "").upper()
        stop_price = args.get("stop_price")
        percentage = args.get("percentage")

        if not symbol:
            return {"error": "Symbol is required"}

        if not stop_price and not percentage:
            return {"error": "Either stop_price or percentage is required"}

        # Get current position
        if not self.ibkr.connected:
            return {"error": "Not connected to broker"}

        positions = await self.ibkr.get_positions()
        position = next((p for p in positions if p.symbol == symbol), None)

        if not position:
            return {"error": f"No position found for {symbol}"}

        # Calculate stop price from percentage if needed
        if percentage and not stop_price:
            stop_price = position.current_price * (1 - percentage / 100)

        # Store pending stop-loss
        self._pending_orders[f"{symbol}_stop"] = {
            "type": "stop_loss",
            "symbol": symbol,
            "stop_price": stop_price,
            "quantity": position.quantity,
            "created": datetime.now().isoformat()
        }

        self.db.log(
            message=f"Stop-loss set for {symbol} at ${stop_price:.2f}",
            component="orders",
            level="INFO"
        )

        return {
            "success": True,
            "symbol": symbol,
            "stop_price": round(stop_price, 2),
            "current_price": round(position.current_price, 2),
            "quantity": position.quantity,
            "message": f"Stop-loss order queued for {symbol} at ${stop_price:.2f}"
        }

    async def _set_take_profit(self, args: dict) -> dict:
        """Set a take-profit order."""
        symbol = args.get("symbol", "").upper()
        target_price = args.get("target_price")
        percentage = args.get("percentage")

        if not symbol:
            return {"error": "Symbol is required"}

        if not target_price and not percentage:
            return {"error": "Either target_price or percentage is required"}

        # Get current position
        if not self.ibkr.connected:
            return {"error": "Not connected to broker"}

        positions = await self.ibkr.get_positions()
        position = next((p for p in positions if p.symbol == symbol), None)

        if not position:
            return {"error": f"No position found for {symbol}"}

        # Calculate target from percentage
        if percentage and not target_price:
            target_price = position.avg_price * (1 + percentage / 100)

        # Store pending take-profit
        self._pending_orders[f"{symbol}_tp"] = {
            "type": "take_profit",
            "symbol": symbol,
            "target_price": target_price,
            "quantity": position.quantity,
            "created": datetime.now().isoformat()
        }

        self.db.log(
            message=f"Take-profit set for {symbol} at ${target_price:.2f}",
            component="orders",
            level="INFO"
        )

        return {
            "success": True,
            "symbol": symbol,
            "target_price": round(target_price, 2),
            "entry_price": round(position.avg_price, 2),
            "current_price": round(position.current_price, 2),
            "quantity": position.quantity,
            "message": f"Take-profit order queued for {symbol} at ${target_price:.2f}"
        }


# Singleton
_executor: Optional[ToolExecutor] = None


def get_tool_executor() -> ToolExecutor:
    """Get the tool executor singleton."""
    global _executor
    if _executor is None:
        _executor = ToolExecutor()
    return _executor


async def execute_tool(tool_name: str, arguments: dict) -> dict:
    """Convenience function to execute a tool."""
    executor = get_tool_executor()
    return await executor.execute(tool_name, arguments)
