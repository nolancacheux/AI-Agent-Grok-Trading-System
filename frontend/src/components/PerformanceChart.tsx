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
    <div className="terminal-panel p-3 border border-neon-green/30 bg-terminal-black/95 backdrop-blur-sm">
      <div className="text-xs text-terminal-text mb-2">
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
          <span className="text-terminal-text">Value:</span>
          <span className="text-white font-medium">{formatCurrency(data.totalValue)}</span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-terminal-text">P&L:</span>
          <span className={isProfit ? 'text-neon-green' : 'text-neon-red'}>
            {formatCurrency(data.pnl)} ({data.pnlPercent.toFixed(2)}%)
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-terminal-text">Cash:</span>
          <span className="text-white">{formatCurrency(data.cash)}</span>
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
    <div className="terminal-panel p-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-neon-green text-lg font-mono">&gt;&gt;</span>
          <h2 className="text-sm font-medium text-terminal-text uppercase tracking-widest">
            Real-Time Performance
          </h2>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-1">
          {TIME_RANGES.map((range) => (
            <button
              key={range.value}
              onClick={() => setSelectedRange(range.value)}
              className={`px-3 py-1 text-xs font-mono transition-all duration-200 border ${
                selectedRange === range.value
                  ? 'bg-neon-green/20 border-neon-green text-neon-green'
                  : 'border-terminal-border text-terminal-text hover:border-neon-green/50 hover:text-neon-green/80'
              }`}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[300px] relative">
        {/* Grid overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(#00ff0010 1px, transparent 1px),
              linear-gradient(90deg, #00ff0010 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px',
          }}
        />

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={filteredData}
            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isOverallProfit ? '#00ff00' : '#ff3333'}
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor={isOverallProfit ? '#00ff00' : '#ff3333'}
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>

            <XAxis
              dataKey="timestamp"
              axisLine={{ stroke: '#222' }}
              tickLine={{ stroke: '#222' }}
              tick={{ fill: '#666', fontSize: 10 }}
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
              axisLine={{ stroke: '#222' }}
              tickLine={{ stroke: '#222' }}
              tick={{ fill: '#666', fontSize: 10 }}
              tickFormatter={(value: number) => `$${value}`}
              width={60}
            />

            <Tooltip content={<CustomTooltip />} />

            <ReferenceLine
              y={initialValue}
              stroke="#00ff0040"
              strokeDasharray="5 5"
              label={{
                value: 'Initial',
                fill: '#666',
                fontSize: 10,
                position: 'right',
              }}
            />

            <Area
              type="monotone"
              dataKey="totalValue"
              stroke={isOverallProfit ? '#00ff00' : '#ff3333'}
              strokeWidth={2}
              fill={`url(#${gradientId})`}
              dot={false}
              activeDot={{
                r: 4,
                fill: isOverallProfit ? '#00ff00' : '#ff3333',
                stroke: '#0a0a0a',
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Chart Footer Stats */}
      <div className="flex justify-between mt-4 pt-4 border-t border-terminal-border">
        <div className="text-xs">
          <span className="text-terminal-text">High: </span>
          <span className="text-white">{formatCurrency(maxValue)}</span>
        </div>
        <div className="text-xs">
          <span className="text-terminal-text">Low: </span>
          <span className="text-white">{formatCurrency(minValue)}</span>
        </div>
        <div className="text-xs">
          <span className="text-terminal-text">Points: </span>
          <span className="text-neon-green">{filteredData.length}</span>
        </div>
      </div>
    </div>
  );
}
