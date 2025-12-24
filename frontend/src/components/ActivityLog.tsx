'use client';

import { useState } from 'react';
import type { Trade } from '@/types';
import { formatCurrency, formatTimestamp, formatDate } from '@/data/mockData';

interface ActivityLogProps {
  trades: Trade[];
}

function TradeRow({ trade, isExpanded, onToggle }: {
  trade: Trade;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const actionColors = {
    buy: 'text-neon-green bg-neon-green/10 border-neon-green/30',
    sell: 'text-neon-red bg-neon-red/10 border-neon-red/30',
    close: 'text-amber-400 bg-amber-400/10 border-amber-400/30',
  };

  const riskColor =
    trade.evaluatedRisk >= 80
      ? 'text-neon-red'
      : trade.evaluatedRisk >= 50
      ? 'text-amber-400'
      : 'text-neon-green';

  return (
    <div className="border-b border-terminal-border/50 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full text-left py-3 px-2 trade-row hover:bg-terminal-gray/30 transition-colors"
      >
        <div className="flex items-center justify-between gap-4">
          {/* Left: Action & Symbol */}
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={`px-2 py-0.5 text-xs font-bold uppercase border rounded ${
                actionColors[trade.action]
              }`}
            >
              {trade.action}
            </span>
            <span className="font-bold text-white">{trade.symbol}</span>
            <span className="text-terminal-text text-sm">
              x{trade.quantity} @ ${trade.price.toFixed(2)}
            </span>
          </div>

          {/* Right: Value & Time */}
          <div className="flex items-center gap-4 text-right shrink-0">
            <span className="text-white font-medium">
              {formatCurrency(trade.totalValue)}
            </span>
            <span className="text-terminal-text text-xs">
              {formatDate(trade.timestamp)} {formatTimestamp(trade.timestamp)}
            </span>
            <svg
              className={`w-4 h-4 text-terminal-text transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {/* Preview of reasoning */}
        {!isExpanded && (
          <div className="mt-2 text-xs text-terminal-text truncate pl-14">
            {trade.reasoning}
          </div>
        )}
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="px-4 pb-4 animate-slide-up">
          <div className="bg-terminal-dark border border-terminal-border rounded p-4">
            {/* Reasoning */}
            <div className="mb-4">
              <div className="text-xs text-terminal-text uppercase tracking-wider mb-2">
                Grok Reasoning
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                {trade.reasoning}
              </p>
            </div>

            {/* Trade Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <div className="text-xs text-terminal-text">Status</div>
                <div
                  className={`font-medium ${
                    trade.status === 'filled'
                      ? 'text-neon-green'
                      : trade.status === 'pending'
                      ? 'text-amber-400'
                      : 'text-neon-red'
                  }`}
                >
                  {trade.status.toUpperCase()}
                </div>
              </div>
              <div>
                <div className="text-xs text-terminal-text">Fee</div>
                <div className="text-white">{formatCurrency(trade.fee)}</div>
              </div>
              <div>
                <div className="text-xs text-terminal-text">Risk Score</div>
                <div className={`font-bold ${riskColor}`}>
                  {trade.evaluatedRisk}/100
                </div>
              </div>
              <div>
                <div className="text-xs text-terminal-text">Trade ID</div>
                <div className="text-terminal-text font-mono text-xs">
                  {trade.id}
                </div>
              </div>
            </div>

            {/* Risk Bar */}
            <div className="mt-4">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-terminal-text">Risk Level</span>
                <span className={riskColor}>{trade.evaluatedRisk}%</span>
              </div>
              <div className="h-1.5 bg-terminal-gray rounded overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    trade.evaluatedRisk >= 80
                      ? 'bg-neon-red'
                      : trade.evaluatedRisk >= 50
                      ? 'bg-amber-400'
                      : 'bg-neon-green'
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
    <div className="terminal-panel p-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-neon-green text-lg font-mono">&gt;&gt;</span>
          <h2 className="text-sm font-medium text-terminal-text uppercase tracking-widest">
            Activity Log
          </h2>
        </div>
        <span className="text-xs text-terminal-text">
          {trades.length} trades
        </span>
      </div>

      {/* Trades List */}
      <div className="flex-1 overflow-auto">
        {trades.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-terminal-text">
            <div className="text-center">
              <div className="text-2xl mb-2 opacity-50">...</div>
              <div className="text-sm">No recent trades</div>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-terminal-border/50">
            {trades.map((trade) => (
              <TradeRow
                key={trade.id}
                trade={trade}
                isExpanded={expandedId === trade.id}
                onToggle={() =>
                  setExpandedId(expandedId === trade.id ? null : trade.id)
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
