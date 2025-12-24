'use client';

import type { DailyStats } from '@/types';
import { formatCurrency } from '@/data/mockData';

interface StatsPanelProps {
  stats: DailyStats;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  const winRateColor =
    stats.winRate >= 60 ? 'text-accent-green' :
    stats.winRate >= 40 ? 'text-accent-yellow' : 'text-accent-red';

  return (
    <div className="card">
      <div className="card-header">Today&apos;s Statistics</div>

      <div className="card-body space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="metric-card">
            <div className="metric-label">Total Trades</div>
            <div className="metric-value text-lg">{stats.totalTrades}</div>
            <div className="text-xs text-text-muted mt-1">
              {stats.winningTrades}W / {stats.losingTrades}L
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Win Rate</div>
            <div className={`metric-value text-lg ${winRateColor}`}>
              {stats.winRate.toFixed(1)}%
            </div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-accent-green">Wins</span>
            <span className="text-accent-red">Losses</span>
          </div>
          <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden flex">
            <div
              className="h-full bg-accent-green transition-all duration-500"
              style={{ width: `${stats.winRate}%` }}
            />
            <div
              className="h-full bg-accent-red transition-all duration-500"
              style={{ width: `${100 - stats.winRate}%` }}
            />
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between py-2 border-b border-border-secondary">
            <span className="text-sm text-text-muted">Avg Trade Duration</span>
            <span className="text-sm font-mono">{stats.avgTradeDuration}</span>
          </div>

          {stats.bestStock && (
            <div className="flex items-center justify-between py-2 border-b border-border-secondary">
              <div>
                <span className="text-sm text-text-muted">Best Performer</span>
                <div className="font-semibold">{stats.bestStock.symbol}</div>
              </div>
              <span className="text-accent-green font-mono">
                +{formatCurrency(stats.bestStock.pnl)}
              </span>
            </div>
          )}

          {stats.worstStock && (
            <div className="flex items-center justify-between py-2 border-b border-border-secondary">
              <div>
                <span className="text-sm text-text-muted">Worst Performer</span>
                <div className="font-semibold">{stats.worstStock.symbol}</div>
              </div>
              <span className="text-accent-red font-mono">
                {formatCurrency(stats.worstStock.pnl)}
              </span>
            </div>
          )}

          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-text-muted">Total Fees</span>
            <span className="text-sm font-mono text-accent-yellow">
              {formatCurrency(stats.totalFees)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
