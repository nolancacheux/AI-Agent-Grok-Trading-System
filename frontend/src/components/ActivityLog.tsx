'use client';

import { useState } from 'react';
import type { Trade } from '@/types';
import { formatCurrency } from '@/data/mockData';

interface ActivityLogProps {
  trades: Trade[];
}

function TradeRow({ trade, isExpanded, onToggle }: {
  trade: Trade;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const actionConfig = {
    buy: { label: 'Buy', className: 'badge-green' },
    sell: { label: 'Sell', className: 'badge-red' },
    close: { label: 'Close', className: 'badge-blue' },
  };

  const riskColor =
    trade.evaluatedRisk >= 80
      ? 'text-accent-red'
      : trade.evaluatedRisk >= 50
      ? 'text-accent-yellow'
      : 'text-accent-green';

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  return (
    <div className="border-b border-border-secondary last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full text-left p-4 hover:bg-bg-tertiary transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className={`badge ${actionConfig[trade.action].className}`}>
              {actionConfig[trade.action].label}
            </span>
            <span className="font-semibold text-text-primary">{trade.symbol}</span>
            <span className="text-text-secondary text-sm font-mono">
              {trade.quantity} @ {formatCurrency(trade.price)}
            </span>
          </div>

          <div className="flex items-center gap-4 text-right shrink-0">
            <span className="font-mono font-medium text-text-primary">
              {formatCurrency(trade.totalValue)}
            </span>
            <span className="text-text-muted text-xs font-mono">
              {formatTime(trade.timestamp)}
            </span>
            <svg
              className={`w-4 h-4 text-text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        {!isExpanded && trade.reasoning && (
          <div className="mt-2 text-xs text-text-muted truncate">
            {trade.reasoning}
          </div>
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 animate-fadeIn">
          <div className="bg-bg-tertiary rounded-md p-4 space-y-4">
            <div>
              <div className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
                Analysis
              </div>
              <p className="text-sm text-text-secondary leading-relaxed">
                {trade.reasoning}
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Status</div>
                <div className={`font-medium ${
                  trade.status === 'filled' ? 'text-accent-green' :
                  trade.status === 'pending' ? 'text-accent-yellow' : 'text-accent-red'
                }`}>
                  {trade.status.charAt(0).toUpperCase() + trade.status.slice(1)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Fee</div>
                <div className="font-mono">{formatCurrency(trade.fee)}</div>
              </div>
              <div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Risk Score</div>
                <div className={`font-mono font-semibold ${riskColor}`}>
                  {trade.evaluatedRisk}/100
                </div>
              </div>
              <div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider">Trade ID</div>
                <div className="font-mono text-xs text-text-muted truncate">
                  {trade.id}
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-text-muted">Risk Level</span>
                <span className={riskColor}>{trade.evaluatedRisk}%</span>
              </div>
              <div className="h-1.5 bg-bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    trade.evaluatedRisk >= 80 ? 'bg-accent-red' :
                    trade.evaluatedRisk >= 50 ? 'bg-accent-yellow' : 'bg-accent-green'
                  }`}
                  style={{ width: `${trade.evaluatedRisk}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ActivityLog({ trades }: ActivityLogProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <span>Activity Log</span>
        <span className="text-text-muted font-normal">{trades.length} trades</span>
      </div>

      <div className="max-h-[400px] overflow-auto">
        {trades.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <p className="text-sm">No recent trades</p>
          </div>
        ) : (
          trades.map((trade) => (
            <TradeRow
              key={trade.id}
              trade={trade}
              isExpanded={expandedId === trade.id}
              onToggle={() => setExpandedId(expandedId === trade.id ? null : trade.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
