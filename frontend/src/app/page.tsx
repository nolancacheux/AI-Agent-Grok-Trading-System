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
import { useAgentState, useTrades, useHealth, useTriggerAnalysis } from '@/hooks/useAgentState';
import { executeTrade } from '@/lib/api';
import type { AgentState, Trade, Position } from '@/types';

export default function Dashboard() {
  const { data: health } = useHealth();
  const { data: agentData, isLoading: agentLoading, error: agentError } = useAgentState();
  const { data: tradesData } = useTrades();
  const triggerAnalysis = useTriggerAnalysis();

  const isConnected = health?.ibkr_connected ?? false;

  // Transform API data to match component types or use mock data
  const agentState: AgentState = agentData ? {
    name: agentData.name,
    status: agentData.status,
    cash: agentData.cash,
    initialValue: agentData.initial_value,
    totalValue: agentData.total_value,
    pnl: agentData.pnl,
    pnlPercent: agentData.pnl_percent,
    positions: agentData.positions.map(p => ({
      symbol: p.symbol,
      quantity: p.quantity,
      avgPrice: p.avg_price,
      currentPrice: p.current_price,
      value: p.quantity * p.current_price,
      pnl: (p.current_price - p.avg_price) * p.quantity,
      pnlPercent: p.avg_price > 0 ? ((p.current_price - p.avg_price) / p.avg_price) * 100 : 0,
    })),
    holdings: agentData.positions.reduce((sum, p) => sum + p.quantity * p.current_price, 0),
    chatHistory: [],
    lastAction: agentData.last_action || '',
    lastActionTime: agentData.last_action_time || '',
  } : mockAgentState;

  const trades: Trade[] = tradesData?.trades?.map(t => ({
    id: t.id,
    timestamp: t.timestamp,
    action: t.action,
    symbol: t.symbol,
    quantity: t.quantity,
    price: t.price,
    totalValue: t.total_value,
    fee: t.fee,
    reasoning: t.reasoning,
    evaluatedRisk: t.risk_score,
    status: t.status || 'filled',
  })) ?? mockRecentTrades;

  const handleClosePosition = async (symbol: string) => {
    if (!isConnected) {
      console.log('Not connected to IBKR');
      return;
    }

    try {
      const result = await executeTrade({
        symbol,
        action: 'close',
        quantity: 0, // Will be calculated by backend
      });
      console.log('Position closed:', result);
    } catch (error) {
      console.error('Failed to close position:', error);
    }
  };

  const handleTriggerAnalysis = () => {
    if (!isConnected) {
      console.log('Not connected to IBKR');
      return;
    }
    triggerAnalysis.mutate();
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
        {/* Connection Status Banner */}
        {!isConnected && (
          <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span>Backend offline - Using mock data</span>
            </div>
          </div>
        )}

        {/* Header */}
        <Header
          totalValue={agentState.totalValue}
          pnl={agentState.pnl}
          pnlPercent={agentState.pnlPercent}
          agentStatus={agentState.status}
        />

        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column - Chart & Positions */}
          <div className="lg:col-span-8 space-y-4">
            {/* Performance Chart */}
            <PerformanceChart
              data={mockPortfolioHistory}
              initialValue={agentState.initialValue}
            />

            {/* Positions Table */}
            <PositionsTable
              positions={agentState.positions}
              onClosePosition={handleClosePosition}
            />
          </div>

          {/* Right Column - Agent Status & Stats */}
          <div className="lg:col-span-4 space-y-4">
            {/* Agent Status Card */}
            <AgentStatusCard
              agent={agentState}
              lastTrade={trades[0]}
              onTriggerAnalysis={isConnected ? handleTriggerAnalysis : undefined}
              isAnalyzing={triggerAnalysis.isPending}
            />

            {/* Stats Panel */}
            <StatsPanel stats={mockDailyStats} />
          </div>

          {/* Full Width - Activity Log */}
          <div className="lg:col-span-12">
            <ActivityLog trades={trades} />
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t border-terminal-border text-center">
          <div className="flex items-center justify-center gap-2 text-xs text-terminal-text">
            <span className="text-neon-green font-mono">[</span>
            <span>GROK TRADING BOT</span>
            <span className="text-neon-green font-mono">]</span>
            <span className="mx-2">|</span>
            <span className={isConnected ? 'text-neon-green' : 'text-amber-400'}>
              {isConnected ? 'Live' : 'Offline'} - Paper Trading Mode
            </span>
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
          <path d="M0 30 L0 0 L30 0" fill="none" stroke="#00ff00" strokeWidth="1" />
          <path d="M0 20 L0 0 L20 0" fill="none" stroke="#00ff00" strokeWidth="0.5" opacity="0.5" />
        </svg>
      </div>
      <div className="fixed top-0 right-0 w-20 h-20 pointer-events-none opacity-30">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d="M70 0 L100 0 L100 30" fill="none" stroke="#00ff00" strokeWidth="1" />
          <path d="M80 0 L100 0 L100 20" fill="none" stroke="#00ff00" strokeWidth="0.5" opacity="0.5" />
        </svg>
      </div>
      <div className="fixed bottom-0 left-0 w-20 h-20 pointer-events-none opacity-30">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d="M0 70 L0 100 L30 100" fill="none" stroke="#00ff00" strokeWidth="1" />
          <path d="M0 80 L0 100 L20 100" fill="none" stroke="#00ff00" strokeWidth="0.5" opacity="0.5" />
        </svg>
      </div>
      <div className="fixed bottom-0 right-0 w-20 h-20 pointer-events-none opacity-30">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <path d="M70 100 L100 100 L100 70" fill="none" stroke="#00ff00" strokeWidth="1" />
          <path d="M80 100 L100 100 L100 80" fill="none" stroke="#00ff00" strokeWidth="0.5" opacity="0.5" />
        </svg>
      </div>
    </div>
  );
}
