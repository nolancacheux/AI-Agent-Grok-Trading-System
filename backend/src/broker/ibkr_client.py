import asyncio
import math
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta

import nest_asyncio
from ib_insync import IB, Contract, LimitOrder, MarketOrder, Stock
from ib_insync import Trade as IBTrade
from loguru import logger

from src.config import get_settings
from src.models import OrderType, Position, TradeAction, TradeOrder, TradeResult

# Enable nested event loops for ib_insync compatibility
nest_asyncio.apply()

# Thread executor for IBKR sync operations
_executor = ThreadPoolExecutor(max_workers=1)


class IBKRClient:
    """Interactive Brokers client using ib_insync."""

    def __init__(self):
        self.settings = get_settings()
        self.ib = IB()
        self._connected = False
        # Track symbols with market data subscription issues (error 10089)
        self._market_data_failures: dict[str, datetime] = {}
        self._market_data_cooldown_minutes: int = 60
        self._yahoo = None  # Lazy-loaded Yahoo client

    @property
    def connected(self) -> bool:
        return self._connected and self.ib.isConnected()

    @property
    def yahoo(self):
        """Lazy load Yahoo client to avoid circular imports."""
        if self._yahoo is None:
            from src.market_data.yahoo_finance import get_yahoo_client

            self._yahoo = get_yahoo_client()
        return self._yahoo

    def _should_try_ibkr_market_data(self, symbol: str) -> bool:
        """Check if we should attempt IBKR market data for this symbol."""
        if symbol not in self._market_data_failures:
            return True

        failure_time = self._market_data_failures[symbol]
        cooldown = timedelta(minutes=self._market_data_cooldown_minutes)

        if datetime.now() - failure_time > cooldown:
            # Cooldown expired, remove from failures and retry
            del self._market_data_failures[symbol]
            return True

        return False

    def _mark_market_data_failure(self, symbol: str, error_msg: str):
        """Mark a symbol as having market data subscription issues."""
        error_str = str(error_msg).lower()
        # Detect error 10089 or other market data subscription issues
        if "10089" in error_str or "no market data" in error_str or "no valid price" in error_str:
            self._market_data_failures[symbol] = datetime.now()
            logger.warning(
                f"Market data issue for {symbol}. Using Yahoo fallback. "
                f"Will not retry IBKR for {self._market_data_cooldown_minutes} minutes."
            )

    def _sync_connect(self) -> bool:
        """Synchronous connect - runs in thread."""
        try:
            self.ib.connect(
                self.settings.ibkr_host,
                self.settings.ibkr_port,
                clientId=self.settings.ibkr_client_id,
                readonly=False,
                timeout=10,
            )
            return True
        except Exception as e:
            logger.error(f"IBKR sync connect failed: {e}")
            return False

    async def connect(self) -> bool:
        """Connect to IB Gateway."""
        if self.connected:
            logger.info("Already connected to IBKR")
            return True

        try:
            logger.info(
                f"Connecting to IBKR at {self.settings.ibkr_host}:{self.settings.ibkr_port}"
            )

            # Run sync connect in thread to avoid event loop conflicts
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(_executor, self._sync_connect)

            if result:
                self._connected = True
                logger.info("Connected to IBKR successfully")
                accounts = self.ib.managedAccounts()
                logger.info(f"Available accounts: {accounts}")
                return True
            return False

        except Exception as e:
            logger.error(f"Failed to connect to IBKR: {e}")
            return False

    async def disconnect(self):
        """Disconnect from IB Gateway."""
        if self.connected:
            self.ib.disconnect()
            self._connected = False
            logger.info("Disconnected from IBKR")

    def _sync_get_account_summary(self) -> dict:
        """Sync account summary - runs in thread."""
        summary = {}
        account_values = self.ib.accountSummary()
        for av in account_values:
            if av.tag in ["TotalCashValue", "NetLiquidation", "GrossPositionValue"]:
                summary[av.tag] = float(av.value)
        return summary

    async def get_account_summary(self) -> dict:
        """Get account summary including cash and portfolio value."""
        if not self.connected:
            raise ConnectionError("Not connected to IBKR")

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(_executor, self._sync_get_account_summary)

    async def get_cash_balance(self) -> float:
        """Get available cash balance."""
        summary = await self.get_account_summary()
        return summary.get("TotalCashValue", 0.0)

    async def get_portfolio_value(self) -> float:
        """Get total portfolio value."""
        summary = await self.get_account_summary()
        return summary.get("NetLiquidation", 0.0)

    def _safe_float(self, value, default: float = 0.0) -> float:
        """Convert value to float safely, handling nan and None."""
        if value is None:
            return default
        try:
            f = float(value)
            return default if math.isnan(f) or math.isinf(f) else f
        except (TypeError, ValueError):
            return default

    def _sync_get_positions(self) -> list[dict]:
        """Sync get positions - runs in thread with Yahoo Finance fallback."""
        positions = []
        ib_positions = self.ib.positions()

        for pos in ib_positions:
            if pos.position != 0:
                symbol = pos.contract.symbol
                avg_price = self._safe_float(pos.avgCost, 0.0)
                current_price = avg_price  # Default fallback
                price_source = "avg_cost"

                # Try IBKR first if no known market data issues
                if self._should_try_ibkr_market_data(symbol):
                    try:
                        self.ib.qualifyContracts(pos.contract)
                        ticker = self.ib.reqMktData(pos.contract, snapshot=True)
                        self.ib.sleep(1)
                        self.ib.cancelMktData(pos.contract)

                        last = self._safe_float(ticker.last, 0.0)
                        close = self._safe_float(ticker.close, 0.0)

                        if last > 0:
                            current_price = last
                            price_source = "ibkr"
                        elif close > 0:
                            current_price = close
                            price_source = "ibkr"
                        else:
                            # IBKR returned no valid price, likely subscription issue
                            self._mark_market_data_failure(symbol, "no valid price")
                    except Exception as e:
                        error_msg = str(e)
                        logger.warning(f"IBKR price failed for {symbol}: {error_msg}")
                        self._mark_market_data_failure(symbol, error_msg)

                # Try Yahoo Finance as fallback if IBKR didn't provide a valid price
                if price_source == "avg_cost":
                    try:
                        yahoo_price = self.yahoo.get_stock_price(symbol)
                        if yahoo_price and yahoo_price > 0:
                            current_price = yahoo_price
                            price_source = "yahoo"
                    except Exception as e:
                        logger.warning(f"Yahoo price also failed for {symbol}: {e}")

                positions.append(
                    {
                        "symbol": symbol,
                        "quantity": int(pos.position),
                        "avg_price": avg_price,
                        "current_price": current_price,
                    }
                )

        return positions

    async def get_positions(self) -> list[Position]:
        """Get all current positions."""
        if not self.connected:
            raise ConnectionError("Not connected to IBKR")

        loop = asyncio.get_event_loop()
        pos_data = await loop.run_in_executor(_executor, self._sync_get_positions)

        return [Position(**p) for p in pos_data]

    async def _get_current_price(self, contract: Contract) -> float | None:
        """Get current market price for a contract with Yahoo fallback."""
        symbol = contract.symbol

        # Try IBKR first if no known market data issues
        if self._should_try_ibkr_market_data(symbol):
            try:
                self.ib.qualifyContracts(contract)
                ticker = self.ib.reqMktData(contract, snapshot=True)
                self.ib.sleep(2)  # Wait for data
                self.ib.cancelMktData(contract)

                if ticker.last and ticker.last > 0:
                    return ticker.last
                elif ticker.close and ticker.close > 0:
                    return ticker.close
                else:
                    # IBKR returned no valid price
                    self._mark_market_data_failure(symbol, "no valid price")
            except Exception as e:
                error_msg = str(e)
                logger.warning(f"IBKR price failed for {symbol}: {error_msg}")
                self._mark_market_data_failure(symbol, error_msg)

        # Try Yahoo Finance as fallback
        try:
            yahoo_price = self.yahoo.get_stock_price(symbol)
            if yahoo_price and yahoo_price > 0:
                logger.debug(f"Using Yahoo price for {symbol}: ${yahoo_price:.2f}")
                return yahoo_price
        except Exception as e:
            logger.warning(f"Yahoo price also failed for {symbol}: {e}")

        return None

    async def get_stock_price(self, symbol: str) -> float | None:
        """Get current price for a stock symbol with Yahoo fallback."""
        contract = Stock(symbol, "SMART", "USD")
        return await self._get_current_price(contract)

    def _sync_execute_order(self, order: TradeOrder) -> dict:
        """Sync order execution - runs in thread."""
        try:
            contract = Stock(order.symbol, "SMART", "USD")
            self.ib.qualifyContracts(contract)

            if order.action == TradeAction.CLOSE:
                ib_positions = self.ib.positions()
                pos = next((p for p in ib_positions if p.contract.symbol == order.symbol), None)
                if not pos:
                    return {"success": False, "error": f"No position for {order.symbol}"}
                ib_action = "SELL" if pos.position > 0 else "BUY"
                quantity = abs(int(pos.position))
            else:
                ib_action = "BUY" if order.action == TradeAction.BUY else "SELL"
                quantity = order.quantity

            if order.order_type == OrderType.MARKET:
                ib_order = MarketOrder(ib_action, quantity)
            else:
                ib_order = LimitOrder(ib_action, quantity, order.limit_price)

            trade: IBTrade = self.ib.placeOrder(contract, ib_order)

            start_time = datetime.now()
            while not trade.isDone():
                self.ib.sleep(0.5)
                if (datetime.now() - start_time).seconds > 30:
                    self.ib.cancelOrder(ib_order)
                    return {"success": False, "error": "Order timeout"}

            if trade.orderStatus.status == "Filled":
                fill = trade.fills[-1] if trade.fills else None
                executed_price = fill.execution.price if fill else 0.0
                commission = sum(
                    f.commissionReport.commission
                    for f in trade.fills
                    if f.commissionReport and f.commissionReport.commission
                )
                summary = self._sync_get_account_summary()
                cash_after = summary.get("TotalCashValue", 0.0)

                return {
                    "success": True,
                    "order_id": str(trade.order.orderId),
                    "quantity": quantity,
                    "executed_price": executed_price,
                    "total_value": executed_price * quantity,
                    "fee": commission,
                    "cash_after": cash_after,
                }
            else:
                return {"success": False, "error": f"Order status: {trade.orderStatus.status}"}

        except Exception as e:
            logger.error(f"Sync order execution failed: {e}")
            return {"success": False, "error": str(e)}

    async def execute_order(self, order: TradeOrder) -> TradeResult:
        """Execute a trade order."""
        if not self.connected:
            return TradeResult(
                success=False,
                symbol=order.symbol,
                action=order.action,
                quantity=order.quantity,
                error="Not connected to IBKR",
            )

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(_executor, self._sync_execute_order, order)

        if result["success"]:
            return TradeResult(
                success=True,
                order_id=result.get("order_id"),
                symbol=order.symbol,
                action=order.action,
                quantity=result.get("quantity", order.quantity),
                executed_price=result.get("executed_price", 0.0),
                total_value=result.get("total_value", 0.0),
                fee=result.get("fee", 0.0),
                cash_after=result.get("cash_after", 0.0),
            )
        else:
            return TradeResult(
                success=False,
                symbol=order.symbol,
                action=order.action,
                quantity=order.quantity,
                error=result.get("error", "Unknown error"),
            )


# Singleton instance
_ibkr_client: IBKRClient | None = None


def get_ibkr_client() -> IBKRClient:
    global _ibkr_client
    if _ibkr_client is None:
        _ibkr_client = IBKRClient()
    return _ibkr_client
