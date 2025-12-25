# PROJECT.md - Grok Trading Bot

This file provides guidance when working with code in this repository.

## Project Overview

**Grok Trading Bot** is an automated trading system that uses xAI's Grok model to analyze market data and execute trades on US equities via Interactive Brokers (IBKR) Paper Trading account.

**Author**: Nolan Cacheux
**Mode**: Paper Trading (simulated money)
**Target Market**: US Equities (NYSE, NASDAQ)
**Trading Model**: Grok (xAI) only

## Repository Structure

```
grok_trading/
├── .config/                    # Project configuration
│   ├── PROJECT.md             # Project documentation (this file)
│   └── INSTRUCTIONS.md        # Development instructions
├── backend/                    # Python backend
│   ├── src/
│   │   ├── agent/             # Grok trading agent
│   │   │   ├── grok_agent.py  # Main agent logic
│   │   │   ├── tools/         # Trading tools
│   │   │   │   ├── trade_stock.py
│   │   │   │   ├── get_stock_price_history.py
│   │   │   │   └── complete_hour_actions.py
│   │   │   └── prompts/       # System prompts
│   │   ├── broker/            # IBKR integration
│   │   │   ├── ibkr_client.py
│   │   │   ├── gateway.py
│   │   │   └── orders.py
│   │   ├── market_data/       # Market data providers
│   │   │   └── yahoo_finance.py
│   │   ├── api/               # FastAPI endpoints
│   │   │   ├── main.py
│   │   │   ├── routes/
│   │   │   └── websocket.py
│   │   └── utils/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                   # React/Next.js dashboard
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   └── styles/
│   ├── package.json
│   └── Dockerfile
├── scripts/                    # Deployment scripts
│   ├── setup-vps.sh           # VPS initial setup
│   ├── backup.sh              # Automated backup
│   └── restore.sh             # Restore from backup
├── docker-compose.yml          # Development Docker setup
├── docker-compose.prod.yml     # Production Docker setup
├── Caddyfile                   # Reverse proxy config
├── DEPLOYMENT.md               # Deployment guide
├── .env.example
└── README.md
```

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         VPS (Ubuntu)                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐  │
│  │   Frontend  │◄──►│   Backend   │◄──►│   IBKR Gateway      │  │
│  │  (Next.js)  │    │  (FastAPI)  │    │   (IBC + TWS API)   │  │
│  └─────────────┘    └──────┬──────┘    └──────────┬──────────┘  │
│                            │                       │             │
│                            ▼                       ▼             │
│                     ┌─────────────┐         ┌───────────┐       │
│                     │  Grok API   │         │   IBKR    │       │
│                     │   (xAI)     │         │  Servers  │       │
│                     └─────────────┘         └───────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

### Trading Agent Architecture

The agent follows a **ReAct pattern** with these tools:

| Tool | Description |
|------|-------------|
| `get_stock_price_history` | Fetch historical OHLCV data for analysis |
| `trade_stock` | Execute buy/sell/close orders via IBKR |
| `complete_hour_actions` | Log hourly summary with reasoning |
| `web_search` | Search for news and market sentiment (via Grok's X integration) |

### Agent Loop (Every 30 minutes during market hours)

1. **Fetch Current State**: Portfolio positions, cash balance, P&L
2. **Market Analysis**: Get price history, search for news/catalysts
3. **Decision Making**: Grok analyzes and decides (buy/sell/hold)
4. **Execution**: Send orders to IBKR via API
5. **Logging**: Record decision reasoning and results
6. **Self-Critique**: Every 5 trades, evaluate performance

### Data Models

**Agent State**:
```json
{
  "name": "Grok",
  "pnl": 20.94,
  "status": "IDLE",
  "cash": 1302.58,
  "holdings": 0,
  "positions": [],
  "chatHistory": []
}
```

**Trade Order**:
```json
{
  "symbol": "NVDA",
  "action": "buy",
  "order_type": "market",
  "quantity": 10,
  "reasoning": "Strong momentum on earnings beat",
  "evaluated_risk": 75
}
```

**Trade Result**:
```json
{
  "status": "filled",
  "order_executed": true,
  "executed_price_usd": 145.50,
  "total_value_usd": 1455.00,
  "fee_usd": 1.50,
  "cash_usd_after": 543.50,
  "timestamp": "2025-12-24T15:30:00Z"
}
```

## Tech Stack

### Backend
- **Language**: Python 3.12+
- **Framework**: FastAPI + Uvicorn
- **IBKR Integration**: ib_insync (TWS API wrapper)
- **Task Scheduling**: APScheduler
- **WebSocket**: FastAPI WebSocket for real-time updates
- **Database**: SQLite (local) / PostgreSQL (production)

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + custom cyberpunk theme
- **Charts**: Lightweight Charts (TradingView) or Recharts
- **State**: React Query + Zustand
- **WebSocket**: Socket.io client

### Infrastructure
- **VPS**: Ubuntu 22.04 LTS
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Caddy (auto HTTPS)
- **Process Manager**: systemd

## Key Environment Variables

```bash
# Grok API (xAI)
XAI_API_KEY=your_xai_api_key

# IBKR Configuration
IBKR_HOST=127.0.0.1
IBKR_PORT=4002  # Paper trading port (4001 for live)
IBKR_CLIENT_ID=1
IBKR_ACCOUNT=DU1234567  # Paper account ID

# Application
APP_ENV=development
LOG_LEVEL=INFO
INITIAL_CASH=1000.00
TRADING_INTERVAL_MINUTES=30

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

## Common Commands

```bash
# Backend (local development)
cd backend
python -m venv venv
source venv/bin/activate  # Linux/Mac
.\venv\Scripts\activate   # Windows
pip install -r requirements.txt
uvicorn src.api.main:app --reload

# Frontend (local development)
cd frontend
npm install
npm run dev

# Docker (development)
docker compose up -d
docker compose logs -f
docker compose down

# Docker (production)
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f
docker compose -f docker-compose.prod.yml down

# IBKR Gateway
# Start IBC (IBKR Controller) - see docs/IBKR_SETUP.md
```

## IBKR Paper Trading Setup (France)

### Step 1: Create IBKR Account
1. Go to https://www.interactivebrokers.eu/
2. Click "Open Account" → Select "Individual"
3. Choose "France" as country of residence
4. Complete identity verification (CNI/Passport)
5. No minimum deposit required for paper trading

### Step 2: Enable Paper Trading
1. Login to Client Portal: https://portal.interactivebrokers.eu/
2. Go to Settings → Paper Trading Account
3. Click "Create Paper Trading Account"
4. Note your paper account ID (starts with DU)

### Step 3: Install TWS or IB Gateway
1. Download from: https://www.interactivebrokers.com/en/trading/tws.php
2. Install "IB Gateway" (lighter than TWS)
3. Configure for paper trading (port 4002)

### Step 4: API Configuration
1. In IB Gateway: Configure → Settings → API → Settings
2. Enable "Enable ActiveX and Socket Clients"
3. Set Socket Port to 4002 (paper) or 4001 (live)
4. Add trusted IP: 127.0.0.1

## VPS Setup Guide

### Requirements
- Ubuntu 22.04 LTS
- 2 vCPU, 4GB RAM minimum
- 50GB SSD storage
- Static IP address

### Security Checklist
- [ ] SSH key authentication only (disable password)
- [ ] UFW firewall configured
- [ ] Fail2ban installed
- [ ] Non-root user created
- [ ] Automatic security updates enabled
- [ ] HTTPS with valid certificate
- [ ] Environment variables in secure location
- [ ] Regular backups configured

### Recommended VPS Providers (EU)
- Hetzner (Germany) - Best value
- OVH (France) - Local option
- Scaleway (France) - Good for beginners
- DigitalOcean (EU regions)

## Code Style

- **Python**: 3.12+, Ruff formatter, type hints required
- **TypeScript**: Strict mode, ESLint + Prettier
- **Line length**: 100 characters
- **Commits**: Conventional commits (feat/fix/docs/refactor)

## Risk Management

### Trading Rules
- Maximum 95% portfolio allocation per trade
- Risk score evaluation (0-100) for each trade
- Self-critique every 5 trades
- No trading outside market hours (9:30-16:00 ET)
- Automatic position closure if P&L < -20%

### Paper Trading Limitations
- Simulated fills (may differ from real market)
- No real market impact
- Some order types may behave differently
- Good for strategy testing, not performance prediction

## Best Practices

### Security
1. Never commit API keys or credentials
2. Use environment variables for all secrets
3. Rotate API keys regularly
4. Monitor for unauthorized access
5. Keep dependencies updated

### Trading Bot
1. Always start with paper trading
2. Log all decisions with reasoning
3. Implement circuit breakers
4. Monitor API rate limits
5. Handle market holidays gracefully

### Development
1. Write tests for critical paths
2. Use type hints everywhere
3. Document all trading logic
4. Keep PROJECT.md updated
5. Review code before merging

## Project Phases

### Phase 1: Foundation ✅
- [x] Project setup and documentation
- [x] IBKR paper trading account creation (DU0366274)
- [x] Basic backend structure (FastAPI)
- [x] IBKR API integration (ib_insync)
- [x] Grok API integration (grok-4-1-fast-reasoning)

### Phase 2: Trading Agent ✅
- [x] Implement trading tools
- [x] Create agent loop with stop-loss/take-profit
- [x] Add market data integration (Yahoo Finance)
- [x] Implement logging system (loguru)

### Phase 3: Frontend Dashboard ✅
- [x] Cyberpunk theme design
- [x] Build real-time dashboard with React Query
- [x] Add performance charts
- [x] Connect frontend to backend API

### Phase 4: VPS Deployment ✅
- [x] Setup VPS with security hardening (setup-vps.sh)
- [x] Docker deployment (Dockerfiles, docker-compose, Caddy)
- [x] Monitoring and alerting (Uptime Kuma)
- [x] Automated backups (backup.sh, restore.sh)

### Phase 5: Optimization
- [ ] Performance tuning
- [ ] Strategy refinement
- [ ] Advanced analytics
- [ ] Mobile-friendly UI
