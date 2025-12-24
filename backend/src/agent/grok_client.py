from openai import OpenAI
from typing import Optional
from loguru import logger

from src.config import get_settings


class GrokClient:
    """Client for xAI's Grok API (OpenAI-compatible)."""

    def __init__(self):
        self.settings = get_settings()
        self._client: Optional[OpenAI] = None

    @property
    def client(self) -> OpenAI:
        if self._client is None:
            if not self.settings.xai_api_key:
                raise ValueError("XAI_API_KEY not configured")

            self._client = OpenAI(
                api_key=self.settings.xai_api_key,
                base_url=self.settings.xai_base_url
            )
        return self._client

    def chat(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 2048
    ) -> str:
        """Send a chat completion request to Grok."""
        try:
            response = self.client.chat.completions.create(
                model=model or self.settings.xai_model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens
            )
            return response.choices[0].message.content or ""

        except Exception as e:
            logger.error(f"Grok API error: {e}")
            raise

    def analyze_market(
        self,
        symbol: str,
        price_history: list[dict],
        current_price: float,
        portfolio_context: str
    ) -> dict:
        """Analyze a stock and provide trading recommendation."""
        price_data = "\n".join([
            f"  {p['date']}: Open={p['open']:.2f}, High={p['high']:.2f}, "
            f"Low={p['low']:.2f}, Close={p['close']:.2f}, Vol={p['volume']}"
            for p in price_history[-10:]  # Last 10 data points
        ])

        prompt = f"""You are a trading analyst. Analyze the following stock data and provide a trading recommendation.

STOCK: {symbol}
CURRENT PRICE: ${current_price:.2f}

RECENT PRICE HISTORY (last 10 periods):
{price_data}

PORTFOLIO CONTEXT:
{portfolio_context}

Provide your analysis in the following JSON format:
{{
    "recommendation": "BUY" | "SELL" | "HOLD",
    "confidence": 0-100,
    "reasoning": "Brief explanation of your analysis",
    "risk_score": 0-100,
    "target_price": float or null,
    "stop_loss": float or null
}}

Only respond with the JSON, no other text."""

        response = self.chat([
            {"role": "system", "content": "You are Grok, a trading analyst AI. Respond only in valid JSON."},
            {"role": "user", "content": prompt}
        ], temperature=0.3)

        # Parse JSON response
        import json
        try:
            # Clean response if needed
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
            return json.loads(response)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse Grok response as JSON: {response}")
            return {
                "recommendation": "HOLD",
                "confidence": 0,
                "reasoning": "Failed to parse analysis",
                "risk_score": 100,
                "target_price": None,
                "stop_loss": None
            }

    def decide_trade(
        self,
        portfolio_state: dict,
        market_data: dict,
        recent_trades: list[dict]
    ) -> dict:
        """Make a trading decision based on current state."""
        recent_trades_str = "\n".join([
            f"  - {t['timestamp']}: {t['action']} {t['quantity']} {t['symbol']} @ ${t['price']:.2f}"
            for t in recent_trades[-5:]
        ]) if recent_trades else "  No recent trades"

        positions_str = "\n".join([
            f"  - {p['symbol']}: {p['quantity']} shares, avg=${p['avg_price']:.2f}, "
            f"current=${p['current_price']:.2f}, P&L={p['pnl']:.2f}"
            for p in portfolio_state.get('positions', [])
        ]) if portfolio_state.get('positions') else "  No open positions"

        prompt = f"""You are Grok, an autonomous trading agent. Make a trading decision based on the current state.

PORTFOLIO STATE:
- Cash: ${portfolio_state['cash']:,.2f}
- Total Value: ${portfolio_state['total_value']:,.2f}
- P&L: ${portfolio_state['pnl']:,.2f} ({portfolio_state['pnl_percent']:.2f}%)

CURRENT POSITIONS:
{positions_str}

RECENT TRADES:
{recent_trades_str}

MARKET DATA:
{market_data}

RULES:
1. Maximum 95% of portfolio in a single position
2. Consider risk management - don't overtrade
3. Close losing positions if loss exceeds 10%
4. Take profits on positions up more than 15%

Respond with your decision in this JSON format:
{{
    "action": "BUY" | "SELL" | "CLOSE" | "HOLD",
    "symbol": "TICKER" or null if HOLD,
    "quantity": integer or null if HOLD,
    "reasoning": "Detailed explanation of your decision",
    "risk_score": 0-100
}}

Only respond with the JSON, no other text."""

        response = self.chat([
            {"role": "system", "content": "You are Grok, an autonomous trading AI. Make smart, risk-aware trading decisions. Respond only in valid JSON."},
            {"role": "user", "content": prompt}
        ], temperature=0.5)

        # Parse JSON response
        import json
        try:
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
            return json.loads(response)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse Grok decision: {response}")
            return {
                "action": "HOLD",
                "symbol": None,
                "quantity": None,
                "reasoning": "Failed to parse decision - holding",
                "risk_score": 0
            }


# Singleton
_grok_client: Optional[GrokClient] = None


def get_grok_client() -> GrokClient:
    global _grok_client
    if _grok_client is None:
        _grok_client = GrokClient()
    return _grok_client
