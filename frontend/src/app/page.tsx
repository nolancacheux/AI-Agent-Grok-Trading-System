'use client';

import { useMemo, useEffect, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Sidebar,
  Header,
  RightPanel,
  PortfolioChart,
  PositionsTable,
  BalancePanel,
  TransactionsTable,
} from '@/components';
import StatusPage from '@/components/dashboard/StatusPage';
import { useAgentState, useTrades, useHealth, useTriggerAnalysis, usePortfolioHistory, useSchedulerStatus } from '@/hooks/useAgentState';
import { executeTrade, createWebSocket, type WebSocketMessage } from '@/lib/api';
import { useAppStore } from '@/lib/store';
import type { AgentState, Trade, PortfolioSnapshot, PortfolioBalance, Position } from '@/types';


export default function Dashboard() {
  const { activePanel, chartTimeRange } = useAppStore();
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { data: health } = useHealth();
  const { data: agentData, isLoading: isAgentLoading } = useAgentState();
  const { data: tradesData, isLoading: isTradesLoading } = useTrades();
  const { data: schedulerData } = useSchedulerStatus();
  const triggerAnalysis = useTriggerAnalysis();

  // Get real trading mode from scheduler or health endpoint
  const tradingMode = schedulerData?.mode || health?.scheduler_mode || 'AUTO';

  // Map time range to hours
  const hoursMap = { '1H': 1, '24H': 24, '7D': 168, 'ALL': 720 };
  const hours = hoursMap[chartTimeRange] || 24;
  const { data: historyData } = usePortfolioHistory(hours);

  const isConnected = health?.ibkr_connected ?? false;

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((message: WebSocketMessage) => {
    console.log('WebSocket message:', message.type);

    switch (message.type) {
      case 'agent_status':
      case 'portfolio_update':
        queryClient.invalidateQueries({ queryKey: ['agentState'] });
        queryClient.invalidateQueries({ queryKey: ['portfolioHistory'] });
        break;
      case 'trade':
        queryClient.invalidateQueries({ queryKey: ['trades'] });
        queryClient.invalidateQueries({ queryKey: ['agentState'] });
        break;
      case 'chat_message':
        queryClient.invalidateQueries({ queryKey: ['chatHistory'] });
        break;
      case 'reflection':
        queryClient.invalidateQueries({ queryKey: ['reflections'] });
        break;
      case 'market_status':
      case 'mode_change':
        queryClient.invalidateQueries({ queryKey: ['health'] });
        queryClient.invalidateQueries({ queryKey: ['schedulerStatus'] });
        break;
    }
  }, [queryClient]);

  // WebSocket connection with auto-reconnect
  useEffect(() => {
    const connectWebSocket = () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      wsRef.current = createWebSocket(
        handleWebSocketMessage,
        () => {
          // On error, schedule reconnect
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
        },
        (event) => {
          // On close, schedule reconnect if not intentional
          if (event.code !== 1000) {
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
          }
        }
      );
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
        wsRef.current = null;
      }
    };
  }, [handleWebSocketMessage]);

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
        tradingMode,
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
      tradingMode,
      sessionId: '',
    };
  }, [agentData, tradingMode]);

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

  // Transform portfolio history from API (no fake data)
  const portfolioHistory = useMemo(() => {
    if (historyData?.history && historyData.history.length > 0) {
      return historyData.history.map((h: any) => ({
        timestamp: h.timestamp,
        totalValue: h.total_value,
        cash: h.cash,
        positionsValue: h.holdings_value,
        pnl: h.pnl,
        pnlPercent: h.pnl_percent,
      }));
    }
    return [];
  }, [historyData]);

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

      case 'neural':
      case 'chat':
      case 'reflections':
        return (
          <div className="h-full flex items-center justify-center text-[var(--color-text-muted)]">
            <p>View activity in the right panel</p>
          </div>
        );

      case 'settings':
        return <StatusPage />;

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
            <div className="col-span-3 row-span-1">
              <div className="grid grid-cols-2 gap-4 h-full">
                <PositionsTable
                  positions={agentState.positions}
                  onClosePosition={isConnected ? handleClosePosition : undefined}
                />
                <TransactionsTable trades={trades} maxItems={8} />
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="app-container">
      <Sidebar />

      <Header
        totalValue={agentState.totalValue}
        pnl={agentState.pnl}
        pnlPercent={agentState.pnlPercent}
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

      <RightPanel />
    </div>
  );
}
