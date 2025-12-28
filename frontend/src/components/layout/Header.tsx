'use client';

import { useState, useEffect } from 'react';
import { Icons } from '@/components/ui/Icons';
import { useAppStore } from '@/lib/store';
import clsx from 'clsx';

interface HeaderProps {
  totalValue: number;
  pnl: number;
  pnlPercent: number;
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
  totalValue,
  pnl,
  pnlPercent,
}: HeaderProps) {
  const { toggleRightPanel, rightPanelOpen } = useAppStore();

  const isProfit = pnl >= 0;

  return (
    <header className="header">
      <div className="header-left">
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
