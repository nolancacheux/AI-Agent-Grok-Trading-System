'use client';

import type { PortfolioBalance } from '@/types';
import { Icons } from '@/components/ui/Icons';
import clsx from 'clsx';

interface BalancePanelProps {
  balance: PortfolioBalance;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

interface MetricRowProps {
  label: string;
  value: string;
  highlight?: boolean;
  variant?: 'profit' | 'loss' | 'neutral';
}

function MetricRow({ label, value, highlight, variant = 'neutral' }: MetricRowProps) {
  return (
    <div className={clsx(
      'flex items-center justify-between py-3 px-1',
      highlight && 'border-t border-[var(--color-border-default)] pt-4 mt-1'
    )}>
      <span className="text-sm text-[var(--color-text-secondary)]">{label}</span>
      <span className={clsx(
        'font-mono font-semibold',
        highlight ? 'text-base' : 'text-sm',
        variant === 'profit' && 'text-profit',
        variant === 'loss' && 'text-loss',
        variant === 'neutral' && 'text-[var(--color-text-primary)]'
      )}>
        {value}
      </span>
    </div>
  );
}

export function BalancePanel({ balance }: BalancePanelProps) {
  const pnlVariant = balance.unrealizedPnl >= 0 ? 'profit' : 'loss';

  return (
    <div className="card h-full flex flex-col">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Icons.Wallet width={16} height={16} className="text-[var(--color-text-muted)]" />
          <span className="card-title">Portfolio Balance</span>
        </div>
      </div>

      <div className="card-body flex-1">
        <div className="divide-y divide-[var(--color-border-subtle)]">
          <MetricRow
            label="Cash Available"
            value={formatCurrency(balance.cashAvailable)}
          />
          <MetricRow
            label="Holdings Value"
            value={formatCurrency(balance.holdingsValue)}
          />
          <MetricRow
            label="Cost Basis"
            value={formatCurrency(balance.costBasis)}
          />
          <MetricRow
            label="Unrealized P&L"
            value={(balance.unrealizedPnl >= 0 ? '+' : '') + formatCurrency(balance.unrealizedPnl)}
            variant={pnlVariant}
          />
          <MetricRow
            label="Initial Capital"
            value={formatCurrency(balance.initialCapital)}
          />
          <MetricRow
            label="Total Value"
            value={formatCurrency(balance.totalValue)}
            highlight
          />
        </div>
      </div>
    </div>
  );
}
