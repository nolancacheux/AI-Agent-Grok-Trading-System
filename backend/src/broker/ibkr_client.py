import asyncio
from typing import Optional
from datetime import datetime
from loguru import logger
from ib_insync import IB, Stock, MarketOrder, LimitOrder, Contract, Trade as IBTrade
import nest_asyncio

from src.config import get_settings
from src.models import Position, TradeOrder, TradeResult, TradeAction, OrderType

# Enable nested event loops for ib_insync compatibility
nest_asyncio.apply()


class IBKRClient:
    """Interactive Brokers client using ib_insync."""

    def __init__(self):
        self.settings = get_settings()
        self.ib = IB()
        self._connected = False

    @property
    def connected(self) -> bool:
        return self._connected and self.ib.isConnected()

    async def connect(self) -> bool:
        """Connect to IB Gateway."""
        if self.connected:
            logger.info("Already connected to IBKR")
            return True

        try:
            logger.info(
                f"Connecting to IBKR at {self.settings.ibkr_host}:{self.settings.ibkr_port}"
            )

            # ib_insync connect is synchronous but manages its own event loop
            self.ib.connect(
                self.settings.ibkr_host,
                self.settings.ibkr_port,
                clientId=self.settings.ibkr_client_id,
                readonly=False,
                timeout=10
            )

            self._connected = True
            logger.info("Connected to IBKR successfully")

            # Get account info
            accounts = self.ib.managedAccounts()
            logger.info(f"Available accounts: {accounts}")

            return True

        except Exception as e:
            logger.error(f"Failed to connect to IBKR: {e}")
            return False

    async def disconnect(self):
        """Disconnect from IB Gateway."""
        if self.connected:
            self.ib.disconnect()
            self._connected = False
            logger.info("Disconnected from IBKR")

    async def get_account_summary(self) -> dict:
        """Get account summary including cash and portfolio value."""
        if not self.connected:
            raise ConnectionError("Not connected to IBKR")

        summary = {}
        account_values = self.ib.accountSummary()

        for av in account_values:
            if av.tag in ["TotalCashValue", "NetLiquidation", "GrossPositionValue"]:
                summary[av.tag] = float(av.value)

        return summary

    async def get_cash_balance(self) -> float:
        """Get available cash balance."""
        summary = await self.get_account_summary()
        return summary.get("TotalCashValue", 0.0)

    async def get_portfolio_value(self) -> float:
        """Get total portfolio value."""
        summary = await self.get_account_summary()
        return summary.get("NetLiquidation", 0.0)

    async def get_positions(self) -> list[Position]:
        """Get all current positions."""
        if not self.connected:
            raise ConnectionError("Not connected to IBKR")

        positions = []
        ib_positions = self.ib.positions()

        for pos in ib_positions:
            if pos.position != 0:
                current_price = await self._get_current_price(pos.contract)
                positions.append(Position(
                    symbol=pos.contract.symbol,
                    quantity=int(pos.position),
                    avg_price=pos.avgCost,
                    current_price=current_price
                ))

        return positions

    async def _get_current_price(self, contract: Contract) -> float:
        """Get current market price for a contract."""
        try:
            self.ib.qualifyContracts(contract)
            ticker = self.ib.reqMktData(contract, snapshot=True)
            self.ib.sleep(2)  # Wait for data
            self.ib.cancelMktData(contract)

            if ticker.last and ticker.last > 0:
                return ticker.last
            elif ticker.close and ticker.close > 0:
                return ticker.close
            return 0.0
        except Exception as e:
            logger.warning(f"Could not get price for {contract.symbol}: {e}")
            return 0.0

    async def get_stock_price(self, symbol: str) -> float:
        """Get current price for a stock symbol."""
        contract = Stock(symbol, "SMART", "USD")
        return await self._get_current_price(contract)

    async def execute_order(self, order: TradeOrder) -> TradeResult:
        """Execute a trade order."""
        if not self.connected:
            return TradeResult(
                success=False,
                symbol=order.symbol,
                action=order.action,
                quantity=order.quantity,
                error="Not connected to IBKR"
            )

        try:
            # Create contract
            contract = Stock(order.symbol, "SMART", "USD")
            self.ib.qualifyContracts(contract)

            # Determine action
            if order.action == TradeAction.CLOSE:
                # Find existing position and close it
                positions = await self.get_positions()
                pos = next((p for p in positions if p.symbol == order.symbol), None)
                if not pos:
                    return TradeResult(
                        success=False,
                        symbol=order.symbol,
                        action=order.action,
                        quantity=order.quantity,
                        error=f"No position found for {order.symbol}"
                    )
                ib_action = "SELL" if pos.quantity > 0 else "BUY"
                quantity = abs(pos.quantity)
            else:
                ib_action = "BUY" if order.action == TradeAction.BUY else "SELL"
                quantity = order.quantity

            # Create order
            if order.order_type == OrderType.MARKET:
                ib_order = MarketOrder(ib_action, quantity)
            else:
                ib_order = LimitOrder(ib_action, quantity, order.limit_price)

            # Submit order
            trade: IBTrade = self.ib.placeOrder(contract, ib_order)

            # Wait for fill (with timeout)
            start_time = datetime.now()
            while not trade.isDone():
                self.ib.sleep(0.5)
                if (datetime.now() - start_time).seconds > 30:
                    self.ib.cancelOrder(ib_order)
                    return TradeResult(
                        success=False,
                        symbol=order.symbol,
                        action=order.action,
                        quantity=order.quantity,
                        error="Order timeout - cancelled"
                    )

            # Check if filled
            if trade.orderStatus.status == "Filled":
                fill = trade.fills[-1] if trade.fills else None
                executed_price = fill.execution.price if fill else 0.0
                commission = sum(
                    f.commissionReport.commission
                    for f in trade.fills
                    if f.commissionReport and f.commissionReport.commission
                )

                cash_after = await self.get_cash_balance()

                return TradeResult(
                    success=True,
                    order_id=str(trade.order.orderId),
                    symbol=order.symbol,
                    action=order.action,
                    quantity=quantity,
                    executed_price=executed_price,
                    total_value=executed_price * quantity,
                    fee=commission,
                    cash_after=cash_after
                )
            else:
                return TradeResult(
                    success=False,
                    symbol=order.symbol,
                    action=order.action,
                    quantity=order.quantity,
                    error=f"Order status: {trade.orderStatus.status}"
                )

        except Exception as e:
            logger.error(f"Order execution failed: {e}")
            return TradeResult(
                success=False,
                symbol=order.symbol,
                action=order.action,
                quantity=order.quantity,
                error=str(e)
            )


# Singleton instance
_ibkr_client: Optional[IBKRClient] = None


def get_ibkr_client() -> IBKRClient:
    global _ibkr_client
    if _ibkr_client is None:
        _ibkr_client = IBKRClient()
    return _ibkr_client
