'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { useAppStore } from '@/lib/store';
import { Icons } from '@/components/ui/Icons';
import type { PortfolioSnapshot } from '@/types';
import clsx from 'clsx';
import { format } from 'date-fns';

interface PortfolioChartProps {
  data: PortfolioSnapshot[];
  initialValue: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: PortfolioSnapshot }>;
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const isProfit = data.pnl >= 0;

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-title">
        {format(new Date(data.timestamp), 'MMM d, HH:mm')}
      </div>
      <div className="chart-tooltip-value">
        {formatCurrency(data.totalValue)}
      </div>
      <div className={clsx('chart-tooltip-change', isProfit ? 'text-profit' : 'text-loss')}>
        {formatPercent(data.pnlPercent)} ({isProfit ? '+' : ''}{formatCurrency(data.pnl)})
      </div>
    </div>
  );
}

export function PortfolioChart({ data, initialValue }: PortfolioChartProps) {
  const { chartMode, setChartMode, chartTimeRange, setChartTimeRange, isPlaying, togglePlayback } = useAppStore();

  const timeRanges = ['1H', '24H', '7D', 'ALL'] as const;

  const filteredData = useMemo(() => {
    if (!data.length) return [];

    const now = new Date();
    let cutoff: Date;

    switch (chartTimeRange) {
      case '1H':
        cutoff = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24H':
        cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7D':
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        return data;
    }

    return data.filter((d) => new Date(d.timestamp) >= cutoff);
  }, [data, chartTimeRange]);

  const chartData = useMemo(() => {
    return filteredData.map((d) => ({
      ...d,
      displayValue: chartMode === 'percent' ? d.pnlPercent : d.totalValue,
    }));
  }, [filteredData, chartMode]);

  const isProfit = filteredData.length > 0 && filteredData[filteredData.length - 1].pnl >= 0;

  const { minValue, maxValue } = useMemo(() => {
    if (!chartData.length) return { minValue: 0, maxValue: 0 };
    const values = chartData.map((d) => d.displayValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1 || 10;
    return {
      minValue: min - padding,
      maxValue: max + padding,
    };
  }, [chartData]);

  const gradientId = isProfit ? 'profitGradient' : 'lossGradient';
  const strokeColor = isProfit ? 'var(--color-profit)' : 'var(--color-loss)';

  return (
    <div className="card h-full flex flex-col">
      <div className="card-header">
        <div className="flex items-center gap-3">
          <span className="card-title">Portfolio Value History</span>
          {filteredData.length > 0 && (
            <span className="text-xs text-[var(--color-text-muted)] font-mono">
              ({filteredData.length} points)
            </span>
          )}
        </div>

        <div className="chart-controls">
          {/* Mode Toggle */}
          <div className="segmented-control">
            <button
              onClick={() => setChartMode('dollar')}
              className={clsx('segment', chartMode === 'dollar' && 'active')}
            >
              <Icons.Dollar width={14} height={14} />
            </button>
            <button
              onClick={() => setChartMode('percent')}
              className={clsx('segment', chartMode === 'percent' && 'active')}
            >
              <Icons.Percent width={14} height={14} />
            </button>
          </div>

          {/* Time Range */}
          <div className="segmented-control">
            {timeRanges.map((range) => (
              <button
                key={range}
                onClick={() => setChartTimeRange(range)}
                className={clsx('segment', chartTimeRange === range && 'active')}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Playback */}
          <button
            onClick={togglePlayback}
            className={clsx(
              'btn btn-ghost btn-icon btn-sm',
              isPlaying && 'text-[var(--color-accent-primary)]'
            )}
            title={isPlaying ? 'Pause Playback' : 'Start Playback'}
          >
            {isPlaying ? (
              <Icons.Pause width={16} height={16} />
            ) : (
              <Icons.Play width={16} height={16} />
            )}
          </button>
        </div>
      </div>

      <div className="card-body flush flex-1 min-h-0">
        {chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="text-[var(--color-text-muted)] mb-2">No historical data yet</div>
            <div className="text-xs text-[var(--color-text-muted)] opacity-60">
              Portfolio snapshots are recorded every minute during market hours.
              <br />
              Data will appear here once snapshots are collected.
            </div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-profit)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-profit)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="lossGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-loss)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--color-loss)" stopOpacity={0} />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="timestamp"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                tickFormatter={(value) => format(new Date(value), 'MM/dd HH:mm')}
                minTickGap={80}
              />

              <YAxis
                domain={[minValue, maxValue]}
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                tickFormatter={(value) =>
                  chartMode === 'percent'
                    ? `${value.toFixed(1)}%`
                    : formatCurrency(value)
                }
                width={70}
              />

              <Tooltip content={<CustomTooltip />} />

              {chartMode === 'percent' && (
                <ReferenceLine
                  y={0}
                  stroke="var(--color-border-default)"
                  strokeDasharray="4 4"
                />
              )}

              {chartMode === 'dollar' && (
                <ReferenceLine
                  y={initialValue}
                  stroke="var(--color-text-muted)"
                  strokeDasharray="4 4"
                  label={{
                    value: 'Initial',
                    position: 'right',
                    fontSize: 10,
                    fill: 'var(--color-text-muted)',
                  }}
                />
              )}

              <Area
                type="monotone"
                dataKey="displayValue"
                stroke={strokeColor}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                animationDuration={500}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
