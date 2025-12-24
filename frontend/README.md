# Grok Trading Dashboard

A professional trading dashboard for the Grok automated trading bot.

## Features

- Real-time portfolio performance chart
- Current positions table with P&L tracking
- Activity log with trade reasoning
- Agent status monitoring
- Daily statistics panel
- Cyberpunk/Matrix aesthetic theme

## Tech Stack

- Next.js 14 (App Router)
- TypeScript (strict mode)
- Tailwind CSS
- Recharts for charts
- JetBrains Mono & Orbitron fonts

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

### Development

The dashboard runs on `http://localhost:3000` by default.

Currently using mock data for demonstration. Connect to the backend API by updating the environment variables in `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Root layout with fonts and global styles
│   │   ├── page.tsx        # Main dashboard page
│   │   └── globals.css     # Global styles and custom CSS
│   ├── components/
│   │   ├── Header.tsx           # Portfolio value and status
│   │   ├── PerformanceChart.tsx # Line chart with time range selector
│   │   ├── PositionsTable.tsx   # Current holdings table
│   │   ├── ActivityLog.tsx      # Trade history with reasoning
│   │   ├── AgentStatusCard.tsx  # Agent status and risk gauge
│   │   └── StatsPanel.tsx       # Daily trading statistics
│   ├── data/
│   │   └── mockData.ts     # Mock data and utility functions
│   └── types/
│       └── index.ts        # TypeScript type definitions
├── tailwind.config.ts      # Tailwind configuration
├── package.json
└── tsconfig.json
```

## Design System

### Colors

- Background: `#0a0a0a` (terminal black)
- Primary: `#00ff00` (neon green)
- Danger: `#ff3333` (neon red)
- Warning: `#ffaa00` (amber)
- Info: `#00ffff` (cyan)

### Typography

- Display: Orbitron (futuristic)
- Body: JetBrains Mono (monospace)

### Components

All components use the `terminal-panel` class for consistent styling with:
- Dark gradient background
- Subtle border
- Top highlight line
