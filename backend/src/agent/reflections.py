"""Reflection and self-critique system for the trading agent."""

from datetime import datetime, timedelta
from typing import Optional, List
from loguru import logger

from src.database import get_db
from src.agent.grok_client import get_grok_client


class ReflectionEngine:
    """Generates trading reflections and self-critique."""

    def __init__(self):
        self.db = get_db()
        self.grok = get_grok_client()

    async def generate_reflection(
        self,
        period_hours: int = 24,
        reflection_type: str = "daily"
    ) -> dict:
        """Generate a reflection on recent trading activity."""
        end_time = datetime.utcnow()
        start_time = end_time - timedelta(hours=period_hours)

        # Get trades from the period
        trades = self.db.get_trades(
            start_date=start_time,
            end_date=end_time,
            limit=100
        )

        # Get portfolio snapshots for context
        snapshots = self.db.get_portfolio_history_range(start_time, end_time)

        # Calculate statistics
        stats = self._calculate_stats(trades)

        # Generate reflection using Grok
        reflection_content = await self._generate_reflection_content(
            trades=trades,
            stats=stats,
            snapshots=snapshots,
            reflection_type=reflection_type
        )

        # Parse and save reflection
        reflection = self.db.save_reflection(
            content=reflection_content["reflection"],
            period_start=start_time,
            period_end=end_time,
            trades_analyzed=len(trades),
            total_pnl=stats["realized_pnl"],
            win_rate=stats["win_rate"],
            lessons=reflection_content.get("lessons"),
            adjustments=reflection_content.get("adjustments"),
            sentiment=reflection_content.get("sentiment_score")
        )

        logger.info(f"Generated {reflection_type} reflection: {len(trades)} trades analyzed")

        return {
            "id": reflection.id,
            "type": reflection_type,
            "period": {
                "start": start_time.isoformat(),
                "end": end_time.isoformat()
            },
            "stats": stats,
            "reflection": reflection_content["reflection"],
            "lessons_learned": reflection_content.get("lessons"),
            "strategy_adjustments": reflection_content.get("adjustments"),
            "sentiment_score": reflection_content.get("sentiment_score")
        }

    def _calculate_stats(self, trades: list) -> dict:
        """Calculate trading statistics."""
        if not trades:
            return {
                "total_trades": 0,
                "buy_trades": 0,
                "sell_trades": 0,
                "close_trades": 0,
                "total_volume": 0.0,
                "total_fees": 0.0,
                "realized_pnl": 0.0,
                "winning_trades": 0,
                "losing_trades": 0,
                "win_rate": 0.0,
                "avg_trade_size": 0.0,
                "largest_win": 0.0,
                "largest_loss": 0.0
            }

        buy_trades = [t for t in trades if t.action == "buy"]
        sell_trades = [t for t in trades if t.action == "sell"]
        close_trades = [t for t in trades if t.action == "close"]

        total_volume = sum(t.total_value for t in trades)
        total_fees = sum(t.fee for t in trades)

        # Calculate realized P&L from sells/closes
        exit_trades = sell_trades + close_trades
        realized_pnl = sum(t.pnl or 0 for t in exit_trades)

        winning = [t for t in exit_trades if (t.pnl or 0) > 0]
        losing = [t for t in exit_trades if (t.pnl or 0) < 0]

        win_rate = len(winning) / len(exit_trades) * 100 if exit_trades else 0

        largest_win = max((t.pnl or 0) for t in exit_trades) if exit_trades else 0
        largest_loss = min((t.pnl or 0) for t in exit_trades) if exit_trades else 0

        return {
            "total_trades": len(trades),
            "buy_trades": len(buy_trades),
            "sell_trades": len(sell_trades),
            "close_trades": len(close_trades),
            "total_volume": round(total_volume, 2),
            "total_fees": round(total_fees, 2),
            "realized_pnl": round(realized_pnl, 2),
            "winning_trades": len(winning),
            "losing_trades": len(losing),
            "win_rate": round(win_rate, 2),
            "avg_trade_size": round(total_volume / len(trades), 2) if trades else 0,
            "largest_win": round(largest_win, 2),
            "largest_loss": round(largest_loss, 2)
        }

    async def _generate_reflection_content(
        self,
        trades: list,
        stats: dict,
        snapshots: list,
        reflection_type: str
    ) -> dict:
        """Generate reflection content using Grok."""
        # Format trades for prompt
        trades_summary = self._format_trades_for_prompt(trades)

        # Format portfolio performance
        perf_summary = self._format_performance(snapshots)

        prompt = f"""You are Grok, an AI trading agent. Generate a {reflection_type} self-reflection on your recent trading activity.

## TRADING PERIOD STATISTICS:
- Total Trades: {stats['total_trades']}
- Buy Orders: {stats['buy_trades']}
- Sell/Close Orders: {stats['sell_trades'] + stats['close_trades']}
- Win Rate: {stats['win_rate']:.1f}%
- Realized P&L: ${stats['realized_pnl']:,.2f}
- Total Volume: ${stats['total_volume']:,.2f}
- Fees Paid: ${stats['total_fees']:,.2f}
- Largest Win: ${stats['largest_win']:,.2f}
- Largest Loss: ${stats['largest_loss']:,.2f}

## RECENT TRADES:
{trades_summary}

## PORTFOLIO PERFORMANCE:
{perf_summary}

Generate a thoughtful reflection in JSON format:
{{
    "reflection": "Your detailed reflection on trading performance, what went well, what could be improved (2-3 paragraphs)",
    "lessons": "Key lessons learned from this period (1-2 sentences)",
    "adjustments": "Specific strategy adjustments to consider (1-2 sentences)",
    "sentiment_score": -1.0 to 1.0 (how you feel about your performance),
    "key_insights": ["insight1", "insight2", "insight3"]
}}

Be honest and self-critical. Identify patterns in your decisions and areas for improvement."""

        try:
            response = self.grok.chat([
                {"role": "system", "content": "You are Grok, a self-aware AI trading agent. Be analytical and honest in your self-reflection. Respond only in valid JSON."},
                {"role": "user", "content": prompt}
            ], temperature=0.7)

            # Parse response
            import json
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]

            return json.loads(response)

        except Exception as e:
            logger.error(f"Failed to generate reflection: {e}")
            return {
                "reflection": f"Reflection generation failed. Stats: {stats['total_trades']} trades, {stats['win_rate']:.1f}% win rate, ${stats['realized_pnl']:,.2f} P&L",
                "lessons": "Unable to generate detailed lessons",
                "adjustments": "Review trading logs manually",
                "sentiment_score": 0.0
            }

    def _format_trades_for_prompt(self, trades: list, limit: int = 10) -> str:
        """Format trades for the prompt."""
        if not trades:
            return "No trades in this period."

        lines = []
        for trade in trades[:limit]:
            pnl_str = f", P&L: ${trade.pnl:,.2f}" if trade.pnl else ""
            lines.append(
                f"- {trade.timestamp.strftime('%Y-%m-%d %H:%M')} | "
                f"{trade.action.upper()} {trade.quantity} {trade.symbol} @ ${trade.price:.2f}"
                f"{pnl_str}"
            )

        if len(trades) > limit:
            lines.append(f"... and {len(trades) - limit} more trades")

        return "\n".join(lines)

    def _format_performance(self, snapshots: list) -> str:
        """Format portfolio performance for the prompt."""
        if not snapshots:
            return "No portfolio snapshots available."

        if len(snapshots) < 2:
            snap = snapshots[0]
            return f"Current Value: ${snap.total_value:,.2f}, P&L: ${snap.pnl:,.2f} ({snap.pnl_percent:.2f}%)"

        start = snapshots[0]
        end = snapshots[-1]

        period_change = end.total_value - start.total_value
        period_pct = (period_change / start.total_value * 100) if start.total_value > 0 else 0

        return f"""Start Value: ${start.total_value:,.2f}
End Value: ${end.total_value:,.2f}
Period Change: ${period_change:,.2f} ({period_pct:+.2f}%)
Current P&L: ${end.pnl:,.2f} ({end.pnl_percent:+.2f}%)"""

    async def get_recent_reflections(self, limit: int = 5) -> List[dict]:
        """Get recent reflections."""
        reflections = self.db.get_reflections(limit=limit)
        return [r.to_dict() for r in reflections]

    async def get_latest_reflection(self) -> Optional[dict]:
        """Get the most recent reflection."""
        reflection = self.db.get_latest_reflection()
        return reflection.to_dict() if reflection else None


# Singleton
_engine: Optional[ReflectionEngine] = None


def get_reflection_engine() -> ReflectionEngine:
    """Get the reflection engine singleton."""
    global _engine
    if _engine is None:
        _engine = ReflectionEngine()
    return _engine
