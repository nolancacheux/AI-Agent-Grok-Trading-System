"""SQLAlchemy models for database persistence."""

from datetime import datetime
from typing import Optional
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, Boolean, Enum as SQLEnum
from sqlalchemy.orm import declarative_base
import enum

Base = declarative_base()


class TradeActionEnum(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"
    CLOSE = "close"


class TradeRecord(Base):
    """Persisted trade records."""
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(String(50), unique=True, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    action = Column(String(10), nullable=False)
    symbol = Column(String(10), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    price = Column(Float, nullable=False)
    total_value = Column(Float, nullable=False)
    fee = Column(Float, default=0.0)
    reasoning = Column(Text, nullable=True)
    evaluated_risk = Column(Integer, default=50)
    pnl = Column(Float, nullable=True)  # Realized P&L for SELL/CLOSE trades

    def to_dict(self) -> dict:
        return {
            "id": str(self.id),
            "order_id": self.order_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "action": self.action,
            "symbol": self.symbol,
            "quantity": self.quantity,
            "price": self.price,
            "total_value": self.total_value,
            "fee": self.fee,
            "reasoning": self.reasoning,
            "evaluated_risk": self.evaluated_risk,
            "pnl": self.pnl
        }


class ChatMessage(Base):
    """Chat history with Grok."""
    __tablename__ = "chat_messages"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    role = Column(String(20), nullable=False)  # system, user, assistant
    content = Column(Text, nullable=False)
    trading_session_id = Column(String(50), nullable=True, index=True)
    tokens_used = Column(Integer, nullable=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "role": self.role,
            "content": self.content,
            "trading_session_id": self.trading_session_id,
            "tokens_used": self.tokens_used
        }


class Reflection(Base):
    """Agent self-reflections and critique."""
    __tablename__ = "reflections"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    period_start = Column(DateTime, nullable=False)
    period_end = Column(DateTime, nullable=False)
    trades_analyzed = Column(Integer, default=0)
    total_pnl = Column(Float, default=0.0)
    win_rate = Column(Float, default=0.0)
    content = Column(Text, nullable=False)  # The actual reflection text
    lessons_learned = Column(Text, nullable=True)
    strategy_adjustments = Column(Text, nullable=True)
    sentiment_score = Column(Float, nullable=True)  # -1 to 1

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "period_start": self.period_start.isoformat() if self.period_start else None,
            "period_end": self.period_end.isoformat() if self.period_end else None,
            "trades_analyzed": self.trades_analyzed,
            "total_pnl": self.total_pnl,
            "win_rate": self.win_rate,
            "content": self.content,
            "lessons_learned": self.lessons_learned,
            "strategy_adjustments": self.strategy_adjustments,
            "sentiment_score": self.sentiment_score
        }


class PortfolioSnapshotRecord(Base):
    """Historical portfolio snapshots."""
    __tablename__ = "portfolio_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    total_value = Column(Float, nullable=False)
    cash = Column(Float, nullable=False)
    holdings_value = Column(Float, nullable=False)
    pnl = Column(Float, default=0.0)
    pnl_percent = Column(Float, default=0.0)
    positions_json = Column(Text, nullable=True)  # JSON string of positions

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "total_value": self.total_value,
            "cash": self.cash,
            "holdings_value": self.holdings_value,
            "pnl": self.pnl,
            "pnl_percent": self.pnl_percent,
            "positions_json": self.positions_json
        }


class SystemLog(Base):
    """System activity logs."""
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    level = Column(String(10), default="INFO")  # DEBUG, INFO, WARNING, ERROR
    component = Column(String(50), nullable=True)  # agent, broker, scheduler, etc.
    message = Column(Text, nullable=False)
    details = Column(Text, nullable=True)  # JSON string for additional data

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "level": self.level,
            "component": self.component,
            "message": self.message,
            "details": self.details
        }


class InitialValueRecord(Base):
    """Store the initial portfolio value for accurate P&L tracking."""
    __tablename__ = "initial_values"

    id = Column(Integer, primary_key=True, autoincrement=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    initial_value = Column(Float, nullable=False)
    account_id = Column(String(50), nullable=True)
    is_active = Column(Boolean, default=True)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "initial_value": self.initial_value,
            "account_id": self.account_id,
            "is_active": self.is_active
        }
