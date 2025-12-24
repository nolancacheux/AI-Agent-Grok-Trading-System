"""
Test script to verify Grok API connection.
Run with: python tests/test_grok_connection.py
"""
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from dotenv import load_dotenv
load_dotenv()

from src.agent.grok_client import GrokClient
from src.config import get_settings


def test_grok_connection():
    """Test basic Grok API connection with minimal tokens."""
    print("Testing Grok API connection...")
    print(f"Model: {get_settings().xai_model}")

    client = GrokClient()

    # Simple test with minimal tokens
    try:
        response = client.chat(
            messages=[
                {"role": "user", "content": "Say 'OK' if you can hear me."}
            ],
            max_tokens=10,
            temperature=0
        )
        print(f"Response: {response}")
        print("SUCCESS: Grok API connection working!")
        return True

    except Exception as e:
        print(f"FAILED: {e}")
        return False


def test_trading_analysis():
    """Test a simple trading analysis."""
    print("\nTesting trading analysis (minimal)...")

    client = GrokClient()

    try:
        # Minimal analysis test
        decision = client.decide_trade(
            portfolio_state={
                "cash": 100000,
                "total_value": 100000,
                "pnl": 0,
                "pnl_percent": 0,
                "positions": []
            },
            market_data="AAPL: $250.00 (+1.5% today)",
            recent_trades=[]
        )
        print(f"Decision: {decision}")
        print("SUCCESS: Trading analysis working!")
        return True

    except Exception as e:
        print(f"FAILED: {e}")
        return False


if __name__ == "__main__":
    success = test_grok_connection()
    if success:
        test_trading_analysis()
    sys.exit(0 if success else 1)
