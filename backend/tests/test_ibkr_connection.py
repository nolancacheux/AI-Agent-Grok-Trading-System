"""
Test script to verify IBKR connection.
Run with: python -m pytest tests/test_ibkr_connection.py -v
Or standalone: python tests/test_ibkr_connection.py
"""
import asyncio
import sys
from pathlib import Path

# Add src to path for standalone execution
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.broker.ibkr_client import IBKRClient


async def test_connection():
    """Test basic IBKR connection."""
    print("Testing IBKR connection...")

    client = IBKRClient()
    connected = await client.connect()

    if not connected:
        print("FAILED: Could not connect to IBKR")
        print("Make sure IB Gateway is running and configured for port 4002")
        return False

    print("SUCCESS: Connected to IBKR")

    # Test getting account info
    try:
        cash = await client.get_cash_balance()
        print(f"Cash balance: ${cash:,.2f}")

        total_value = await client.get_portfolio_value()
        print(f"Portfolio value: ${total_value:,.2f}")

        positions = await client.get_positions()
        print(f"Open positions: {len(positions)}")
        for pos in positions:
            print(f"  - {pos.symbol}: {pos.quantity} shares @ ${pos.avg_price:.2f}")

    except Exception as e:
        print(f"Error getting account info: {e}")

    await client.disconnect()
    print("Disconnected from IBKR")
    return True


if __name__ == "__main__":
    success = asyncio.run(test_connection())
    sys.exit(0 if success else 1)
