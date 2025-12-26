'use client';

import type { Trade } from '@/types';
import { Icons } from '@/components/ui/Icons';
import clsx from 'clsx';
import { format } from 'date-fns';

interface TransactionsTableProps {
  trades: Trade[];
  maxItems?: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatTime(timestamp: string): string {
  try {
    return format(new Date(timestamp), 'HH:mm:ss');
  } catch {
    return '--:--:--';
  }
}

export function TransactionsTable({ trades, maxItems = 20 }: TransactionsTableProps) {
  const displayTrades = trades.slice(0, maxItems);

  const actionConfig = {
    buy: { label: 'BUY', class: 'badge-success', icon: '↑' },
    sell: { label: 'SELL', class: 'badge-error', icon: '↓' },
    close: { label: 'CLOSE', class: 'badge-info', icon: '×' },
  };

  const statusConfig = {
    filled: { label: 'FILLED', class: 'text-profit' },
    pending: { label: 'PENDING', class: 'text-warning' },
    cancelled: { label: 'CANCELLED', class: 'text-[var(--color-text-muted)]' },
    rejected: { label: 'REJECTED', class: 'text-loss' },
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <span className="card-title">Transactions</span>
          <span className="badge badge-info">{trades.length}</span>
        </div>
      </div>

      <div className="card-body flush flex-1 overflow-auto">
        {displayTrades.length === 0 ? (
          <div className="table-empty">
            <Icons.Transactions width={32} height={32} className="mx-auto mb-3 opacity-30" />
            <p>No transactions yet</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Symbol</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Price</th>
                <th className="text-right">Risk</th>
                <th className="text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {displayTrades.map((trade, index) => {
                const action = actionConfig[trade.action];
                const status = statusConfig[trade.status];

                return (
                  <tr
                    key={trade.id || index}
                    className="animate-fadeIn"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <td className="text-[var(--color-text-muted)]">
                      {formatTime(trade.timestamp)}
                    </td>
                    <td>
                      <span className={clsx('badge', action.class)}>
                        {action.label}
                      </span>
                    </td>
                    <td>
                      <span className="font-semibold text-[var(--color-text-primary)]">
                        {trade.symbol}
                      </span>
                    </td>
                    <td className="text-right">{trade.quantity}</td>
                    <td className="text-right">
                      {trade.price > 0 ? formatCurrency(trade.price) : '-'}
                    </td>
                    <td className="text-right">
                      {trade.evaluatedRisk > 0 ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className={clsx(
                            'text-xs',
                            trade.evaluatedRisk <= 30 ? 'text-profit' :
                            trade.evaluatedRisk <= 60 ? 'text-warning' : 'text-loss'
                          )}>
                            {trade.evaluatedRisk}%
                          </span>
                          <div className="w-12 h-1.5 rounded-full bg-[var(--color-bg-tertiary)] overflow-hidden">
                            <div
                              className={clsx(
                                'h-full rounded-full transition-all',
                                trade.evaluatedRisk <= 30 ? 'bg-[var(--color-profit)]' :
                                trade.evaluatedRisk <= 60 ? 'bg-[var(--color-warning)]' : 'bg-[var(--color-loss)]'
                              )}
                              style={{ width: `${trade.evaluatedRisk}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[var(--color-text-muted)]">-</span>
                      )}
                    </td>
                    <td className="text-right">
                      <span className={clsx('text-xs font-semibold', status.class)}>
                        {status.label}
                      </span>
                    </td>
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
