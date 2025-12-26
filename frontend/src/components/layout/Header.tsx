'use client';

import { useState, useEffect } from 'react';
import { Icons } from '@/components/ui/Icons';
import { useAppStore } from '@/lib/store';
import type { AgentStatus, MarketStatus } from '@/types';
import clsx from 'clsx';

interface HeaderProps {
  agentName: string;
  agentStatus: AgentStatus;
  ibAccountId: string;
  totalValue: number;
  pnl: number;
  pnlPercent: number;
  isConnected: boolean;
  tradingMode: 'MANUAL' | 'AUTO';
}

function getMarketStatus(): MarketStatus {
  const now = new Date();
  const nyTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const hours = nyTime.getHours();
  const minutes = nyTime.getMinutes();
  const day = nyTime.getDay();

  // Weekend
  if (day === 0 || day === 6) return 'CLOSED';

  const timeInMinutes = hours * 60 + minutes;

  // Pre-market: 4:00 AM - 9:30 AM
  if (timeInMinutes >= 240 && timeInMinutes < 570) return 'PRE_MARKET';

  // Regular hours: 9:30 AM - 4:00 PM
  if (timeInMinutes >= 570 && timeInMinutes < 960) return 'OPEN';

  // After hours: 4:00 PM - 8:00 PM
  if (timeInMinutes >= 960 && timeInMinutes < 1200) return 'AFTER_HOURS';

  return 'CLOSED';
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

function Clock({ timezone, label }: { timezone: string; label: string }) {
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
      setTime(timeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [timezone]);

  return (
    <div className="clock">
      <span className="clock-time">{time || '--:--:--'}</span>
      <span className="clock-label">{label}</span>
    </div>
  );
}

export function Header({
  agentName,
  agentStatus,
  ibAccountId,
  totalValue,
  pnl,
  pnlPercent,
  isConnected,
  tradingMode,
}: HeaderProps) {
  const { toggleRightPanel, rightPanelOpen } = useAppStore();
  const [marketStatus, setMarketStatus] = useState<MarketStatus>('CLOSED');

  useEffect(() => {
    const updateMarketStatus = () => setMarketStatus(getMarketStatus());
    updateMarketStatus();
    const interval = setInterval(updateMarketStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const statusConfig = {
    IDLE: { class: 'badge-idle', dot: 'idle' },
    ANALYZING: { class: 'badge-analyzing', dot: 'analyzing' },
    TRADING: { class: 'badge-trading', dot: 'trading' },
    ERROR: { class: 'badge-error', dot: 'error' },
  };

  const marketStatusConfig = {
    OPEN: { label: 'OPEN', class: 'text-profit' },
    CLOSED: { label: 'CLOSED', class: 'text-[var(--color-text-muted)]' },
    PRE_MARKET: { label: 'PRE-MKT', class: 'text-warning' },
    AFTER_HOURS: { label: 'AFTER-HRS', class: 'text-info' },
  };

  const isProfit = pnl >= 0;

  return (
    <header className="header">
      <div className="header-left">
        {/* Agent Info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
              <Icons.Grok width={18} height={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-[var(--color-text-primary)]">
                  {agentName}
                </span>
                <span className={clsx('badge', statusConfig[agentStatus].class)}>
                  <span className={clsx('status-dot', statusConfig[agentStatus].dot)} />
                  {agentStatus}
                </span>
              </div>
              <span className="text-xs text-[var(--color-text-muted)]">
                IB: {ibAccountId}
              </span>
            </div>
          </div>
        </div>

        <div className="header-divider" />

        {/* Total Value */}
        <div className="header-stat">
          <span className="header-stat-label">Total Value</span>
          <span className="header-stat-value text-lg">{formatCurrency(totalValue)}</span>
        </div>

        <div className="header-divider" />

        {/* PNL */}
        <div className="header-stat">
          <span className="header-stat-label">PNL</span>
          <div className="flex items-center gap-2">
            <span className={clsx('header-stat-value', isProfit ? 'text-profit' : 'text-loss')}>
              {formatPercent(pnlPercent)}
            </span>
            <span className={clsx('text-sm font-mono', isProfit ? 'text-profit' : 'text-loss')}>
              {isProfit ? '+' : ''}{formatCurrency(pnl)}
            </span>
          </div>
        </div>

        <div className="header-divider" />

        {/* System Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-label">SYS:</span>
            <span className={clsx('status-dot', isConnected ? 'on' : 'off')} />
            <span className={clsx('font-mono text-xs', isConnected ? 'text-profit' : 'text-[var(--color-text-muted)]')}>
              {isConnected ? 'ON' : 'OFF'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-label">MKT:</span>
            <span className={clsx('font-mono text-xs', marketStatusConfig[marketStatus].class)}>
              {marketStatusConfig[marketStatus].label}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-label">MODE:</span>
            <span className={clsx(
              'font-mono text-xs',
              tradingMode === 'AUTO' ? 'text-profit' : 'text-info'
            )}>
              {tradingMode}
            </span>
          </div>
        </div>
      </div>

      <div className="header-right">
        {/* Clocks */}
        <div className="flex items-center gap-6">
          <Clock timezone="Europe/Paris" label="Paris" />
          <Clock timezone="America/New_York" label="New York" />
        </div>

        <div className="header-divider" />

        {/* Panel Toggle */}
        <button
          onClick={toggleRightPanel}
          className={clsx(
            'btn btn-ghost btn-icon',
            rightPanelOpen && 'bg-[var(--color-accent-glow)] text-[var(--color-accent-primary)]'
          )}
          title={rightPanelOpen ? 'Hide Activity Panel' : 'Show Activity Panel'}
        >
          <Icons.PanelRight width={18} height={18} />
        </button>
      </div>
    </header>
  );
}
