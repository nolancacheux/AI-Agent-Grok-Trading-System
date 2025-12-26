# Grok Trading Bot

An autonomous AI-powered trading system using xAI's Grok model for biotech stock analysis and execution via Interactive Brokers.

![Dashboard Preview](docs/assets/dashboard-preview.png)

## Overview

Grok Trading is a complete trading infrastructure that combines:

- **AI Analysis Engine**: Uses xAI Grok for market analysis, stock screening, and trade decisions
- **Interactive Brokers Integration**: Real order execution with live market data
- **Professional Dashboard**: Real-time monitoring with Apple-inspired dark/light UI
- **Automated Trading**: Configurable auto/manual modes with risk management

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js 14)                    │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │   Sidebar   │  │    Header    │  │     Right Panel        │ │
│  │  Navigation │  │ Status/Clock │  │  Neural/Chat/Reflect   │ │
│  └─────────────┘  └──────────────┘  └────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   Main Dashboard                          │  │
│  │  Portfolio Chart | Positions | Balance | Transactions    │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ REST API / WebSocket
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Backend (FastAPI)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐│
│  │ Agent Routes │  │Trading Routes│  │   Portfolio Routes     ││
│  └──────────────┘  └──────────────┘  └────────────────────────┘│
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Grok AI Agent                          │  │
│  │  Analysis → Screening → Decision → Risk Check → Execute  │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ ib_insync
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Interactive Brokers Gateway/TWS                    │
│                    Live Market Access                           │
└─────────────────────────────────────────────────────────────────┘
```

## Features

### Dashboard
- **Portfolio Value History**: Interactive chart with $ / % toggle, time range selectors (1H/24H/7D/ALL)
- **Active Holdings**: Real-time positions with P&L tracking
- **Portfolio Balance**: Cash, holdings, cost basis, unrealized P&L
- **Transactions**: Complete trade history with risk indicators
- **System Logs**: Live activity feed from the AI agent
- **Dual Timezone**: Paris & New York clocks
- **Theme Toggle**: Apple-style dark/light mode

### AI Agent
- **Market Analysis**: Grok-powered analysis of biotech catalysts
- **Stock Screening**: Intelligent filtering based on volume, momentum, catalysts
- **Trade Decisions**: Risk-adjusted position sizing
- **Reflections**: Self-critique and learning from past trades
- **Chat Interface**: Natural language interaction with the agent

### Trading
- **Order Types**: Market orders via Interactive Brokers
- **Risk Management**: Position limits, daily loss limits
- **Mode Control**: Manual or automatic execution
- **Paper Trading**: Safe testing with paper account

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| Next.js 14 | React framework with App Router |
| TypeScript | Type-safe development |
| Tailwind CSS | Utility-first styling |
| Recharts | Interactive charts |
| Zustand | State management |
| React Query | Server state & caching |
| date-fns | Date formatting |

### Backend
| Technology | Purpose |
|------------|---------|
| FastAPI | Async Python API |
| ib_insync | Interactive Brokers SDK |
| xAI Grok | AI analysis engine |
| Pydantic | Data validation |
| uvicorn | ASGI server |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| Docker | Containerization |
| Caddy | Reverse proxy with auto-SSL |
| Uptime Kuma | Monitoring |

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.11+
- Interactive Brokers Gateway/TWS running
- xAI API key

### 1. Clone & Install

```bash
git clone https://github.com/nolancacheux/grok_trading.git
cd grok_trading

# Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd ../frontend
npm install
```

### 2. Configure Environment

```bash
# Root .env
cp .env.example .env
```

```env
# xAI
XAI_API_KEY=your_xai_api_key

# Interactive Brokers
IBKR_HOST=127.0.0.1
IBKR_PORT=4002
IBKR_CLIENT_ID=1
IBKR_ACCOUNT=your_account_id

# Application
APP_ENV=development
LOG_LEVEL=DEBUG
```

### 3. Start Services

```bash
# Terminal 1: Backend
cd backend
python -m uvicorn src.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm run dev
```

### 4. Access Dashboard

Open http://localhost:3000

## Project Structure

```
grok_trading/
├── frontend/                 # Next.js dashboard
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── layout.tsx   # Root layout with theme
│   │   │   ├── page.tsx     # Main dashboard
│   │   │   └── globals.css  # Design system (1150 lines)
│   │   ├── components/
│   │   │   ├── ui/          # Icons, primitives
│   │   │   ├── layout/      # Sidebar, Header, RightPanel
│   │   │   └── dashboard/   # Chart, Tables, Logs
│   │   ├── lib/
│   │   │   ├── api.ts       # API client
│   │   │   ├── store.ts     # Zustand state
│   │   │   └── providers.tsx # React Query + Theme
│   │   ├── hooks/           # Custom React hooks
│   │   └── types/           # TypeScript definitions
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/                  # FastAPI server
│   ├── src/
│   │   ├── api/
│   │   │   └── routes/      # REST endpoints
│   │   ├── agent/           # Grok AI agent
│   │   ├── trading/         # IBKR integration
│   │   └── main.py          # App entry point
│   └── requirements.txt
│
├── docs/                     # Documentation
│   ├── IBKR_SETUP.md
│   └── VPS_SETUP.md
│
├── scripts/                  # Deployment scripts
├── docker-compose.yml        # Development
├── docker-compose.prod.yml   # Production
├── Caddyfile                 # Reverse proxy
└── DEPLOYMENT.md             # VPS deployment guide
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Service health + IBKR connection |
| `/api/agent/status` | GET | Agent state, positions, P&L |
| `/api/agent/trades` | GET | Trade history |
| `/api/agent/analyze` | POST | Trigger AI analysis |
| `/api/portfolio` | GET | Full portfolio state |
| `/api/portfolio/positions` | GET | Current positions |
| `/api/trade` | POST | Execute trade order |
| `/api/price/{symbol}` | GET | Get stock price |

## Design System

### Colors (Dark Theme)
| Token | Value | Usage |
|-------|-------|-------|
| `--color-bg-primary` | #0A0A0C | Main background |
| `--color-bg-secondary` | #111114 | Cards, sidebar |
| `--color-accent-primary` | #00D4FF | Highlights, links |
| `--color-profit` | #4ADE80 | Positive values |
| `--color-loss` | #F87171 | Negative values |

### Typography
- **Display**: Space Grotesk
- **Body**: DM Sans
- **Mono**: JetBrains Mono

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for VPS deployment instructions.

### Docker (Development)

```bash
docker compose up -d
```

### Docker (Production)

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Monitoring

- **Dashboard**: Real-time at http://localhost:3000
- **API Health**: http://localhost:8000/health
- **Uptime Kuma**: http://localhost:3001 (if deployed)

## Security Considerations

- Never commit `.env` files
- Use paper trading account for testing
- Enable 2FA on Interactive Brokers
- Rotate API keys regularly
- Use SSH keys for VPS access

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Disclaimer

This software is for educational purposes only. Trading involves substantial risk of loss. Use at your own risk. The authors are not responsible for any financial losses incurred.

---

Built with xAI Grok + Interactive Brokers
