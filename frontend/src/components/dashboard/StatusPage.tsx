'use client';

import { useState, useEffect } from 'react';
import { getHealth, getSchedulerStatus, getAgentState, setSchedulerMode, triggerAnalysis } from '@/lib/api';

interface SchedulerStatus {
  is_running: boolean;
  mode: 'MANUAL' | 'AUTO';
  market_status: 'CLOSED' | 'PRE_MARKET' | 'OPEN' | 'AFTER_HOURS';
  is_market_open: boolean;
  next_jobs: Array<{
    id: string;
    name: string;
    next_run: string | null;
  }>;
  trading_interval_minutes: number;
  trade_count_since_reflection: number;
  reflection_trades_threshold: number;
}

interface AgentState {
  name: string;
  status: string;
  cash: number;
  initial_value: number;
  total_value: number;
  pnl: number;
  pnl_percent: number;
}

export default function StatusPage() {
  const [isConnected, setIsConnected] = useState(false);
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null);
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const [health, scheduler, agent] = await Promise.all([
        getHealth(),
        getSchedulerStatus(),
        getAgentState()
      ]);
      setIsConnected(health.ibkr_connected);
      setSchedulerStatus(scheduler);
      setAgentState(agent);
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleModeChange = async (mode: 'MANUAL' | 'AUTO') => {
    try {
      await setSchedulerMode(mode);
      await fetchStatus();
    } catch (error) {
      console.error('Failed to change mode:', error);
    }
  };

  const handleTriggerAnalysis = async () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    try {
      const result = await triggerAnalysis();
      if (result.trade) {
        setAnalysisResult(`Trade executed: ${result.trade.action.toUpperCase()} ${result.trade.quantity} ${result.trade.symbol} @ $${result.trade.price.toFixed(2)}`);
      } else {
        setAnalysisResult(result.message || 'Analysis complete - no trade executed');
      }
      await fetchStatus();
    } catch (error) {
      setAnalysisResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatNextRun = (isoString: string | null) => {
    if (!isoString) return 'Not scheduled';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffMins = Math.round(diffMs / 60000);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `in ${diffMins} min`;
    const diffHours = Math.round(diffMins / 60);
    return `in ${diffHours}h`;
  };

  const getMarketStatusInfo = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { color: 'text-emerald-400', label: 'OPEN', desc: 'Regular trading hours (9:30 AM - 4:00 PM ET)' };
      case 'PRE_MARKET':
        return { color: 'text-amber-400', label: 'PRE-MARKET', desc: 'Pre-market session (4:00 AM - 9:30 AM ET)' };
      case 'AFTER_HOURS':
        return { color: 'text-amber-400', label: 'AFTER HOURS', desc: 'After-hours session (4:00 PM - 8:00 PM ET)' };
      default:
        return { color: 'text-zinc-500', label: 'CLOSED', desc: 'Market is closed' };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-zinc-600 border-t-white rounded-full" />
      </div>
    );
  }

  const marketInfo = schedulerStatus ? getMarketStatusInfo(schedulerStatus.market_status) : null;

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 max-w-4xl mx-auto overflow-y-auto h-full">
      <h1 className="text-xl md:text-2xl font-display font-semibold text-white mb-4 md:mb-6">System Status</h1>

      {/* Connection & Market Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Connection Status */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Connection Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">IBKR Broker</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className={isConnected ? 'text-emerald-400' : 'text-red-400'}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">API Server</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-emerald-400">Online</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">Scheduler</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${schedulerStatus?.is_running ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className={schedulerStatus?.is_running ? 'text-emerald-400' : 'text-red-400'}>
                  {schedulerStatus?.is_running ? 'Running' : 'Stopped'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Market Status */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Market Status</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-300">NYSE/NASDAQ</span>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${marketInfo?.color.replace('text-', 'bg-')}`} />
                <span className={marketInfo?.color}>{marketInfo?.label}</span>
              </div>
            </div>
            <p className="text-sm text-zinc-500">{marketInfo?.desc}</p>
            <div className="pt-2 border-t border-zinc-800">
              <p className="text-xs text-zinc-500">
                Trading hours are in Eastern Time (ET). The bot only executes trades automatically during regular market hours when in AUTO mode.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Trading Controls */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Trading Controls</h2>

        <div className="space-y-4">
          <div>
            <label className="text-zinc-300 text-sm mb-2 block">Trading Mode</label>
            <div className="flex gap-2">
              <button
                onClick={() => handleModeChange('MANUAL')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  schedulerStatus?.mode === 'MANUAL'
                    ? 'bg-blue-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                MANUAL
              </button>
              <button
                onClick={() => handleModeChange('AUTO')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  schedulerStatus?.mode === 'AUTO'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
              >
                AUTO
              </button>
            </div>
          </div>

          <div className="bg-zinc-800/50 rounded-lg p-3 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-blue-400 text-lg">i</span>
              <div>
                <p className="text-sm text-zinc-300"><strong>MANUAL:</strong> The bot will not trade automatically. You must click "Trigger Analysis" to run an analysis and potentially execute a trade.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-emerald-400 text-lg">i</span>
              <div>
                <p className="text-sm text-zinc-300"><strong>AUTO:</strong> The bot trades automatically every {schedulerStatus?.trading_interval_minutes || 30} minutes during market hours. No action required.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-zinc-800">
            <button
              onClick={handleTriggerAnalysis}
              disabled={isAnalyzing}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isAnalyzing
                  ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {isAnalyzing ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full" />
                  Analyzing...
                </>
              ) : (
                <>
                  <span>&#9658;</span>
                  Trigger Analysis Now
                </>
              )}
            </button>
            <p className="text-xs text-zinc-500 mt-2">
              Runs one analysis cycle immediately. Works in any mode, but will only execute trades during market hours.
            </p>
            {analysisResult && (
              <div className={`mt-3 p-3 rounded-lg text-sm ${
                analysisResult.startsWith('Error')
                  ? 'bg-red-900/30 text-red-400 border border-red-800'
                  : 'bg-emerald-900/30 text-emerald-400 border border-emerald-800'
              }`}>
                {analysisResult}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Data Sources */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Data Sources</h2>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5" />
            <div>
              <p className="text-zinc-300 font-medium">Market Data: Yahoo Finance (FREE)</p>
              <p className="text-sm text-zinc-500 mt-1">
                Paper trading accounts don't include IBKR market data. Yahoo Finance provides real-time stock prices for free and is automatically used as the data source.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5" />
            <div>
              <p className="text-zinc-300 font-medium">News & Search: Grok Live Search</p>
              <p className="text-sm text-zinc-500 mt-1">
                Real-time news and information from web, X/Twitter, and news sites. Powered by xAI's Grok API with live search capabilities.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduler Status */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Scheduler Status</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-zinc-500 text-xs uppercase">Trading Interval</p>
            <p className="text-zinc-200 text-lg">Every {schedulerStatus?.trading_interval_minutes || 30} min</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs uppercase">Reflection Threshold</p>
            <p className="text-zinc-200 text-lg">After {schedulerStatus?.reflection_trades_threshold || 5} trades</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs uppercase">Trades Until Reflection</p>
            <p className="text-zinc-200 text-lg">
              {schedulerStatus?.trade_count_since_reflection || 0} / {schedulerStatus?.reflection_trades_threshold || 5}
            </p>
          </div>
        </div>

        <div className="border-t border-zinc-800 pt-4">
          <p className="text-zinc-400 text-sm mb-3">Next Scheduled Jobs</p>
          <div className="space-y-2">
            {schedulerStatus?.next_jobs.map(job => (
              <div key={job.id} className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">{job.name}</span>
                <span className="text-zinc-500">{formatNextRun(job.next_run)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Account Info */}
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-5">
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Account Info</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <p className="text-zinc-500 text-xs uppercase">Account Type</p>
            <p className="text-zinc-200">Paper Trading</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs uppercase">Initial Capital</p>
            <p className="text-zinc-200">${agentState?.initial_value?.toLocaleString() || '0'}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs uppercase">Current Value</p>
            <p className="text-zinc-200">${agentState?.total_value?.toLocaleString() || '0'}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs uppercase">Cash Available</p>
            <p className="text-zinc-200">${agentState?.cash?.toLocaleString() || '0'}</p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs uppercase">Total P&L</p>
            <p className={agentState && agentState.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {agentState && agentState.pnl >= 0 ? '+' : ''}${agentState?.pnl?.toFixed(2) || '0.00'}
              <span className="text-zinc-500 ml-1">
                ({agentState && agentState.pnl_percent >= 0 ? '+' : ''}{agentState?.pnl_percent?.toFixed(2) || '0.00'}%)
              </span>
            </p>
          </div>
          <div>
            <p className="text-zinc-500 text-xs uppercase">Agent Status</p>
            <p className="text-zinc-200">{agentState?.status || 'IDLE'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
