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
import type { AgentState, Trade } from '@/types';

export default function Dashboard() {
  const { data: health } = useHealth();
  const { data: agentData } = useAgentState();
  const { data: tradesData } = useTrades();
  const triggerAnalysis = useTriggerAnalysis();

  const isConnected = health?.ibkr_connected ?? false;

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
        quantity: 0,
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
    <div className="min-h-screen p-6">
      <div className="max-w-[1600px] mx-auto space-y-6">
        {!isConnected && (
          <div className="flex items-center gap-3 p-4 bg-accent-yellow/10 border border-accent-yellow/20 rounded-md">
            <div className="w-2 h-2 bg-accent-yellow rounded-full" />
            <span className="text-sm text-accent-yellow">
              Backend offline - Using demonstration data
            </span>
          </div>
        )}

        <Header
          totalValue={agentState.totalValue}
          pnl={agentState.pnl}
          pnlPercent={agentState.pnlPercent}
          agentStatus={agentState.status}
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 space-y-6">
            <PerformanceChart
              data={mockPortfolioHistory}
              initialValue={agentState.initialValue}
            />

            <PositionsTable
              positions={agentState.positions}
              onClosePosition={handleClosePosition}
            />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <AgentStatusCard
              agent={agentState}
              lastTrade={trades[0]}
              onTriggerAnalysis={isConnected ? handleTriggerAnalysis : undefined}
              isAnalyzing={triggerAnalysis.isPending}
            />

            <StatsPanel stats={mockDailyStats} />
          </div>

          <div className="lg:col-span-12">
            <ActivityLog trades={trades} />
          </div>
        </div>

        <footer className="pt-6 border-t border-border-primary">
          <div className="flex items-center justify-between text-xs text-text-muted">
            <div className="flex items-center gap-4">
              <span>Trading Dashboard</span>
              <span className="text-border-primary">|</span>
              <span className={isConnected ? 'text-accent-green' : 'text-accent-yellow'}>
                {isConnected ? 'Connected' : 'Offline'} - Paper Trading
              </span>
            </div>
            <span>v0.1.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
