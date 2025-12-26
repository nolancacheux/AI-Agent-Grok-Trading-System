"""Tool definitions for Grok AI function calling."""

from typing import List

# Tool definitions for OpenAI-compatible function calling
TRADING_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_stock_price_history",
            "description": "Get historical price data for a stock symbol. Returns OHLCV data for analysis.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock ticker symbol (e.g., 'AAPL', 'NVDA', 'TSLA')"
                    },
                    "period": {
                        "type": "string",
                        "description": "Time period for history",
                        "enum": ["1d", "5d", "1mo", "3mo", "6mo", "1y", "2y", "5y", "max"],
                        "default": "1mo"
                    },
                    "interval": {
                        "type": "string",
                        "description": "Data interval",
                        "enum": ["1m", "5m", "15m", "30m", "1h", "1d", "1wk", "1mo"],
                        "default": "1h"
                    }
                },
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_stock_info",
            "description": "Get detailed information about a stock including market cap, P/E ratio, sector, and other fundamentals.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    }
                },
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_current_price",
            "description": "Get the current/latest price for a stock symbol.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    }
                },
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "trade_stock",
            "description": "Execute a stock trade (buy, sell, or close position). Use this when you've decided to make a trade.",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "description": "Trade action to take",
                        "enum": ["buy", "sell", "close"]
                    },
                    "symbol": {
                        "type": "string",
                        "description": "Stock ticker symbol"
                    },
                    "quantity": {
                        "type": "integer",
                        "description": "Number of shares to trade (required for buy/sell, optional for close)"
                    },
                    "order_type": {
                        "type": "string",
                        "description": "Order type",
                        "enum": ["market", "limit"],
                        "default": "market"
                    },
                    "limit_price": {
                        "type": "number",
                        "description": "Limit price (required if order_type is 'limit')"
                    },
                    "reasoning": {
                        "type": "string",
                        "description": "Explanation for why this trade is being made"
                    },
                    "risk_score": {
                        "type": "integer",
                        "description": "Risk assessment 0-100 (0=low risk, 100=high risk)",
                        "minimum": 0,
                        "maximum": 100
                    }
                },
                "required": ["action", "symbol", "reasoning"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_portfolio_state",
            "description": "Get current portfolio state including cash, positions, P&L, and total value.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_trending_stocks",
            "description": "Get a list of currently trending/popular stocks.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of stocks to return",
                        "default": 10
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_stocks",
            "description": "Search for stocks by name or keyword.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query (company name, sector, etc.)"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "complete_hour_actions",
            "description": "Mark the current trading hour as complete. Call this after you've finished your analysis and any trades for this period. Logs your decision and reasoning.",
            "parameters": {
                "type": "object",
                "properties": {
                    "summary": {
                        "type": "string",
                        "description": "Summary of what was analyzed and decided this hour"
                    },
                    "trades_made": {
                        "type": "integer",
                        "description": "Number of trades executed this hour",
                        "default": 0
                    },
                    "market_sentiment": {
                        "type": "string",
                        "description": "Your assessment of current market sentiment",
                        "enum": ["very_bearish", "bearish", "neutral", "bullish", "very_bullish"]
                    },
                    "next_action_plan": {
                        "type": "string",
                        "description": "What you plan to do next trading period"
                    }
                },
                "required": ["summary"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_recent_trades",
            "description": "Get recent trade history.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of trades to return",
                        "default": 10
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_news",
            "description": "Search for recent news and catalysts about a stock or topic. Uses web search to find relevant articles.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query for news (e.g., 'NVDA earnings', 'tech sector news')"
                    },
                    "symbol": {
                        "type": "string",
                        "description": "Optional: specific stock symbol to focus on"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "set_stop_loss",
            "description": "Set a stop-loss order for an existing position.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock symbol for the position"
                    },
                    "stop_price": {
                        "type": "number",
                        "description": "Price at which to trigger the stop-loss"
                    },
                    "percentage": {
                        "type": "number",
                        "description": "Alternative: percentage below current price (e.g., 5 for 5%)"
                    }
                },
                "required": ["symbol"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "set_take_profit",
            "description": "Set a take-profit order for an existing position.",
            "parameters": {
                "type": "object",
                "properties": {
                    "symbol": {
                        "type": "string",
                        "description": "Stock symbol for the position"
                    },
                    "target_price": {
                        "type": "number",
                        "description": "Price at which to take profit"
                    },
                    "percentage": {
                        "type": "number",
                        "description": "Alternative: percentage above entry price (e.g., 10 for 10%)"
                    }
                },
                "required": ["symbol"]
            }
        }
    }
]


def get_tool_definitions() -> List[dict]:
    """Get all tool definitions for function calling."""
    return TRADING_TOOLS


def get_tool_by_name(name: str) -> dict:
    """Get a specific tool definition by name."""
    for tool in TRADING_TOOLS:
        if tool["function"]["name"] == name:
            return tool
    return None
