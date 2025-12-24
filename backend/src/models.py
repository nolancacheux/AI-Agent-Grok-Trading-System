from pydantic import BaseModel, Field
from datetime import datetime
from enum import Enum
from typing import Optional


class AgentStatus(str, Enum):
    IDLE = "IDLE"
    ANALYZING = "ANALYZING"
    TRADING = "TRADING"
    ERROR = "ERROR"


class TradeAction(str, Enum):
    BUY = "buy"
    SELL = "sell"
    CLOSE = "close"


class OrderType(str, Enum):
    MARKET = "market"
    LIMIT = "limit"


class Position(BaseModel):
    symbol: str
    quantity: int
    avg_price: float
    current_price: float = 0.0

    @property
    def value(self) -> float:
        return self.quantity * self.current_price

    @property
    def pnl(self) -> float:
        return (self.current_price - self.avg_price) * self.quantity

    @property
    def pnl_percent(self) -> float:
        if self.avg_price == 0:
            return 0.0
        return ((self.current_price - self.avg_price) / self.avg_price) * 100


class TradeOrder(BaseModel):
    symbol: str
    action: TradeAction
    order_type: OrderType = OrderType.MARKET
    quantity: int
    limit_price: Optional[float] = None
    reasoning: str = ""
    evaluated_risk: int = Field(default=50, ge=0, le=100)


class TradeResult(BaseModel):
    success: bool
    order_id: Optional[str] = None
    symbol: str
    action: TradeAction
    quantity: int
    executed_price: float = 0.0
    total_value: float = 0.0
    fee: float = 0.0
    cash_after: float = 0.0
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    error: Optional[str] = None


class Trade(BaseModel):
    id: str
    timestamp: datetime
    action: TradeAction
    symbol: str
    quantity: int
    price: float
    total_value: float
    fee: float
    reasoning: str
    evaluated_risk: int


class AgentState(BaseModel):
    name: str = "Grok"
    status: AgentStatus = AgentStatus.IDLE
    cash: float = 0.0
    initial_value: float = 0.0
    total_value: float = 0.0
    pnl: float = 0.0
    pnl_percent: float = 0.0
    positions: list[Position] = []
    last_action: Optional[str] = None
    last_action_time: Optional[datetime] = None
    trades_today: int = 0


class DailyStats(BaseModel):
    date: datetime
    total_trades: int = 0
    winning_trades: int = 0
    losing_trades: int = 0
    win_rate: float = 0.0
    total_pnl: float = 0.0
    total_fees: float = 0.0
    best_trade: Optional[Trade] = None
    worst_trade: Optional[Trade] = None


class PortfolioSnapshot(BaseModel):
    timestamp: datetime
    total_value: float
    cash: float
    holdings_value: float
    pnl: float
    pnl_percent: float
