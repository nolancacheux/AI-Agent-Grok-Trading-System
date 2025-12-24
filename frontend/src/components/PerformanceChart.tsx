'use client';

import { useState, useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { PortfolioSnapshot, TimeRange } from '@/types';
import { formatCurrency } from '@/data/mockData';

interface PerformanceChartProps {
  data: PortfolioSnapshot[];
  initialValue: number;
}

const TIME_RANGES: TimeRange[] = [
  { label: '1H', value: '1H', hours: 1 },
  { label: '24H', value: '24H', hours: 24 },
  { label: '7D', value: '7D', hours: 168 },
  { label: 'ALL', value: 'ALL', hours: null },
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: PortfolioSnapshot }>;
  label?: string;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload;
  const isProfit = data.pnl >= 0;

  return (
    <div className="bg-bg-secondary border border-border-primary rounded-lg p-3 shadow-lg">
      <div className="text-xs text-text-muted mb-2">
        {new Date(data.timestamp).toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        })}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between gap-6">
          <span className="text-text-muted text-sm">Value:</span>
          <span className="text-text-primary font-medium font-mono">
            {formatCurrency(data.totalValue)}
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-text-muted text-sm">P&L:</span>
          <span className={`font-mono ${isProfit ? 'text-accent-green' : 'text-accent-red'}`}>
            {formatCurrency(data.pnl)} ({data.pnlPercent.toFixed(2)}%)
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-text-muted text-sm">Cash:</span>
          <span className="text-text-primary font-mono">{formatCurrency(data.cash)}</span>
        </div>
      </div>
    </div>
  );
}

export function PerformanceChart({ data, initialValue }: PerformanceChartProps) {
  const [selectedRange, setSelectedRange] = useState<TimeRange['value']>('ALL');

  const filteredData = useMemo(() => {
    const range = TIME_RANGES.find((r) => r.value === selectedRange);
    if (!range || !range.hours) return data;

    const now = new Date();
    const cutoff = new Date(now.getTime() - range.hours * 60 * 60 * 1000);
    return data.filter((d) => new Date(d.timestamp) >= cutoff);
  }, [data, selectedRange]);

  const { minValue, maxValue, isOverallProfit } = useMemo(() => {
    const values = filteredData.map((d) => d.totalValue);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = (max - min) * 0.1;
    const lastValue = filteredData[filteredData.length - 1]?.totalValue || initialValue;

    return {
      minValue: Math.floor((min - padding) / 10) * 10,
      maxValue: Math.ceil((max + padding) / 10) * 10,
      isOverallProfit: lastValue >= initialValue,
    };
  }, [filteredData, initialValue]);

  const gradientId = 'performanceGradient';

  return (
    <div className="card h-full">
      <div className="card-header flex items-center justify-between">
        <span>Portfolio Performance</span>

        <div className="flex gap-1">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setSelectedRange(range.value)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                selectedRange === range.value
                  ? 'bg-accent-blue text-white'
                  : 'text-text-muted hover:text-text-primary hover:bg-bg-tertiary'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={filteredData}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={isOverallProfit ? '#3fb950' : '#f85149'}
                    stopOpacity={0.2}
                  />
                  <stop
                    offset="100%"
                    stopColor={isOverallProfit ? '#3fb950' : '#f85149'}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>

              <XAxis
                dataKey="timestamp"
                axisLine={{ stroke: '#30363d' }}
                tickLine={{ stroke: '#30363d' }}
                tick={{ fill: '#6e7681', fontSize: 11 }}
                tickFormatter={(value: string) => {
                  const date = new Date(value);
                  return selectedRange === '1H'
                    ? date.toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })
                    : date.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      });
                }}
                interval="preserveStartEnd"
                minTickGap={50}
              />

              <YAxis
                domain={[minValue, maxValue]}
                axisLine={{ stroke: '#30363d' }}
                tickLine={{ stroke: '#30363d' }}
                tick={{ fill: '#6e7681', fontSize: 11 }}
                tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
                width={55}
              />

              <Tooltip content={<CustomTooltip />} />

              <ReferenceLine
                y={initialValue}
                stroke="#30363d"
                strokeDasharray="4 4"
                label={{
                  value: 'Initial',
                  fill: '#6e7681',
                  fontSize: 10,
                  position: 'right',
                }}
              />

              <Area
                type="monotone"
                dataKey="totalValue"
                stroke={isOverallProfit ? '#3fb950' : '#f85149'}
                strokeWidth={2}
                fill={`url(#${gradientId})`}
                dot={false}
                activeDot={{
                  r: 4,
                  fill: isOverallProfit ? '#3fb950' : '#f85149',
                  stroke: '#0d1117',
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex justify-between mt-4 pt-4 border-t border-border-secondary text-xs">
          <div>
            <span className="text-text-muted">High: </span>
            <span className="text-text-primary font-mono">{formatCurrency(maxValue)}</span>
          </div>
          <div>
            <span className="text-text-muted">Low: </span>
            <span className="text-text-primary font-mono">{formatCurrency(minValue)}</span>
          </div>
          <div>
            <span className="text-text-muted">Data Points: </span>
            <span className="text-text-secondary font-mono">{filteredData.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
