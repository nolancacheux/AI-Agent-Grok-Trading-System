'use client';

import type { Position } from '@/types';
import { Icons } from '@/components/ui/Icons';
import clsx from 'clsx';

interface PositionsTableProps {
  positions: Position[];
  onClosePosition?: (symbol: string) => void;
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

export function PositionsTable({ positions, onClosePosition }: PositionsTableProps) {
  return (
    <div className="card h-full flex flex-col">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <span className="card-title">Active Holdings</span>
          <span className="badge badge-info">{positions.length}</span>
        </div>
      </div>

      <div className="card-body flush flex-1 overflow-auto">
        {positions.length === 0 ? (
          <div className="table-empty">
            <Icons.Positions width={32} height={32} className="mx-auto mb-3 opacity-30" />
            <p>No open positions</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Side</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Avg Cost</th>
                <th className="text-right">Current</th>
                <th className="text-right">Value</th>
                <th className="text-right">P&L</th>
                {onClosePosition && <th></th>}
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => {
                const isProfit = position.pnl >= 0;
                return (
                  <tr key={position.symbol} className="animate-fadeIn">
                    <td>
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {position.symbol}
                      </span>
                    </td>
                    <td>
                      <span className={clsx(
                        'badge',
                        position.side === 'LONG' ? 'badge-success' : 'badge-warning'
                      )}>
                        {position.side || 'LONG'}
                      </span>
                    </td>
                    <td className="text-right">{position.quantity}</td>
                    <td className="text-right">{formatCurrency(position.avgPrice)}</td>
                    <td className="text-right">{formatCurrency(position.currentPrice)}</td>
                    <td className="text-right font-semibold">{formatCurrency(position.value)}</td>
                    <td className="text-right">
                      <div className="flex flex-col items-end">
                        <span className={clsx('font-semibold', isProfit ? 'text-profit' : 'text-loss')}>
                          {isProfit ? '+' : ''}{formatCurrency(position.pnl)}
                        </span>
                        <span className={clsx('text-xs', isProfit ? 'text-profit' : 'text-loss')}>
                          {formatPercent(position.pnlPercent)}
                        </span>
                      </div>
                    </td>
                    {onClosePosition && (
                      <td>
                        <button
                          onClick={() => onClosePosition(position.symbol)}
                          className="btn btn-ghost btn-sm text-[var(--color-text-muted)] hover:text-[var(--color-loss)]"
                        >
                          <Icons.Close width={14} height={14} />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
