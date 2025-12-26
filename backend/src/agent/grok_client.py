"""Enhanced Grok client with tool calling support."""

import json
from openai import OpenAI
from typing import Optional, List
from loguru import logger

from src.config import get_settings
from src.database import get_db
from src.agent.tools.definitions import get_tool_definitions
from src.agent.tools.executor import execute_tool
from src.agent.prompts.trading import TRADING_SYSTEM_PROMPT, get_trading_prompt


class GrokClient:
    """Client for xAI's Grok API with tool calling support."""

    def __init__(self):
        self.settings = get_settings()
        self._client: Optional[OpenAI] = None
        self.db = get_db()

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
        max_tokens: int = 2048,
        tools: Optional[list] = None
    ) -> str:
        """Send a chat completion request to Grok."""
        try:
            kwargs = {
                "model": model or self.settings.xai_model,
                "messages": messages,
                "temperature": temperature,
                "max_tokens": max_tokens
            }

            if tools:
                kwargs["tools"] = tools
                kwargs["tool_choice"] = "auto"

            response = self.client.chat.completions.create(**kwargs)
            return response.choices[0].message.content or ""

        except Exception as e:
            logger.error(f"Grok API error: {e}")
            raise

    async def chat_with_tools(
        self,
        messages: list[dict],
        model: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 4096,
        max_iterations: int = 10
    ) -> dict:
        """Chat with automatic tool execution."""
        tools = get_tool_definitions()
        current_messages = messages.copy()
        iterations = 0
        tool_calls_made = []

        while iterations < max_iterations:
            iterations += 1

            try:
                response = self.client.chat.completions.create(
                    model=model or self.settings.xai_model,
                    messages=current_messages,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    tools=tools,
                    tool_choice="auto"
                )

                message = response.choices[0].message

                # Check if we have tool calls
                if message.tool_calls:
                    # Add assistant message with tool calls
                    current_messages.append({
                        "role": "assistant",
                        "content": message.content,
                        "tool_calls": [
                            {
                                "id": tc.id,
                                "type": "function",
                                "function": {
                                    "name": tc.function.name,
                                    "arguments": tc.function.arguments
                                }
                            }
                            for tc in message.tool_calls
                        ]
                    })

                    # Execute each tool call
                    for tool_call in message.tool_calls:
                        func_name = tool_call.function.name
                        func_args = json.loads(tool_call.function.arguments)

                        logger.info(f"Executing tool: {func_name}")
                        tool_calls_made.append({
                            "name": func_name,
                            "arguments": func_args
                        })

                        # Execute the tool
                        result = await execute_tool(func_name, func_args)

                        # Add tool result
                        current_messages.append({
                            "role": "tool",
                            "tool_call_id": tool_call.id,
                            "content": json.dumps(result)
                        })

                    # Continue the loop for potential follow-up
                    continue

                # No tool calls - we have a final response
                final_content = message.content or ""

                # Save to chat history
                self.db.save_chat_message(
                    role="assistant",
                    content=final_content,
                    tokens=response.usage.total_tokens if response.usage else None
                )

                return {
                    "content": final_content,
                    "tool_calls": tool_calls_made,
                    "iterations": iterations,
                    "tokens_used": response.usage.total_tokens if response.usage else None
                }

            except Exception as e:
                logger.error(f"Chat with tools error: {e}")
                return {
                    "content": f"Error: {str(e)}",
                    "tool_calls": tool_calls_made,
                    "iterations": iterations,
                    "error": str(e)
                }

        # Max iterations reached
        return {
            "content": "Maximum iterations reached",
            "tool_calls": tool_calls_made,
            "iterations": iterations,
            "warning": "max_iterations_reached"
        }

    async def analyze_and_trade(
        self,
        portfolio_state: dict,
        market_data: str,
        recent_trades: list,
        market_status: str = "UNKNOWN",
        trading_mode: str = "AUTO"
    ) -> dict:
        """Run a complete trading analysis with tool calling."""
        # Build the prompt
        positions = portfolio_state.get("positions", [])
        analysis_prompt = get_trading_prompt(
            cash=portfolio_state.get("cash", 0),
            holdings_value=portfolio_state.get("holdings_value", 0),
            total_value=portfolio_state.get("total_value", 0),
            pnl=portfolio_state.get("pnl", 0),
            pnl_percent=portfolio_state.get("pnl_percent", 0),
            positions=positions,
            recent_trades=recent_trades,
            market_data=market_data,
            market_status=market_status,
            trading_mode=trading_mode
        )

        # Save user prompt to chat history
        self.db.save_chat_message(role="user", content=analysis_prompt)

        # Run with tools
        messages = [
            {"role": "system", "content": TRADING_SYSTEM_PROMPT},
            {"role": "user", "content": analysis_prompt}
        ]

        result = await self.chat_with_tools(messages, temperature=0.5)

        self.db.log(
            message=f"Trading analysis complete: {len(result.get('tool_calls', []))} tool calls",
            component="grok",
            level="INFO",
            details={
                "iterations": result.get("iterations"),
                "tools_used": [tc["name"] for tc in result.get("tool_calls", [])]
            }
        )

        return result

    def analyze_market(
        self,
        symbol: str,
        price_history: list[dict],
        current_price: float,
        portfolio_context: str
    ) -> dict:
        """Analyze a stock and provide trading recommendation (legacy method)."""
        price_data = "\n".join([
            f"  {p['date']}: Open={p['open']:.2f}, High={p['high']:.2f}, "
            f"Low={p['low']:.2f}, Close={p['close']:.2f}, Vol={p['volume']}"
            for p in price_history[-10:]
        ])

        prompt = f"""Analyze the following stock data and provide a trading recommendation.

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

        return self._parse_json_response(response, {
            "recommendation": "HOLD",
            "confidence": 0,
            "reasoning": "Failed to parse analysis",
            "risk_score": 100,
            "target_price": None,
            "stop_loss": None
        })

    def decide_trade(
        self,
        portfolio_state: dict,
        market_data: dict,
        recent_trades: list[dict]
    ) -> dict:
        """Make a trading decision (legacy method for compatibility)."""
        recent_trades_str = "\n".join([
            f"  - {t['timestamp']}: {t['action']} {t['quantity']} {t['symbol']} @ ${t['price']:.2f}"
            for t in recent_trades[-5:]
        ]) if recent_trades else "  No recent trades"

        positions_str = "\n".join([
            f"  - {p['symbol']}: {p['quantity']} shares, avg=${p['avg_price']:.2f}, "
            f"current=${p['current_price']:.2f}, P&L={p['pnl']:.2f}"
            for p in portfolio_state.get('positions', [])
        ]) if portfolio_state.get('positions') else "  No open positions"

        prompt = f"""Make a trading decision based on the current state.

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
2. Consider risk management
3. Close losing positions if loss exceeds 10%
4. Take profits on positions up more than 15%

Respond with your decision in JSON format:
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

        return self._parse_json_response(response, {
            "action": "HOLD",
            "symbol": None,
            "quantity": None,
            "reasoning": "Failed to parse decision - holding",
            "risk_score": 0
        })

    def _parse_json_response(self, response: str, default: dict) -> dict:
        """Parse a JSON response with fallback."""
        try:
            response = response.strip()
            if response.startswith("```"):
                response = response.split("```")[1]
                if response.startswith("json"):
                    response = response[4:]
            return json.loads(response)
        except json.JSONDecodeError:
            logger.warning(f"Failed to parse Grok response as JSON: {response[:200]}")
            return default


# Singleton
_grok_client: Optional[GrokClient] = None


def get_grok_client() -> GrokClient:
    global _grok_client
    if _grok_client is None:
        _grok_client = GrokClient()
    return _grok_client
