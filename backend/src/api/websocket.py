"""WebSocket handler for real-time updates."""

import asyncio
import json
from datetime import datetime

from fastapi import WebSocket, WebSocketDisconnect
from loguru import logger


class ConnectionManager:
    """Manages WebSocket connections and broadcasts."""

    def __init__(self):
        self.active_connections: set[WebSocket] = set()
        self._broadcast_task: asyncio.Task | None = None

    async def connect(self, websocket: WebSocket):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"WebSocket connected. Active connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        self.active_connections.discard(websocket)
        logger.info(f"WebSocket disconnected. Active connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        """Send a message to a specific connection."""
        try:
            await websocket.send_json(message)
        except Exception as e:
            logger.error(f"Failed to send personal message: {e}")
            self.disconnect(websocket)

    async def broadcast(self, message: dict):
        """Broadcast a message to all connections."""
        if not self.active_connections:
            return

        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.warning(f"Failed to broadcast to connection: {e}")
                disconnected.add(connection)

        # Remove disconnected
        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast_agent_status(self, status: dict):
        """Broadcast agent status update."""
        await self.broadcast(
            {"type": "agent_status", "data": status, "timestamp": datetime.now().isoformat()}
        )

    async def broadcast_trade(self, trade: dict):
        """Broadcast a new trade."""
        await self.broadcast(
            {"type": "trade", "data": trade, "timestamp": datetime.now().isoformat()}
        )

    async def broadcast_log(self, log: dict):
        """Broadcast a system log."""
        await self.broadcast({"type": "log", "data": log, "timestamp": datetime.now().isoformat()})

    async def broadcast_portfolio_update(self, portfolio: dict):
        """Broadcast portfolio update."""
        await self.broadcast(
            {"type": "portfolio_update", "data": portfolio, "timestamp": datetime.now().isoformat()}
        )

    async def broadcast_chat_message(self, message: dict):
        """Broadcast a chat message."""
        await self.broadcast(
            {"type": "chat_message", "data": message, "timestamp": datetime.now().isoformat()}
        )

    async def broadcast_reflection(self, reflection: dict):
        """Broadcast a reflection."""
        await self.broadcast(
            {"type": "reflection", "data": reflection, "timestamp": datetime.now().isoformat()}
        )

    async def broadcast_market_status(self, status: str):
        """Broadcast market status change."""
        await self.broadcast(
            {
                "type": "market_status",
                "data": {"status": status},
                "timestamp": datetime.now().isoformat(),
            }
        )


# Singleton
manager = ConnectionManager()


def get_connection_manager() -> ConnectionManager:
    """Get the connection manager singleton."""
    return manager


async def websocket_handler(websocket: WebSocket):
    """Handle WebSocket connections."""
    await manager.connect(websocket)

    try:
        # Send initial status
        from src.agent.trading_agent import get_trading_agent
        from src.scheduler import get_scheduler

        try:
            agent = get_trading_agent()
            state = await agent.get_state()
            scheduler = get_scheduler()

            await manager.send_personal_message(
                {
                    "type": "init",
                    "data": {
                        "agent_status": state.model_dump(),
                        "scheduler_status": scheduler.get_status(),
                        "connected": True,
                    },
                    "timestamp": datetime.now().isoformat(),
                },
                websocket,
            )
        except Exception as e:
            logger.error(f"Failed to send initial status: {e}")

        # Listen for messages
        while True:
            data = await websocket.receive_text()
            try:
                message = json.loads(data)
                await handle_client_message(message, websocket)
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON received: {data}")

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)


async def handle_client_message(message: dict, websocket: WebSocket):
    """Handle messages from clients."""
    msg_type = message.get("type")

    if msg_type == "ping":
        await manager.send_personal_message(
            {"type": "pong", "timestamp": datetime.now().isoformat()}, websocket
        )

    elif msg_type == "get_status":
        from src.agent.trading_agent import get_trading_agent

        try:
            agent = get_trading_agent()
            state = await agent.get_state()
            await manager.send_personal_message(
                {
                    "type": "agent_status",
                    "data": state.model_dump(),
                    "timestamp": datetime.now().isoformat(),
                },
                websocket,
            )
        except Exception as e:
            logger.error(f"Failed to get status: {e}")

    elif msg_type == "set_mode":
        from src.scheduler import get_scheduler

        mode = message.get("mode", "MANUAL")
        scheduler = get_scheduler()
        scheduler.set_mode(mode)
        await manager.broadcast(
            {"type": "mode_change", "data": {"mode": mode}, "timestamp": datetime.now().isoformat()}
        )

    elif msg_type == "trigger_analysis":
        from src.agent.trading_agent import get_trading_agent

        try:
            agent = get_trading_agent()
            # Run analysis in background
            asyncio.create_task(agent.analyze_and_trade())
            await manager.send_personal_message(
                {"type": "analysis_started", "timestamp": datetime.now().isoformat()}, websocket
            )
        except Exception as e:
            logger.error(f"Failed to trigger analysis: {e}")

    else:
        logger.warning(f"Unknown message type: {msg_type}")
