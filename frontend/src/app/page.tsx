'use client';

import {
  Header,
  PerformanceChart,
  PositionsTable,
  ActivityLog,
  AgentStatusCard,
  StatsPanel,
} from '@/components';
import {
  mockAgentState,
  mockRecentTrades,
  mockPortfolioHistory,
  mockDailyStats,
} from '@/data/mockData';

export default function Dashboard() {
  const handleClosePosition = (symbol: string) => {
    console.log('Closing position:', symbol);
    // In real app, this would call the API
  };

  return (
    <div className="min-h-screen p-4 md:p-6 lg:p-8">
      {/* Scanline Effect */}
      <div
        className="fixed inset-0 pointer-events-none z-50 opacity-[0.02]"
        style={{
          background: `repeating-linear-gradient(
            0deg,
            transparent,
            transparent 2px,
            rgba(0, 255, 0, 0.03) 2px,
            rgba(0, 255, 0, 0.03) 4px
          )`,
        }}
        aria-hidden="true"
      />

      <div className="max-w-[1920px] mx-auto">
        {/* Header */}
        <Header
          totalValue={mockAgentState.totalValue}
          pnl={mockAgentState.pnl}
          pnlPercent={mockAgentState.pnlPercent}
          agentStatus={mockAgentState.status}
        />

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column - Chart & Positions */}
          <div className="lg:col-span-8 space-y-4">
            {/* Performance Chart */}
            <PerformanceChart
              data={mockPortfolioHistory}
              initialValue={mockAgentState.initialValue}
            />

            {/* Positions Table */}
            <PositionsTable
              positions={mockAgentState.positions}
              onClosePosition={handleClosePosition}
            />
          </div>

          {/* Right Column - Agent Status & Stats */}
          <div className="lg:col-span-4 space-y-4">
            {/* Agent Status Card */}
            <AgentStatusCard
              agent={mockAgentState}
              lastTrade={mockRecentTrades[0]}
            />

            {/* Stats Panel */}
            <StatsPanel stats={mockDailyStats} />
          </div>

          {/* Full Width - Activity Log */}
          <div className="lg:col-span-12">
            <ActivityLog trades={mockRecentTrades} />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-terminal-border text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-terminal-text">
            <span className="text-neon-green font-mono">[</span>
            <span>GROK TRADING BOT</span>
            <span className="text-neon-green font-mono">]</span>
            <span className="mx-2">|</span>
            <span>Paper Trading Mode</span>
            <span className="mx-2">|</span>
            <span className="text-neon-green">v0.1.0</span>
          </div>
          <div className="text-xs text-terminal-text/50 mt-2">
            Market data delayed. For educational purposes only.
          </div>
        </footer>
      </div>

      {/* Corner Decorations */}
      <div className="fixed top-0 left-0 w-20 h-20 pointer-events-none opacity-30">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path
            d="M0 30 L0 0 L30 0"
            fill="none"
            stroke="#00ff00"
            strokeWidth="1"
          />
          <path
            d="M0 20 L0 0 L20 0"
            fill="none"
            stroke="#00ff00"
            strokeWidth="0.5"
            opacity="0.5"
          />
        </svg>
      </div>
      <div className="fixed top-0 right-0 w-20 h-20 pointer-events-none opacity-30">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path
            d="M70 0 L100 0 L100 30"
            fill="none"
            stroke="#00ff00"
            strokeWidth="1"
          />
          <path
            d="M80 0 L100 0 L100 20"
            fill="none"
            stroke="#00ff00"
            strokeWidth="0.5"
            opacity="0.5"
          />
        </svg>
      </div>
      <div className="fixed bottom-0 left-0 w-20 h-20 pointer-events-none opacity-30">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path
            d="M0 70 L0 100 L30 100"
            fill="none"
            stroke="#00ff00"
            strokeWidth="1"
          />
          <path
            d="M0 80 L0 100 L20 100"
            fill="none"
            stroke="#00ff00"
            strokeWidth="0.5"
            opacity="0.5"
          />
        </svg>
      </div>
      <div className="fixed bottom-0 right-0 w-20 h-20 pointer-events-none opacity-30">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path
            d="M70 100 L100 100 L100 70"
            fill="none"
            stroke="#00ff00"
            strokeWidth="1"
          />
          <path
            d="M80 100 L100 100 L100 80"
            fill="none"
            stroke="#00ff00"
            strokeWidth="0.5"
            opacity="0.5"
          />
        </svg>
      </div>
    </div>
  );
}
