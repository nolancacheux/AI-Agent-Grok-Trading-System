'use client';

import { useEffect, useState } from 'react';
import type { AgentStatus, MarketStatus } from '@/types';
import { formatCurrency } from '@/data/mockData';

interface HeaderProps {
  totalValue: number;
  pnl: number;
  pnlPercent: number;
  agentStatus: AgentStatus;
}

function getMarketStatus(): { status: MarketStatus; nextChange: string } {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hours = nyTime.getHours();
  const minutes = nyTime.getMinutes();
  const day = nyTime.getDay();
  const time = hours * 60 + minutes;

  const marketOpen = 9 * 60 + 30;
  const marketClose = 16 * 60;
  const preMarketOpen = 4 * 60;
  const afterHoursClose = 20 * 60;

  if (day === 0 || day === 6) {
    return { status: 'CLOSED', nextChange: 'Opens Monday 9:30 AM ET' };
  }

  if (time >= marketOpen && time < marketClose) {
    const remaining = marketClose - time;
    const h = Math.floor(remaining / 60);
    const m = remaining % 60;
    return { status: 'OPEN', nextChange: `Closes in ${h}h ${m}m` };
  }

  if (time >= preMarketOpen && time < marketOpen) {
    const remaining = marketOpen - time;
    const h = Math.floor(remaining / 60);
    const m = remaining % 60;
    return { status: 'PRE_MARKET', nextChange: `Opens in ${h}h ${m}m` };
  }

  if (time >= marketClose && time < afterHoursClose) {
    return { status: 'AFTER_HOURS', nextChange: 'Closes 8:00 PM ET' };
  }

  return { status: 'CLOSED', nextChange: 'Opens 9:30 AM ET' };
}

export function Header({ totalValue, pnl, pnlPercent, agentStatus }: HeaderProps) {
  const [marketInfo, setMarketInfo] = useState(getMarketStatus());
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const updateTimes = () => {
      setMarketInfo(getMarketStatus());
      setCurrentTime(new Date());
    };

    updateTimes();
    const interval = setInterval(updateTimes, 1000);
    return () => clearInterval(interval);
  }, []);

  const isProfit = pnl >= 0;

  const statusConfig: Record<AgentStatus, { label: string; className: string }> = {
    IDLE: { label: 'Idle', className: 'badge-yellow' },
    ANALYZING: { label: 'Analyzing', className: 'badge-blue' },
    TRADING: { label: 'Trading', className: 'badge-green' },
    ERROR: { label: 'Error', className: 'badge-red' },
  };

  const marketStatusConfig: Record<MarketStatus, { label: string; className: string }> = {
    OPEN: { label: 'Market Open', className: 'badge-green' },
    CLOSED: { label: 'Market Closed', className: 'badge-gray' },
    PRE_MARKET: { label: 'Pre-Market', className: 'badge-yellow' },
    AFTER_HOURS: { label: 'After Hours', className: 'badge-yellow' },
  };

  const nyTimeStr = currentTime.toLocaleString('en-US', {
    timeZone: 'America/New_York',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  return (
    <header className="card">
      <div className="p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Trading Dashboard</h1>
            <p className="text-xs text-text-muted mt-0.5">Automated Trading System</p>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className={`badge ${statusConfig[agentStatus].className}`}>
              {agentStatus === 'ANALYZING' && (
                <span className="w-1.5 h-1.5 bg-current rounded-full animate-pulse mr-1.5" />
              )}
              {statusConfig[agentStatus].label}
            </span>
            <span className={`badge ${marketStatusConfig[marketInfo.status].className}`}>
              {marketStatusConfig[marketInfo.status].label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="header-stat">
            <span className="header-stat-label">Portfolio Value</span>
            <span className="header-stat-value font-mono text-lg">
              {formatCurrency(totalValue)}
            </span>
          </div>

          <div className="divider hidden sm:block" />

          <div className="header-stat">
            <span className="header-stat-label">P&L</span>
            <div className="flex items-center gap-2">
              <span className={`header-stat-value font-mono ${isProfit ? 'text-accent-green' : 'text-accent-red'}`}>
                {isProfit ? '+' : ''}{formatCurrency(pnl)}
              </span>
              <span className={`text-xs font-mono ${isProfit ? 'text-accent-green' : 'text-accent-red'}`}>
                ({isProfit ? '+' : ''}{pnlPercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          <div className="divider hidden sm:block" />

          <div className="header-stat hidden md:block">
            <span className="header-stat-label">New York</span>
            <span className="header-stat-value font-mono">{nyTimeStr}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
