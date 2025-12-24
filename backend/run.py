"""
Run the Grok Trading Bot API server.
Usage: python run.py
"""
import uvicorn
from src.config import get_settings


def main():
    settings = get_settings()
    uvicorn.run(
        "src.api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=settings.app_env == "development"
    )


if __name__ == "__main__":
    main()
