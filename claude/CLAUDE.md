# Claude Code Instructions

This file provides context for Claude Code when working on this project.

## Project Overview

**Grok Trading** is an autonomous AI trading system with:
- **Frontend**: Next.js 14 dashboard (TypeScript, Tailwind CSS)
- **Backend**: FastAPI server (Python, ib_insync)
- **AI**: xAI Grok model with tool calling for market analysis
- **Broker**: Interactive Brokers for order execution
- **Database**: SQLite for persistence (trades, chat, reflections)
- **Scheduler**: APScheduler for autonomous trading loop

## Directory Structure

```
grok_trading/
├── frontend/           # Next.js 14 dashboard
│   ├── src/
│   │   ├── app/       # App Router (layout.tsx, page.tsx, globals.css)
│   │   ├── components/
│   │   │   ├── ui/         # Icons.tsx
│   │   │   ├── layout/     # Sidebar, Header, RightPanel
│   │   │   └── dashboard/  # Chart, Tables, Logs
│   │   ├── lib/       # api.ts, store.ts, providers.tsx
│   │   ├── hooks/     # useAgentState.ts
│   │   ├── types/     # TypeScript definitions
│   │   └── data/      # mockData.ts (fallback only)
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/            # FastAPI server
│   ├── src/
│   │   ├── api/
│   │   │   ├── main.py      # FastAPI app with scheduler integration
│   │   │   ├── websocket.py # Real-time WebSocket handler
│   │   │   └── routes/      # REST endpoints
│   │   ├── agent/
│   │   │   ├── grok_client.py    # Enhanced Grok with tool calling
│   │   │   ├── trading_agent.py  # Trading logic
│   │   │   ├── reflections.py    # Self-critique system
│   │   │   ├── tools/            # Grok tool definitions & executor
│   │   │   └── prompts/          # System prompts
│   │   ├── broker/         # IBKR integration (ibkr_client.py)
│   │   ├── market_data/    # Yahoo Finance integration
│   │   ├── database/       # SQLite persistence layer
│   │   ├── scheduler/      # APScheduler for auto-trading
│   │   └── config.py       # Pydantic Settings
│   ├── data/               # SQLite database files
│   ├── venv/               # Python virtual environment
│   └── requirements.txt
│
├── claude/             # Claude Code context
│   └── CLAUDE.md       # This file
├── docs/               # Documentation
├── scripts/            # Deployment scripts
├── docker-compose.yml
├── .env.example
└── README.md
```

## Tech Stack

### Frontend
- Next.js 14 (App Router)
- TypeScript (strict mode)
- Tailwind CSS with CSS variables
- Zustand (state management, persisted to localStorage)
- React Query (data fetching, auto-refresh)
- Recharts (charts)
- WebSocket for real-time updates
- date-fns, clsx

### Backend
- FastAPI with CORS middleware
- Python 3.11+
- ib_insync (Interactive Brokers)
- xAI Grok API with tool calling
- SQLAlchemy + SQLite for persistence
- APScheduler for autonomous trading
- Pydantic Settings for config
- uvicorn ASGI server
- WebSocket support

## Core Features

### Autonomous Trading Loop
- APScheduler runs every 30 minutes during market hours
- Market status detection (OPEN, PRE_MARKET, AFTER_HOURS, CLOSED)
- MANUAL/AUTO mode toggle
- Portfolio snapshots every 5 minutes

### Grok Tool Calling
Available tools for AI trading decisions:
- `get_stock_price_history` - Historical OHLCV data
- `get_stock_info` - Company fundamentals
- `get_current_price` - Real-time price
- `trade_stock` - Execute buy/sell/close orders
- `get_portfolio_state` - Current positions and P&L
- `get_trending_stocks` - Trending tickers
- `search_stocks` - Stock search
- `search_news` - News/catalyst search
- `set_stop_loss` - Protective orders
- `set_take_profit` - Profit targets
- `complete_hour_actions` - Log trading sessions

### Reflections System
- Daily reflections at market close (4:05 PM ET)
- Weekly reflections on Fridays
- Analyzes trading performance
- Generates AI self-critique
- Tracks lessons learned and strategy adjustments

### Database Persistence
Tables:
- `trades` - All executed trades
- `chat_messages` - Grok conversation history
- `reflections` - Self-critique records
- `portfolio_snapshots` - Value history
- `system_logs` - Activity logs
- `initial_values` - Starting portfolio value

## Design System

### Theme (CSS Variables)

Dark theme is default. Light theme available via toggle in Settings.

```css
/* Dark */
--color-bg-primary: #0A0A0C
--color-bg-secondary: #111114
--color-bg-tertiary: #18181C
--color-accent-primary: #00D4FF
--color-profit: #4ADE80
--color-loss: #F87171
--color-warning: #FBBF24

/* Light */
--color-bg-primary: #FAFAFA
--color-bg-secondary: #FFFFFF
--color-accent-primary: #0099CC
```

### Typography
- Display: Space Grotesk
- Body: DM Sans
- Mono: JetBrains Mono

### Layout
- Sidebar: 240px (72px collapsed)
- Header: 64px
- Right Panel: 360px (collapsible)
- 100vh fixed viewport (no scroll)

## API Endpoints

Backend runs on port 8000. Frontend connects via `NEXT_PUBLIC_API_URL`.

### Core Endpoints
```
GET  /health                    → { status, ibkr_connected }
GET  /api/agent/status          → AgentState (positions, cash, pnl)
GET  /api/agent/trades          → { trades: Trade[] }
POST /api/agent/analyze         → Trigger AI analysis
POST /api/trade                 → Execute order
GET  /api/portfolio             → Full portfolio
GET  /api/portfolio/history     → Value history
GET  /api/price/{symbol}        → Stock price
```

### Scheduler Endpoints
```
GET  /api/scheduler/status      → { is_running, mode, market_status }
POST /api/scheduler/mode/{mode} → Set MANUAL or AUTO
POST /api/scheduler/trigger     → Manual trigger
```

### Data Endpoints
```
GET  /api/chat/history          → Chat messages
GET  /api/reflections           → Reflection list
POST /api/reflections/generate  → Create reflection
GET  /api/logs                  → System logs
GET  /api/stats                 → Trading statistics
```

### WebSocket
```
WS   /ws                        → Real-time updates
```

Message types: `agent_status`, `trade`, `log`, `portfolio_update`, `chat_message`, `reflection`, `market_status`, `mode_change`

## Key Files to Know

### Frontend
| File | Purpose |
|------|---------|
| `src/app/page.tsx` | Main dashboard with panel routing |
| `src/app/globals.css` | Complete design system (1150+ lines) |
| `src/lib/store.ts` | Zustand state (theme, panels, chart settings) |
| `src/lib/api.ts` | API client with all endpoints + WebSocket |
| `src/lib/providers.tsx` | React Query + Theme sync |
| `src/components/layout/` | Sidebar, Header, RightPanel |
| `src/components/dashboard/` | Chart, Tables, Logs |
| `src/components/ui/Icons.tsx` | 30+ SVG icons |
| `src/types/index.ts` | All TypeScript interfaces |

### Backend
| File | Purpose |
|------|---------|
| `src/api/main.py` | FastAPI app with scheduler + WebSocket |
| `src/api/websocket.py` | WebSocket connection manager |
| `src/api/routes/agent.py` | Agent status, trades, analyze |
| `src/api/routes/portfolio.py` | Portfolio endpoints |
| `src/api/routes/trading.py` | Trade execution |
| `src/broker/ibkr_client.py` | Interactive Brokers connection |
| `src/agent/grok_client.py` | Grok API with tool calling |
| `src/agent/trading_agent.py` | Trading logic and decisions |
| `src/agent/reflections.py` | Self-critique generation |
| `src/agent/tools/definitions.py` | Tool schemas |
| `src/agent/tools/executor.py` | Tool execution logic |
| `src/agent/prompts/trading.py` | System prompts |
| `src/database/db.py` | SQLite operations |
| `src/database/models.py` | SQLAlchemy models |
| `src/scheduler/trading_scheduler.py` | APScheduler config |
| `src/config.py` | Settings with environment variables |

## Common Tasks

### Start Development

```bash
# Frontend (Terminal 1)
cd frontend
npm run dev    # http://localhost:3000

# Backend (Terminal 2) - Windows
cd backend
venv\Scripts\python.exe -m uvicorn src.api.main:app --reload --port 8000

# Backend (Terminal 2) - Linux/Mac
cd backend
source venv/bin/activate
python -m uvicorn src.api.main:app --reload --port 8000
```

### Enable Auto Trading
```bash
# Via API
curl -X POST http://localhost:8000/api/scheduler/mode/AUTO

# Or use the dashboard toggle
```

### Add a new Grok tool
1. Add tool definition in `src/agent/tools/definitions.py`
2. Add handler in `src/agent/tools/executor.py`
3. Tool is automatically available to Grok

### Add a new API endpoint
1. Create route in `backend/src/api/routes/` or add to `main.py`
2. Add client function in `frontend/src/lib/api.ts`
3. Add React Query hook if needed

### Modify theme
1. Update CSS variables in `globals.css` under `[data-theme="dark"]` and `[data-theme="light"]`
2. Use `var(--color-name)` in components

## Code Style

### TypeScript
- Strict mode enabled
- Prefer interfaces over types
- Use `type` imports for types only
- Explicit return types on functions

### React
- Functional components only
- Custom hooks for data fetching
- Zustand for global state
- React Query for server state

### CSS
- Tailwind utilities + CSS variables
- Use `clsx` for conditional classes
- Animations defined in globals.css
- No inline styles

### Python
- Type hints required
- Ruff for formatting
- Pydantic for validation
- Loguru for logging
- Async/await for I/O operations

### Naming
- Components: PascalCase
- Files: PascalCase for components, camelCase for utils
- CSS variables: `--color-category-name`
- Zustand actions: camelCase verbs (`setTheme`, `toggleSidebar`)

## Environment Variables

### Required (.env in root)

```bash
# xAI Grok API
XAI_API_KEY=xai-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
XAI_MODEL=grok-4-1-fast-reasoning

# Interactive Brokers
IBKR_HOST=127.0.0.1
IBKR_PORT=4002          # Paper: 4002, Live: 4001
IBKR_CLIENT_ID=2        # Must be unique per connection
IBKR_ACCOUNT=DU1234567  # Your account ID

# Application
APP_ENV=development
LOG_LEVEL=INFO
TRADING_INTERVAL_MINUTES=30

# API
API_HOST=0.0.0.0
API_PORT=8000

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

Note: Initial portfolio value is automatically captured from IBKR and stored in the database.

## Pre-commit Rules

Before each commit:
1. Update README.md if architecture changes
2. Update this CLAUDE.md if structure changes
3. Run `npm run build` in frontend to verify no errors
4. Update types if API changes
5. Never commit .env files or API keys

## Important Notes

- Dashboard is single-page, 100vh (no scroll)
- Theme is persisted to localStorage
- Falls back to mock data when backend offline
- All monetary values in USD
- Times displayed in Paris and New York timezones
- Real IBKR data takes priority over mock data
- Database stored in `backend/data/grok_trading.db`
- Scheduler starts in MANUAL mode by default

## Troubleshooting

### CORS Errors
- Backend must be running on port 8000
- Check CORS middleware in `src/api/main.py`
- Verify `NEXT_PUBLIC_API_URL` in frontend

### IBKR Connection Failed
- Ensure TWS/Gateway is running
- Check `IBKR_CLIENT_ID` is not already in use
- Verify port 4002 (paper) or 4001 (live)
- Check firewall allows localhost connections

### Build Fails
- Check TypeScript errors: `npm run build`
- Verify imports match exports
- Check types match API responses

### Theme Not Persisting
- Check localStorage for `grok-trading-storage`
- Verify Zustand persist middleware

### Scheduler Not Running
- Check `/api/scheduler/status`
- Verify APScheduler is installed
- Check timezone configuration

### Database Issues
- Database file: `backend/data/grok_trading.db`
- Delete file to reset (will recreate on startup)
- Check SQLAlchemy logs for errors

## Security

- Never commit API keys or credentials
- Use environment variables for all secrets
- Paper trading only unless explicitly authorized
- Rotate API keys regularly
- Keep dependencies updated
