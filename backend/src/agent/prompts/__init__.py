"""System prompts for the trading agent."""

from src.agent.prompts.trading import (
    ANALYSIS_PROMPT_TEMPLATE,
    TRADING_SYSTEM_PROMPT,
    get_trading_prompt,
)

__all__ = ["TRADING_SYSTEM_PROMPT", "ANALYSIS_PROMPT_TEMPLATE", "get_trading_prompt"]
