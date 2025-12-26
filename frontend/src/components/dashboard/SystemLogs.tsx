'use client';

import type { Trade } from '@/types';
import { Icons } from '@/components/ui/Icons';
import clsx from 'clsx';
import { format } from 'date-fns';

interface SystemLogsProps {
  trades: Trade[];
  maxItems?: number;
}

function formatDateTime(timestamp: string): string {
  try {
    return format(new Date(timestamp), 'HH:mm');
  } catch {
    return '--:--';
  }
}

function formatDate(timestamp: string): string {
  try {
    return format(new Date(timestamp), 'MMM d');
  } catch {
    return '';
  }
}

function generateLogMessage(trade: Trade): string {
  const actionSymbols = {
    buy: '📈',
    sell: '💰',
    close: '🔒',
  };

  if (trade.status === 'filled') {
    return `${actionSymbols[trade.action]} ${trade.action.toUpperCase()} ${trade.quantity}x ${trade.symbol} @ $${trade.price.toFixed(2)} ✓ FILLED`;
  }

  if (trade.reasoning) {
    const shortReason = trade.reasoning.slice(0, 40) + (trade.reasoning.length > 40 ? '...' : '');
    return `✅ ${shortReason}`;
  }

  return `${trade.action.toUpperCase()} ${trade.symbol}`;
}

export function SystemLogs({ trades, maxItems = 15 }: SystemLogsProps) {
  const logs = trades.slice(0, maxItems).map((trade) => ({
    id: trade.id,
    timestamp: trade.timestamp,
    agent: 'Grok',
    message: generateLogMessage(trade),
    type: trade.action === 'buy' || trade.action === 'sell' ? 'trade' : 'analysis',
  }));

  return (
    <div className="card h-full flex flex-col">
      <div className="card-header">
        <div className="flex items-center gap-2">
          <Icons.Activity width={16} height={16} className="text-[var(--color-accent-primary)]" />
          <span className="card-title">System Logs</span>
        </div>
      </div>

      <div className="card-body compact flex-1 overflow-auto">
        {logs.length === 0 ? (
          <div className="text-center py-8 text-[var(--color-text-muted)] text-sm">
            No activity yet
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => (
              <div
                key={log.id || index}
                className={clsx(
                  'flex items-start gap-3 py-2 px-2 rounded-md',
                  'hover:bg-[var(--color-bg-hover)] transition-colors',
                  'animate-fadeIn'
                )}
                style={{ animationDelay: `${index * 20}ms` }}
              >
                <span className="text-xs font-mono text-[var(--color-text-muted)] flex-shrink-0 w-10">
                  {formatDateTime(log.timestamp)}
                </span>
                <span className="text-xs font-semibold text-[var(--color-accent-primary)] flex-shrink-0">
                  [{log.agent}]
                </span>
                <span className="text-xs text-[var(--color-text-secondary)] leading-relaxed flex-1 min-w-0">
                  {log.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
