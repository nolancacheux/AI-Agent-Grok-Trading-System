"""Trading scheduler for autonomous trading loop."""

import asyncio
from datetime import datetime, time
from typing import Optional, Callable, List
from zoneinfo import ZoneInfo
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from loguru import logger

from src.config import get_settings
from src.database import get_db


# Market hours (Eastern Time)
MARKET_OPEN = time(9, 30)
MARKET_CLOSE = time(16, 0)
PRE_MARKET_OPEN = time(4, 0)
AFTER_HOURS_CLOSE = time(20, 0)

# Timezone
ET = ZoneInfo("America/New_York")


class MarketStatus:
    """Market status enumeration."""
    CLOSED = "CLOSED"
    PRE_MARKET = "PRE_MARKET"
    OPEN = "OPEN"
    AFTER_HOURS = "AFTER_HOURS"


def get_market_status() -> str:
    """Get current market status based on Eastern Time."""
    now = datetime.now(ET)
    current_time = now.time()
    weekday = now.weekday()

    # Weekend
    if weekday >= 5:
        return MarketStatus.CLOSED

    # Regular hours
    if MARKET_OPEN <= current_time < MARKET_CLOSE:
        return MarketStatus.OPEN

    # Pre-market
    if PRE_MARKET_OPEN <= current_time < MARKET_OPEN:
        return MarketStatus.PRE_MARKET

    # After hours
    if MARKET_CLOSE <= current_time < AFTER_HOURS_CLOSE:
        return MarketStatus.AFTER_HOURS

    return MarketStatus.CLOSED


def is_market_open() -> bool:
    """Check if market is open for regular trading."""
    return get_market_status() == MarketStatus.OPEN


def is_trading_hours() -> bool:
    """Check if within extended trading hours (pre + regular + after)."""
    status = get_market_status()
    return status in [MarketStatus.PRE_MARKET, MarketStatus.OPEN, MarketStatus.AFTER_HOURS]


class TradingScheduler:
    """Scheduler for autonomous trading operations."""

    def __init__(self):
        self.settings = get_settings()
        self.db = get_db()
        self.scheduler = AsyncIOScheduler(timezone=ET)
        self._trading_callback: Optional[Callable] = None
        self._snapshot_callback: Optional[Callable] = None
        self._reflection_callback: Optional[Callable] = None
        self._is_running = False
        self._mode = "MANUAL"  # MANUAL or AUTO

    @property
    def is_running(self) -> bool:
        return self._is_running

    @property
    def mode(self) -> str:
        return self._mode

    def set_mode(self, mode: str):
        """Set trading mode (MANUAL or AUTO)."""
        if mode.upper() in ["MANUAL", "AUTO"]:
            self._mode = mode.upper()
            self.db.log(
                message=f"Trading mode set to {self._mode}",
                component="scheduler",
                level="INFO"
            )
            logger.info(f"Trading mode: {self._mode}")

    def set_trading_callback(self, callback: Callable):
        """Set the callback for trading loop."""
        self._trading_callback = callback

    def set_snapshot_callback(self, callback: Callable):
        """Set the callback for portfolio snapshots."""
        self._snapshot_callback = callback

    def set_reflection_callback(self, callback: Callable):
        """Set the callback for reflections."""
        self._reflection_callback = callback

    async def _execute_trading_loop(self):
        """Execute the trading loop if conditions are met."""
        try:
            market_status = get_market_status()

            # Log market status
            self.db.log(
                message=f"Trading check - Market: {market_status}, Mode: {self._mode}",
                component="scheduler",
                level="DEBUG"
            )

            # Only trade in AUTO mode during market hours
            if self._mode != "AUTO":
                logger.debug("Skipping trade - not in AUTO mode")
                return

            if not is_market_open():
                logger.debug(f"Skipping trade - market is {market_status}")
                return

            if self._trading_callback:
                logger.info("Executing scheduled trading loop...")
                self.db.log(
                    message="Starting scheduled analysis and trade",
                    component="scheduler",
                    level="INFO"
                )
                await self._trading_callback()
            else:
                logger.warning("No trading callback set")

        except Exception as e:
            logger.error(f"Trading loop error: {e}")
            self.db.log(
                message=f"Trading loop error: {str(e)}",
                component="scheduler",
                level="ERROR"
            )

    async def _execute_snapshot(self):
        """Take a portfolio snapshot."""
        try:
            if self._snapshot_callback:
                await self._snapshot_callback()
        except Exception as e:
            logger.error(f"Snapshot error: {e}")

    async def _execute_reflection(self):
        """Execute reflection/self-critique."""
        try:
            if self._reflection_callback:
                logger.info("Generating trading reflection...")
                await self._reflection_callback()
        except Exception as e:
            logger.error(f"Reflection error: {e}")

    def start(self):
        """Start the scheduler."""
        if self._is_running:
            logger.warning("Scheduler already running")
            return

        interval_minutes = self.settings.trading_interval_minutes

        # Main trading loop - runs every N minutes during market hours
        self.scheduler.add_job(
            self._execute_trading_loop,
            IntervalTrigger(minutes=interval_minutes),
            id="trading_loop",
            name="Trading Analysis Loop",
            replace_existing=True
        )

        # Portfolio snapshot - every 5 minutes
        self.scheduler.add_job(
            self._execute_snapshot,
            IntervalTrigger(minutes=5),
            id="portfolio_snapshot",
            name="Portfolio Snapshot",
            replace_existing=True
        )

        # Daily reflection - at market close (4:05 PM ET)
        self.scheduler.add_job(
            self._execute_reflection,
            CronTrigger(hour=16, minute=5, timezone=ET),
            id="daily_reflection",
            name="Daily Trading Reflection",
            replace_existing=True
        )

        # Weekly reflection - Friday at 4:30 PM ET
        self.scheduler.add_job(
            self._execute_reflection,
            CronTrigger(day_of_week="fri", hour=16, minute=30, timezone=ET),
            id="weekly_reflection",
            name="Weekly Trading Reflection",
            replace_existing=True
        )

        self.scheduler.start()
        self._is_running = True

        self.db.log(
            message=f"Scheduler started - trading interval: {interval_minutes} minutes",
            component="scheduler",
            level="INFO"
        )
        logger.info(f"Scheduler started - interval: {interval_minutes}m")

    def stop(self):
        """Stop the scheduler."""
        if not self._is_running:
            return

        self.scheduler.shutdown(wait=False)
        self._is_running = False

        self.db.log(
            message="Scheduler stopped",
            component="scheduler",
            level="INFO"
        )
        logger.info("Scheduler stopped")

    def get_next_run_times(self) -> List[dict]:
        """Get next scheduled run times for all jobs."""
        jobs = []
        for job in self.scheduler.get_jobs():
            next_run = job.next_run_time
            jobs.append({
                "id": job.id,
                "name": job.name,
                "next_run": next_run.isoformat() if next_run else None
            })
        return jobs

    def trigger_now(self, job_id: str = "trading_loop"):
        """Manually trigger a job."""
        job = self.scheduler.get_job(job_id)
        if job:
            logger.info(f"Manually triggering job: {job_id}")
            asyncio.create_task(self._execute_trading_loop())
        else:
            logger.warning(f"Job not found: {job_id}")

    def get_status(self) -> dict:
        """Get scheduler status."""
        return {
            "is_running": self._is_running,
            "mode": self._mode,
            "market_status": get_market_status(),
            "is_market_open": is_market_open(),
            "next_jobs": self.get_next_run_times(),
            "trading_interval_minutes": self.settings.trading_interval_minutes
        }


# Singleton instance
_scheduler: Optional[TradingScheduler] = None


def get_scheduler() -> TradingScheduler:
    """Get the scheduler singleton."""
    global _scheduler
    if _scheduler is None:
        _scheduler = TradingScheduler()
    return _scheduler
