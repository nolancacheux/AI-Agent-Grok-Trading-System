'use client';

import { useEffect, useState } from 'react';
import { formatCurrency, formatPercent } from '@/data/mockData';
import type { AgentStatus, MarketStatus } from '@/types';

interface HeaderProps {
  totalValue: number;
  pnl: number;
  pnlPercent: number;
  agentStatus: AgentStatus;
}

export function Header({ totalValue, pnl, pnlPercent, agentStatus }: HeaderProps) {
  const [parisTime, setParisTime] = useState<string>('');
  const [nyTime, setNyTime] = useState<string>('');
  const [marketStatus, setMarketStatus] = useState<MarketStatus>('CLOSED');

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();

      // Paris time
      const paris = now.toLocaleTimeString('en-US', {
        timeZone: 'Europe/Paris',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setParisTime(paris);

      // New York time
      const ny = now.toLocaleTimeString('en-US', {
        timeZone: 'America/New_York',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setNyTime(ny);

      // Market status (US market: 9:30-16:00 ET)
      const nyHour = parseInt(
        now.toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour: '2-digit',
          hour12: false,
        })
      );
      const nyMinute = parseInt(
        now.toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          minute: '2-digit',
        })
      );
      const totalMinutes = nyHour * 60 + nyMinute;

      if (totalMinutes >= 570 && totalMinutes < 960) {
        setMarketStatus('OPEN');
      } else if (totalMinutes >= 240 && totalMinutes < 570) {
        setMarketStatus('PRE_MARKET');
      } else if (totalMinutes >= 960 && totalMinutes < 1200) {
        setMarketStatus('AFTER_HOURS');
      } else {
        setMarketStatus('CLOSED');
      }
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, []);

  const isProfit = pnl >= 0;
  const statusColors: Record<AgentStatus, string> = {
    IDLE: 'text-amber-400',
    ANALYZING: 'text-cyan-400',
    TRADING: 'text-neon-green',
    ERROR: 'text-red-400',
  };

  const marketStatusColors: Record<MarketStatus, string> = {
    OPEN: 'text-neon-green',
    CLOSED: 'text-neon-red',
    PRE_MARKET: 'text-amber-400',
    AFTER_HOURS: 'text-amber-400',
  };

  return (
    <header className="terminal-panel p-4 mb-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Title & Logo */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-wider text-neon-green text-glow-green">
              GROK TRADING BOT
            </h1>
            <div className="absolute -bottom-1 left-0 right-0 h-px bg-gradient-to-r from-neon-green via-neon-green/50 to-transparent" />
          </div>

          {/* Agent Status */}
          <div className="flex items-center gap-2 px-3 py-1 border border-terminal-border rounded bg-terminal-dark">
            <span
              className={`status-dot ${
                agentStatus === 'TRADING'
                  ? 'active'
                  : agentStatus === 'ANALYZING'
                  ? 'idle'
                  : ''
              }`}
              style={{
                backgroundColor:
                  agentStatus === 'IDLE'
                    ? '#888'
                    : agentStatus === 'ANALYZING'
                    ? '#00ffff'
                    : '#00ff00',
              }}
            />
            <span className={`text-xs font-medium ${statusColors[agentStatus]}`}>
              {agentStatus}
            </span>
          </div>
        </div>

        {/* Portfolio Value */}
        <div className="flex items-center gap-8">
          <div className="text-center">
            <div className="text-xs text-terminal-text uppercase tracking-widest mb-1">
              Total Value
            </div>
            <div className="font-display text-3xl md:text-4xl font-bold text-white">
              {formatCurrency(totalValue)}
            </div>
          </div>

          {/* P&L */}
          <div className="text-center">
            <div className="text-xs text-terminal-text uppercase tracking-widest mb-1">
              P&L
            </div>
            <div
              className={`font-display text-2xl md:text-3xl font-bold ${
                isProfit ? 'text-neon-green text-glow-green' : 'text-neon-red text-glow-red'
              }`}
            >
              {formatCurrency(pnl)}
              <span className="text-lg ml-2">({formatPercent(pnlPercent)})</span>
            </div>
          </div>
        </div>

        {/* Time & Market Status */}
        <div className="flex flex-col gap-2 text-right">
          <div className="flex items-center gap-4 text-sm">
            <div>
              <span className="text-terminal-text">PARIS </span>
              <span className="text-white font-mono">{parisTime || '--:--:--'}</span>
            </div>
            <div>
              <span className="text-terminal-text">NY </span>
              <span className="text-white font-mono">{nyTime || '--:--:--'}</span>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <span className="text-xs text-terminal-text">MARKET:</span>
            <span
              className={`text-sm font-bold ${marketStatusColors[marketStatus]} ${
                marketStatus === 'OPEN' ? 'animate-pulse' : ''
              }`}
            >
              {marketStatus.replace('_', ' ')}
            </span>
            {marketStatus === 'OPEN' && (
              <span className="text-xs text-terminal-text">(09:30-16:00 ET)</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
