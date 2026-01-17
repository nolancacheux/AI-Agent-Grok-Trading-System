"""Database connection and operations."""

import json
from datetime import datetime, timedelta
from pathlib import Path

from loguru import logger
from sqlalchemy import create_engine, desc
from sqlalchemy.orm import Session, sessionmaker

from src.database.models import (
    Base,
    ChatMessage,
    Decision,
    InitialValueRecord,
    PortfolioSnapshotRecord,
    Reflection,
    SystemConfig,
    SystemLog,
    TradeRecord,
)


class Database:
    """Database manager for persistence."""

    def __init__(self, db_path: str = "data/grok_trading.db"):
        self.db_path = db_path
        self._engine = None
        self._session_factory = None

    def init(self):
        """Initialize database and create tables."""
        # Ensure data directory exists
        Path(self.db_path).parent.mkdir(parents=True, exist_ok=True)

        self._engine = create_engine(
            f"sqlite:///{self.db_path}", echo=False, connect_args={"check_same_thread": False}
        )
        Base.metadata.create_all(self._engine)
        self._session_factory = sessionmaker(bind=self._engine)
        logger.info(f"Database initialized: {self.db_path}")

    def get_session(self) -> Session:
        """Get a new database session."""
        if self._session_factory is None:
            self.init()
        return self._session_factory()

    # Trade Records
    def save_trade(self, trade: dict) -> TradeRecord:
        """Save a trade to the database."""
        session = self.get_session()
        try:
            record = TradeRecord(
                order_id=trade.get("order_id") or trade.get("id"),
                timestamp=trade.get("timestamp", datetime.utcnow()),
                action=trade.get("action"),
                symbol=trade.get("symbol"),
                quantity=trade.get("quantity"),
                price=trade.get("price"),
                total_value=trade.get("total_value"),
                fee=trade.get("fee", 0.0),
                reasoning=trade.get("reasoning"),
                evaluated_risk=trade.get("evaluated_risk", 50),
                pnl=trade.get("pnl"),
            )
            session.add(record)
            session.commit()
            session.refresh(record)
            logger.info(f"Trade saved: {record.symbol} {record.action}")
            return record
        finally:
            session.close()

    def get_trades(
        self,
        limit: int = 100,
        offset: int = 0,
        symbol: str | None = None,
        start_date: datetime | None = None,
        end_date: datetime | None = None,
    ) -> list[TradeRecord]:
        """Get trade history with optional filters."""
        session = self.get_session()
        try:
            query = session.query(TradeRecord).order_by(desc(TradeRecord.timestamp))

            if symbol:
                query = query.filter(TradeRecord.symbol == symbol)
            if start_date:
                query = query.filter(TradeRecord.timestamp >= start_date)
            if end_date:
                query = query.filter(TradeRecord.timestamp <= end_date)

            return query.offset(offset).limit(limit).all()
        finally:
            session.close()

    def get_trades_today(self) -> list[TradeRecord]:
        """Get trades from today."""
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        return self.get_trades(start_date=today_start)

    def get_recent_trades(self, count: int = 5) -> list[TradeRecord]:
        """Get most recent trades."""
        return self.get_trades(limit=count)

    # Chat Messages
    def save_chat_message(
        self, role: str, content: str, session_id: str | None = None, tokens: int | None = None
    ) -> ChatMessage:
        """Save a chat message."""
        session = self.get_session()
        try:
            message = ChatMessage(
                role=role, content=content, trading_session_id=session_id, tokens_used=tokens
            )
            session.add(message)
            session.commit()
            session.refresh(message)
            return message
        finally:
            session.close()

    def get_chat_history(self, limit: int = 50, session_id: str | None = None) -> list[ChatMessage]:
        """Get chat history."""
        session = self.get_session()
        try:
            query = session.query(ChatMessage).order_by(desc(ChatMessage.timestamp))
            if session_id:
                query = query.filter(ChatMessage.trading_session_id == session_id)
            return query.limit(limit).all()
        finally:
            session.close()

    def get_recent_context(self, limit: int = 10) -> list[dict]:
        """Get recent chat messages formatted for API context."""
        messages = self.get_chat_history(limit=limit)
        return [{"role": m.role, "content": m.content} for m in reversed(messages)]

    # Reflections
    def save_reflection(
        self,
        content: str,
        period_start: datetime,
        period_end: datetime,
        trades_analyzed: int = 0,
        total_pnl: float = 0.0,
        win_rate: float = 0.0,
        lessons: str | None = None,
        adjustments: str | None = None,
        sentiment: float | None = None,
    ) -> Reflection:
        """Save a reflection."""
        session = self.get_session()
        try:
            reflection = Reflection(
                content=content,
                period_start=period_start,
                period_end=period_end,
                trades_analyzed=trades_analyzed,
                total_pnl=total_pnl,
                win_rate=win_rate,
                lessons_learned=lessons,
                strategy_adjustments=adjustments,
                sentiment_score=sentiment,
            )
            session.add(reflection)
            session.commit()
            session.refresh(reflection)
            logger.info(f"Reflection saved: {trades_analyzed} trades analyzed")
            return reflection
        finally:
            session.close()

    def get_reflections(self, limit: int = 10) -> list[Reflection]:
        """Get recent reflections."""
        session = self.get_session()
        try:
            return session.query(Reflection).order_by(desc(Reflection.timestamp)).limit(limit).all()
        finally:
            session.close()

    def get_latest_reflection(self) -> Reflection | None:
        """Get the most recent reflection."""
        reflections = self.get_reflections(limit=1)
        return reflections[0] if reflections else None

    def get_latest_reflection_time(self) -> datetime | None:
        """Get the end time of the last reflection period."""
        reflection = self.get_latest_reflection()
        if reflection:
            return reflection.period_end
        return None

    def count_trades_since_last_reflection(self) -> int:
        """Count trades since the last reflection period ended."""
        last_reflection_time = self.get_latest_reflection_time()
        session = self.get_session()
        try:
            query = session.query(TradeRecord)
            if last_reflection_time:
                query = query.filter(TradeRecord.timestamp > last_reflection_time)
            return query.count()
        finally:
            session.close()

    # Portfolio Snapshots
    def save_portfolio_snapshot(
        self,
        total_value: float,
        cash: float,
        holdings_value: float,
        pnl: float = 0.0,
        pnl_percent: float = 0.0,
        positions: list | None = None,
    ) -> PortfolioSnapshotRecord:
        """Save a portfolio snapshot."""
        session = self.get_session()
        try:
            snapshot = PortfolioSnapshotRecord(
                total_value=total_value,
                cash=cash,
                holdings_value=holdings_value,
                pnl=pnl,
                pnl_percent=pnl_percent,
                positions_json=json.dumps(positions) if positions else None,
            )
            session.add(snapshot)
            session.commit()
            session.refresh(snapshot)
            return snapshot
        finally:
            session.close()

    def get_portfolio_history(
        self, hours: int = 24, limit: int = 1000
    ) -> list[PortfolioSnapshotRecord]:
        """Get portfolio history for the last N hours."""
        session = self.get_session()
        try:
            start_time = datetime.utcnow() - timedelta(hours=hours)
            return (
                session.query(PortfolioSnapshotRecord)
                .filter(PortfolioSnapshotRecord.timestamp >= start_time)
                .order_by(PortfolioSnapshotRecord.timestamp)
                .limit(limit)
                .all()
            )
        finally:
            session.close()

    def get_portfolio_history_range(
        self, start: datetime, end: datetime
    ) -> list[PortfolioSnapshotRecord]:
        """Get portfolio history for a date range."""
        session = self.get_session()
        try:
            return (
                session.query(PortfolioSnapshotRecord)
                .filter(
                    PortfolioSnapshotRecord.timestamp >= start,
                    PortfolioSnapshotRecord.timestamp <= end,
                )
                .order_by(PortfolioSnapshotRecord.timestamp)
                .all()
            )
        finally:
            session.close()

    # System Logs
    def log(
        self,
        message: str,
        level: str = "INFO",
        component: str | None = None,
        details: dict | None = None,
    ) -> SystemLog:
        """Save a system log entry."""
        session = self.get_session()
        try:
            log_entry = SystemLog(
                level=level,
                component=component,
                message=message,
                details=json.dumps(details) if details else None,
            )
            session.add(log_entry)
            session.commit()
            session.refresh(log_entry)
            return log_entry
        finally:
            session.close()

    def get_logs(
        self, limit: int = 100, level: str | None = None, component: str | None = None
    ) -> list[SystemLog]:
        """Get system logs."""
        session = self.get_session()
        try:
            query = session.query(SystemLog).order_by(desc(SystemLog.timestamp))
            if level:
                query = query.filter(SystemLog.level == level)
            if component:
                query = query.filter(SystemLog.component == component)
            return query.limit(limit).all()
        finally:
            session.close()

    # Initial Value Tracking
    def get_initial_value(self, account_id: str | None = None) -> float | None:
        """Get the initial portfolio value."""
        session = self.get_session()
        try:
            query = session.query(InitialValueRecord).filter(InitialValueRecord.is_active)
            if account_id:
                query = query.filter(InitialValueRecord.account_id == account_id)
            record = query.order_by(desc(InitialValueRecord.timestamp)).first()
            return record.initial_value if record else None
        finally:
            session.close()

    def set_initial_value(self, value: float, account_id: str | None = None) -> InitialValueRecord:
        """Set the initial portfolio value."""
        session = self.get_session()
        try:
            # Deactivate any existing initial values
            session.query(InitialValueRecord).filter(InitialValueRecord.is_active).update(
                {"is_active": False}
            )

            # Create new record
            record = InitialValueRecord(initial_value=value, account_id=account_id, is_active=True)
            session.add(record)
            session.commit()
            session.refresh(record)
            logger.info(f"Initial value set: ${value:,.2f}")
            return record
        finally:
            session.close()

    # Statistics
    def get_trade_stats(self, days: int = 30) -> dict:
        """Get trading statistics for the last N days."""
        session = self.get_session()
        try:
            start_date = datetime.now() - timedelta(days=days)
            trades = session.query(TradeRecord).filter(TradeRecord.timestamp >= start_date).all()

            if not trades:
                return {
                    "total_trades": 0,
                    "total_volume": 0.0,
                    "total_fees": 0.0,
                    "realized_pnl": 0.0,
                    "winning_trades": 0,
                    "losing_trades": 0,
                    "win_rate": 0.0,
                }

            total_volume = sum(t.total_value for t in trades)
            total_fees = sum(t.fee for t in trades)

            # Calculate PnL from SELL/CLOSE trades
            sell_trades = [t for t in trades if t.action in ("sell", "close")]
            realized_pnl = sum(t.pnl or 0 for t in sell_trades)

            winning = len([t for t in sell_trades if (t.pnl or 0) > 0])
            losing = len([t for t in sell_trades if (t.pnl or 0) < 0])
            total_closed = winning + losing

            return {
                "total_trades": len(trades),
                "total_volume": total_volume,
                "total_fees": total_fees,
                "realized_pnl": realized_pnl,
                "winning_trades": winning,
                "losing_trades": losing,
                "win_rate": (winning / total_closed * 100) if total_closed > 0 else 0.0,
            }
        finally:
            session.close()

    # System Configuration
    def get_config(self, key: str, default: str | None = None) -> str | None:
        """Get a configuration value."""
        session = self.get_session()
        try:
            config = session.query(SystemConfig).filter(SystemConfig.key == key).first()
            return config.value if config else default
        finally:
            session.close()

    def set_config(self, key: str, value: str) -> SystemConfig:
        """Set a configuration value."""
        session = self.get_session()
        try:
            config = session.query(SystemConfig).filter(SystemConfig.key == key).first()
            if config:
                config.value = value
            else:
                config = SystemConfig(key=key, value=value)
                session.add(config)
            session.commit()
            session.refresh(config)
            return config
        finally:
            session.close()

    def get_scheduler_mode(self) -> str:
        """Get the scheduler mode (AUTO or MANUAL). Defaults to AUTO."""
        return self.get_config("scheduler_mode", "AUTO")

    def set_scheduler_mode(self, mode: str) -> None:
        """Set the scheduler mode."""
        self.set_config("scheduler_mode", mode.upper())
        logger.info(f"Scheduler mode set to: {mode.upper()}")

    # Decisions (all Grok decisions including KEEP)
    def save_decision(
        self,
        action: str,
        reasoning: str,
        symbol: str | None = None,
        quantity: int | None = None,
        context: dict | None = None,
        risk_score: int | None = None,
        session_id: str | None = None,
        executed: bool = False,
        trade_id: int | None = None,
    ) -> Decision:
        """Save a trading decision (including KEEP decisions)."""
        session = self.get_session()
        try:
            decision = Decision(
                action=action.lower(),
                symbol=symbol,
                quantity=quantity,
                reasoning=reasoning,
                context=json.dumps(context) if context else None,
                risk_score=risk_score,
                trading_session_id=session_id,
                executed=executed,
                trade_id=trade_id,
            )
            session.add(decision)
            session.commit()
            session.refresh(decision)
            logger.info(f"Decision saved: {action.upper()} {symbol or 'N/A'}")
            return decision
        finally:
            session.close()

    def get_decisions(
        self, limit: int = 50, action: str | None = None, symbol: str | None = None
    ) -> list[Decision]:
        """Get decision history."""
        session = self.get_session()
        try:
            query = session.query(Decision).order_by(desc(Decision.timestamp))
            if action:
                query = query.filter(Decision.action == action.lower())
            if symbol:
                query = query.filter(Decision.symbol == symbol)
            return query.limit(limit).all()
        finally:
            session.close()

    def get_decisions_by_session(self, session_id: str) -> list[Decision]:
        """Get all decisions for a trading session."""
        session = self.get_session()
        try:
            return (
                session.query(Decision)
                .filter(Decision.trading_session_id == session_id)
                .order_by(Decision.timestamp)
                .all()
            )
        finally:
            session.close()


# Singleton instance
_db: Database | None = None


def get_db() -> Database:
    """Get the database singleton."""
    global _db
    if _db is None:
        _db = Database()
        _db.init()
    return _db


def init_db():
    """Initialize the database."""
    return get_db()
