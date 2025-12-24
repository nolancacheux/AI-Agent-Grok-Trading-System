'use client';

import type { DailyStats } from '@/types';
import { formatCurrency } from '@/data/mockData';

interface StatsPanelProps {
  stats: DailyStats;
}

function StatItem({
  label,
  value,
  subValue,
  valueColor = 'text-white',
}: {
  label: string;
  value: string | number;
  subValue?: string;
  valueColor?: string;
}) {
  return (
    <div className="py-3 border-b border-terminal-border/50 last:border-b-0">
      <div className="text-xs text-terminal-text uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className={`text-lg font-bold ${valueColor}`}>{value}</div>
      {subValue && (
        <div className="text-xs text-terminal-text mt-0.5">{subValue}</div>
      )}
    </div>
  );
}

function WinRateBar({ rate }: { rate: number }) {
  return (
    <div className="py-3 border-b border-terminal-border/50">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-terminal-text uppercase tracking-wider">
          Win Rate
        </span>
        <span
          className={`text-lg font-bold ${
            rate >= 60 ? 'text-neon-green' : rate >= 40 ? 'text-amber-400' : 'text-neon-red'
          }`}
        >
          {rate.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 bg-terminal-gray rounded overflow-hidden flex">
        <div
          className="h-full bg-neon-green transition-all duration-500"
          style={{ width: `${rate}%` }}
        />
        <div
          className="h-full bg-neon-red transition-all duration-500"
          style={{ width: `${100 - rate}%` }}
        />
      </div>
      <div className="flex justify-between text-xs mt-1">
        <span className="text-neon-green">W</span>
        <span className="text-neon-red">L</span>
      </div>
    </div>
  );
}

export function StatsPanel({ stats }: StatsPanelProps) {
  return (
    <div className="terminal-panel p-4 h-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-neon-green text-lg font-mono">&gt;&gt;</span>
        <h2 className="text-sm font-medium text-terminal-text uppercase tracking-widest">
          Today&apos;s Stats
        </h2>
      </div>

      {/* Stats List */}
      <div className="space-y-0">
        <StatItem
          label="Total Trades"
          value={stats.totalTrades}
          subValue={`${stats.winningTrades}W / ${stats.losingTrades}L`}
          valueColor="text-white"
        />

        <WinRateBar rate={stats.winRate} />

        <StatItem
          label="Avg Trade Duration"
          value={stats.avgTradeDuration}
          valueColor="text-cyan-400"
        />

        {stats.bestStock && (
          <div className="py-3 border-b border-terminal-border/50">
            <div className="text-xs text-terminal-text uppercase tracking-wider mb-1">
              Best Performer
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">
                {stats.bestStock.symbol}
              </span>
              <span className="text-neon-green font-medium">
                +{formatCurrency(stats.bestStock.pnl)}
              </span>
            </div>
          </div>
        )}

        {stats.worstStock && (
          <div className="py-3 border-b border-terminal-border/50">
            <div className="text-xs text-terminal-text uppercase tracking-wider mb-1">
              Worst Performer
            </div>
            <div className="flex items-center justify-between">
              <span className="font-bold text-white">
                {stats.worstStock.symbol}
              </span>
              <span className="text-neon-red font-medium">
                {formatCurrency(stats.worstStock.pnl)}
              </span>
            </div>
          </div>
        )}

        <StatItem
          label="Total Fees Paid"
          value={formatCurrency(stats.totalFees)}
          valueColor="text-amber-400"
        />
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-terminal-border">
        <div className="text-xs text-terminal-text text-center">
          <span className="text-neon-green">GROK</span> is analyzing markets
          <span className="animate-blink ml-1">_</span>
        </div>
      </div>
    </div>
  );
}
