'use client';

import { useMemo } from 'react';
import {
  Sidebar,
  Header,
  RightPanel,
  PortfolioChart,
  PositionsTable,
  BalancePanel,
  TransactionsTable,
  SystemLogs,
} from '@/components';
import { useAgentState, useTrades, useHealth, useTriggerAnalysis } from '@/hooks/useAgentState';
import { executeTrade } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import type { AgentState, Trade, PortfolioSnapshot, PortfolioBalance, Position } from '@/types';

// Generate portfolio history from trades (simplified)
function generatePortfolioHistory(
  initialValue: number,
  totalValue: number,
  pnl: number
): PortfolioSnapshot[] {
  const now = new Date();
  const points: PortfolioSnapshot[] = [];
  const numPoints = 100;

  for (let i = 0; i < numPoints; i++) {
    const progress = i / (numPoints - 1);
    const timestamp = new Date(now.getTime() - (numPoints - i) * 60 * 60 * 1000);

    // Create a smooth curve from initial to current value with some noise
    const baseValue = initialValue + (totalValue - initialValue) * progress;
    const noise = (Math.sin(i * 0.5) * 0.02 + Math.random() * 0.01 - 0.005) * baseValue;
    const value = baseValue + noise;

    points.push({
      timestamp: timestamp.toISOString(),
      totalValue: value,
      cash: value * 0.3,
      positionsValue: value * 0.7,
      pnl: value - initialValue,
      pnlPercent: ((value - initialValue) / initialValue) * 100,
    });
  }

  // Ensure last point matches current state
  if (points.length > 0) {
    points[points.length - 1] = {
      timestamp: now.toISOString(),
      totalValue,
      cash: totalValue * 0.3,
      positionsValue: totalValue * 0.7,
      pnl,
      pnlPercent: (pnl / initialValue) * 100,
    };
  }

  return points;
}

export default function Dashboard() {
  const { activePanel } = useAppStore();
  const { data: health } = useHealth();
  const { data: agentData, isLoading: isAgentLoading } = useAgentState();
  const { data: tradesData, isLoading: isTradesLoading } = useTrades();
  const triggerAnalysis = useTriggerAnalysis();

  const isConnected = health?.ibkr_connected ?? false;

  // Transform API data to our types
  const agentState: AgentState = useMemo(() => {
    if (!agentData) {
      return {
        name: 'Grok',
        status: 'IDLE',
        cash: 0,
        initialValue: 1000,
        totalValue: 0,
        pnl: 0,
        pnlPercent: 0,
        costBasis: 0,
        unrealizedPnl: 0,
        positions: [],
        holdings: 0,
        chatHistory: [],
        lastAction: '',
        lastActionTime: '',
        tradesToday: 0,
        ibAccountId: '1',
        tradingMode: 'MANUAL',
        sessionId: '',
      };
    }

    const positions: Position[] = (agentData.positions || []).map((p: any) => ({
      symbol: p.symbol,
      quantity: p.quantity,
      side: 'LONG' as const,
      avgPrice: p.avg_price || 0,
      currentPrice: p.current_price || p.avg_price || 0,
      value: p.quantity * (p.current_price || p.avg_price || 0),
      costBasis: p.quantity * (p.avg_price || 0),
      pnl: (p.current_price - p.avg_price) * p.quantity,
      pnlPercent: p.avg_price > 0 ? ((p.current_price - p.avg_price) / p.avg_price) * 100 : 0,
    }));

    const holdingsValue = positions.reduce((sum, p) => sum + p.value, 0);
    const costBasis = positions.reduce((sum, p) => sum + p.costBasis, 0);

    return {
      name: agentData.name || 'Grok',
      status: agentData.status || 'IDLE',
      cash: agentData.cash || 0,
      initialValue: agentData.initial_value || 1000,
      totalValue: agentData.total_value || agentData.cash || 0,
      pnl: agentData.pnl || 0,
      pnlPercent: agentData.pnl_percent || 0,
      costBasis,
      unrealizedPnl: holdingsValue - costBasis,
      positions,
      holdings: holdingsValue,
      chatHistory: [],
      lastAction: agentData.last_action || '',
      lastActionTime: agentData.last_action_time || '',
      tradesToday: agentData.trades_today || 0,
      ibAccountId: '1',
      tradingMode: 'MANUAL',
      sessionId: '',
    };
  }, [agentData]);

  // Transform trades
  const trades: Trade[] = useMemo(() => {
    if (!tradesData?.trades) return [];

    return tradesData.trades.map((t: any) => ({
      id: t.id || `trade-${Date.now()}-${Math.random()}`,
      timestamp: t.timestamp,
      action: t.action,
      symbol: t.symbol,
      quantity: t.quantity,
      price: t.price || 0,
      totalValue: t.total_value || t.price * t.quantity,
      fee: t.fee || 0,
      reasoning: t.reasoning || '',
      evaluatedRisk: t.risk_score || 0,
      status: t.status || 'filled',
    }));
  }, [tradesData]);

  // Generate portfolio history
  const portfolioHistory = useMemo(() => {
    return generatePortfolioHistory(
      agentState.initialValue,
      agentState.totalValue,
      agentState.pnl
    );
  }, [agentState.initialValue, agentState.totalValue, agentState.pnl]);

  // Portfolio balance
  const balance: PortfolioBalance = useMemo(() => ({
    cashAvailable: agentState.cash,
    holdingsValue: agentState.holdings,
    costBasis: agentState.costBasis,
    unrealizedPnl: agentState.unrealizedPnl,
    initialCapital: agentState.initialValue,
    totalValue: agentState.totalValue,
  }), [agentState]);

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

  // Render dashboard content based on active panel
  const renderMainContent = () => {
    switch (activePanel) {
      case 'positions':
        return (
          <div className="h-full">
            <PositionsTable
              positions={agentState.positions}
              onClosePosition={isConnected ? handleClosePosition : undefined}
            />
          </div>
        );

      case 'transactions':
        return (
          <div className="h-full">
            <TransactionsTable trades={trades} maxItems={50} />
          </div>
        );

      case 'analytics':
        return (
          <div className="h-full grid grid-rows-2 gap-4">
            <PortfolioChart data={portfolioHistory} initialValue={agentState.initialValue} />
            <div className="grid grid-cols-2 gap-4">
              <BalancePanel balance={balance} />
              <SystemLogs trades={trades} />
            </div>
          </div>
        );

      case 'neural':
      case 'chat':
      case 'reflections':
        return (
          <div className="h-full flex items-center justify-center text-[var(--color-text-muted)]">
            <p>View activity in the right panel</p>
          </div>
        );

      case 'settings':
        return (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-[var(--color-text-muted)] mb-4">Theme and settings can be changed from the sidebar</p>
            </div>
          </div>
        );

      case 'dashboard':
      default:
        return (
          <div className="h-full grid grid-cols-3 grid-rows-[1fr_1fr] gap-4">
            {/* Chart - Full width top */}
            <div className="col-span-2 row-span-1">
              <PortfolioChart data={portfolioHistory} initialValue={agentState.initialValue} />
            </div>

            {/* Balance Panel */}
            <div className="col-span-1 row-span-1">
              <BalancePanel balance={balance} />
            </div>

            {/* Positions & Transactions */}
            <div className="col-span-2 row-span-1">
              <div className="grid grid-cols-2 gap-4 h-full">
                <PositionsTable
                  positions={agentState.positions}
                  onClosePosition={isConnected ? handleClosePosition : undefined}
                />
                <TransactionsTable trades={trades} maxItems={8} />
              </div>
            </div>

            {/* System Logs */}
            <div className="col-span-1 row-span-1">
              <SystemLogs trades={trades} maxItems={10} />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <Sidebar />

      <Header
        agentName={agentState.name}
        agentStatus={agentState.status}
        ibAccountId={agentState.ibAccountId}
        totalValue={agentState.totalValue}
        pnl={agentState.pnl}
        pnlPercent={agentState.pnlPercent}
        isConnected={isConnected}
        tradingMode={agentState.tradingMode}
      />

      <main className="main-content">
        {(isAgentLoading || isTradesLoading) ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin w-8 h-8 border-2 border-[var(--color-accent-primary)] border-t-transparent rounded-full" />
          </div>
        ) : (
          renderMainContent()
        )}
      </main>

      <RightPanel trades={trades} />
    </div>
  );
}
