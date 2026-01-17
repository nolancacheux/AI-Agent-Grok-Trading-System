import yfinance as yf
from loguru import logger


class YahooFinanceClient:
    """Market data provider using Yahoo Finance."""

    def get_stock_price(self, symbol: str) -> float | None:
        """Get current stock price."""
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period="1d")
            if not data.empty:
                return float(data["Close"].iloc[-1])
            return None
        except Exception as e:
            logger.error(f"Failed to get price for {symbol}: {e}")
            return None

    def get_price_history(
        self, symbol: str, period: str = "1mo", interval: str = "1d"
    ) -> list[dict]:
        """Get historical price data.

        Args:
            symbol: Stock ticker symbol
            period: Data period (1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max)
            interval: Data interval (1m, 2m, 5m, 15m, 30m, 60m, 90m, 1h, 1d, 5d, 1wk, 1mo, 3mo)

        Returns:
            List of price data dictionaries
        """
        try:
            ticker = yf.Ticker(symbol)
            data = ticker.history(period=period, interval=interval)

            history = []
            for idx, row in data.iterrows():
                history.append(
                    {
                        "date": idx.strftime("%Y-%m-%d %H:%M"),
                        "open": float(row["Open"]),
                        "high": float(row["High"]),
                        "low": float(row["Low"]),
                        "close": float(row["Close"]),
                        "volume": int(row["Volume"]),
                    }
                )

            return history

        except Exception as e:
            logger.error(f"Failed to get history for {symbol}: {e}")
            return []

    def get_stock_info(self, symbol: str) -> dict:
        """Get stock information."""
        try:
            ticker = yf.Ticker(symbol)
            info = ticker.info

            return {
                "symbol": symbol,
                "name": info.get("longName", symbol),
                "sector": info.get("sector", "Unknown"),
                "industry": info.get("industry", "Unknown"),
                "market_cap": info.get("marketCap", 0),
                "pe_ratio": info.get("trailingPE", 0),
                "dividend_yield": info.get("dividendYield", 0),
                "52_week_high": info.get("fiftyTwoWeekHigh", 0),
                "52_week_low": info.get("fiftyTwoWeekLow", 0),
                "avg_volume": info.get("averageVolume", 0),
            }

        except Exception as e:
            logger.error(f"Failed to get info for {symbol}: {e}")
            return {"symbol": symbol, "name": symbol}

    def get_trending_tickers(self) -> list[str]:
        """Get trending stock tickers."""
        # Common actively traded stocks
        return ["AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AMD", "NFLX", "INTC"]

    def search_stocks(self, query: str) -> list[dict]:
        """Search for stocks by query."""
        try:
            # yfinance doesn't have built-in search, return common matches
            common_stocks = {
                "apple": "AAPL",
                "microsoft": "MSFT",
                "google": "GOOGL",
                "amazon": "AMZN",
                "nvidia": "NVDA",
                "meta": "META",
                "tesla": "TSLA",
                "netflix": "NFLX",
                "amd": "AMD",
                "intel": "INTC",
            }

            query_lower = query.lower()
            results = []

            for name, symbol in common_stocks.items():
                if query_lower in name or query_lower.upper() == symbol:
                    info = self.get_stock_info(symbol)
                    results.append(info)

            return results

        except Exception as e:
            logger.error(f"Search failed: {e}")
            return []


# Singleton
_yahoo_client: YahooFinanceClient | None = None


def get_yahoo_client() -> YahooFinanceClient:
    global _yahoo_client
    if _yahoo_client is None:
        _yahoo_client = YahooFinanceClient()
    return _yahoo_client
