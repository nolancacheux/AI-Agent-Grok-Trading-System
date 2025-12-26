# Grok Trading Dashboard

A professional, Apple-inspired trading dashboard for the Grok autonomous trading bot.

## Design Philosophy

**"Refined Terminal"** - Blending Bloomberg terminal sophistication with Apple's precision and restraint.

### Aesthetic Highlights
- Deep charcoal backgrounds (#0A0A0C) with electric cyan accents (#00D4FF)
- Space Grotesk display font + DM Sans body + JetBrains Mono for data
- Glassmorphism cards with subtle backdrop blur
- Smooth 200ms transitions on all interactions
- Dual timezone clocks (Paris & New York)

## Features

### Layout
- **100vh fixed viewport** - No scrolling, everything fits on screen
- **Collapsible sidebar** (240px → 72px) - 8 navigation items
- **Collapsible right panel** (360px) - Neural/Chat/Reflections tabs
- **Responsive grid** - Adapts to screen size

### Dashboard Views
1. **Dashboard** (default) - Overview with chart, positions, balance, transactions
2. **Analytics** - Detailed performance chart with balance panel
3. **Positions** - Full-screen active holdings table
4. **Transactions** - Complete trade history
5. **Neural/Chat/Reflections** - Activity in right panel
6. **Settings** - Theme toggle

### Components

| Component | Description |
|-----------|-------------|
| `Sidebar` | Navigation with icons, theme toggle, collapse button |
| `Header` | Agent status, total value, PNL, system status, dual clocks |
| `RightPanel` | Tabbed view: Neural logs, Chat history, Reflections |
| `PortfolioChart` | Recharts area chart with $ / % toggle, time ranges |
| `PositionsTable` | Active holdings with P&L, close button |
| `BalancePanel` | Cash, holdings, cost basis, unrealized P&L |
| `TransactionsTable` | Trade history with risk indicators |
| `SystemLogs` | Real-time activity feed |

## Tech Stack

```
Next.js 14        - App Router, TypeScript strict mode
Tailwind CSS      - Utility-first with CSS variables
Zustand          - Theme, sidebar, panel state (persisted)
React Query      - Server state with auto-refresh
Recharts         - Interactive charts
date-fns         - Date formatting
clsx             - Conditional classes
```

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open http://localhost:3000

### Production Build

```bash
npm run build
npm start
```

## Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Theme initialization, providers
│   ├── page.tsx            # Main dashboard with routing
│   └── globals.css         # Complete design system (1150 lines)
│
├── components/
│   ├── ui/
│   │   └── Icons.tsx       # 30+ custom SVG icons
│   ├── layout/
│   │   ├── Sidebar.tsx     # Navigation menu
│   │   ├── Header.tsx      # Status bar with clocks
│   │   └── RightPanel.tsx  # Neural/Chat/Reflections
│   └── dashboard/
│       ├── PortfolioChart.tsx
│       ├── PositionsTable.tsx
│       ├── BalancePanel.tsx
│       ├── TransactionsTable.tsx
│       └── SystemLogs.tsx
│
├── lib/
│   ├── api.ts              # API client with endpoints
│   ├── store.ts            # Zustand state management
│   └── providers.tsx       # React Query + Theme sync
│
├── hooks/
│   └── useAgentState.ts    # Data fetching hooks
│
├── types/
│   └── index.ts            # TypeScript definitions
│
└── data/
    └── mockData.ts         # Fallback demo data
```

## Design System

### CSS Variables

```css
/* Dark Theme (default) */
--color-bg-primary: #0A0A0C
--color-bg-secondary: #111114
--color-bg-tertiary: #18181C
--color-accent-primary: #00D4FF
--color-profit: #4ADE80
--color-loss: #F87171
--color-warning: #FBBF24
--color-info: #60A5FA

/* Light Theme */
--color-bg-primary: #FAFAFA
--color-bg-secondary: #FFFFFF
--color-accent-primary: #0099CC
--color-profit: #16A34A
--color-loss: #DC2626
```

### Typography

```css
--font-display: 'Space Grotesk'    /* Headings, titles */
--font-body: 'DM Sans'             /* Body text, labels */
--font-mono: 'JetBrains Mono'      /* Numbers, data, code */
```

### Spacing

```css
--sidebar-width: 240px
--sidebar-collapsed: 72px
--header-height: 64px
--panel-gap: 16px
--radius-sm: 6px
--radius-md: 10px
--radius-lg: 14px
```

## State Management

### Zustand Store (`lib/store.ts`)

```typescript
interface AppState {
  theme: 'dark' | 'light'
  activePanel: ActivePanel
  sidebarCollapsed: boolean
  rightPanelOpen: boolean
  rightPanelTab: 'neural' | 'chat' | 'reflections'
  chartMode: 'dollar' | 'percent'
  chartTimeRange: '1H' | '24H' | '7D' | 'ALL'
  // ... actions
}
```

State is persisted to localStorage for theme and sidebar preferences.

## API Integration

### Endpoints Used

```typescript
GET  /health              → Connection status
GET  /api/agent/status    → Agent state, positions
GET  /api/agent/trades    → Trade history
POST /api/agent/analyze   → Trigger analysis
POST /api/trade           → Execute order
```

### Data Fetching

- Agent state: Every 5 seconds
- Trades: Every 10 seconds
- Health check: Every 10 seconds

Falls back to mock data when backend is offline.

## Keyboard Shortcuts (Planned)

| Key | Action |
|-----|--------|
| `[` | Toggle sidebar |
| `]` | Toggle right panel |
| `D` | Dark mode |
| `L` | Light mode |
| `1-8` | Navigate to panel |

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Performance

- First Load JS: ~213 kB
- Static generation for all routes
- Auto-refresh with React Query
- Optimized Recharts rendering

## License

MIT
