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
  tooltip?: string;
}

function MetricRow({ label, value, highlight, variant = 'neutral', tooltip }: MetricRowProps) {
  return (
    <div className={clsx(
      'flex items-center justify-between py-3 px-1 group relative',
      highlight && 'border-t border-[var(--color-border-default)] pt-4 mt-1'
    )}>
      <span className={clsx(
        'text-sm text-[var(--color-text-secondary)]',
        tooltip && 'cursor-help border-b border-dotted border-[var(--color-text-muted)]'
      )}>
        {label}
        {tooltip && (
          <span className="absolute left-0 bottom-full mb-2 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-300 whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 shadow-lg max-w-xs">
            {tooltip}
          </span>
        )}
      </span>
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
  const unrealizedPnlVariant: 'profit' | 'loss' = balance.unrealizedPnl >= 0 ? 'profit' : 'loss';
  const totalPnl = balance.totalValue - balance.initialCapital;
  const totalPnlVariant: 'profit' | 'loss' = totalPnl >= 0 ? 'profit' : 'loss';

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
            tooltip="Current market value of all open positions"
          />
          <MetricRow
            label="Cost Basis"
            value={formatCurrency(balance.costBasis)}
            tooltip="Total amount paid for current holdings"
          />
          <MetricRow
            label="Unrealized P&L"
            value={(balance.unrealizedPnl >= 0 ? '+' : '') + formatCurrency(balance.unrealizedPnl)}
            variant={unrealizedPnlVariant}
            tooltip="Paper gain/loss on current holdings (not yet sold)"
          />
          <MetricRow
            label="Total P&L"
            value={(totalPnl >= 0 ? '+' : '') + formatCurrency(totalPnl)}
            variant={totalPnlVariant}
            tooltip="Overall portfolio gain/loss since inception (Total Value - Initial Capital)"
          />
          <MetricRow
            label="Initial Capital"
            value={formatCurrency(balance.initialCapital)}
          />
          <MetricRow
            label="Total Value"
            value={formatCurrency(balance.totalValue)}
            highlight
            tooltip="Cash + Holdings Value"
          />
        </div>
      </div>
    </div>
  );
}
