'use client';

import type { AgentState, Trade } from '@/types';
import { formatCurrency } from '@/data/mockData';

interface AgentStatusCardProps {
  agent: AgentState;
  lastTrade?: Trade;
  onTriggerAnalysis?: () => void;
  isAnalyzing?: boolean;
}

function RiskGauge({ value }: { value: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;
  const offset = circumference - progress;

  const color =
    value >= 80
      ? '#f85149'
      : value >= 50
      ? '#d29922'
      : '#3fb950';

  return (
    <div className="relative w-24 h-24">
      <svg
        className="w-full h-full transform -rotate-90"
        viewBox="0 0 100 100"
      >
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#21262d"
          strokeWidth="6"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="gauge-ring"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-xl font-semibold font-mono"
          style={{ color }}
        >
          {value}
        </span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider">Risk</span>
      </div>
    </div>
  );
}

export function AgentStatusCard({ agent, lastTrade, onTriggerAnalysis, isAnalyzing }: AgentStatusCardProps) {
  const statusConfig = {
    IDLE: {
      label: 'Idle',
      className: 'badge-yellow',
      dotClass: 'bg-accent-yellow',
    },
    ANALYZING: {
      label: 'Analyzing',
      className: 'badge-blue',
      dotClass: 'bg-accent-blue animate-pulse',
    },
    TRADING: {
      label: 'Trading',
      className: 'badge-green',
      dotClass: 'bg-accent-green',
    },
    ERROR: {
      label: 'Error',
      className: 'badge-red',
      dotClass: 'bg-accent-red',
    },
  };

  const config = statusConfig[agent.status];
  const lastRisk = lastTrade?.evaluatedRisk || 0;

  return (
    <div className="card">
      <div className="card-header flex items-center justify-between">
        <span>Agent Status</span>
        <span className={`badge ${config.className}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${config.dotClass} mr-1.5`} />
          {config.label}
        </span>
      </div>

      <div className="card-body space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="metric-card">
            <div className="metric-label">Cash Balance</div>
            <div className="metric-value text-lg text-accent-green">
              {formatCurrency(agent.cash)}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Positions</div>
            <div className="metric-value text-lg">
              {agent.positions.length}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-center py-2">
          <RiskGauge value={lastRisk} />
        </div>

        <div className="p-3 bg-bg-tertiary rounded-md">
          <div className="text-[11px] text-text-muted uppercase tracking-wider mb-1">
            Last Action
          </div>
          <p className="text-sm text-text-secondary line-clamp-2">
            {agent.lastAction || 'No recent actions'}
          </p>
          {agent.lastActionTime && (
            <div className="text-xs text-text-muted mt-2 font-mono">
              {new Date(agent.lastActionTime).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: false,
              })}
            </div>
          )}
        </div>

        {onTriggerAnalysis && (
          <button
            onClick={onTriggerAnalysis}
            disabled={isAnalyzing || agent.status === 'ANALYZING'}
            className="btn btn-primary w-full"
          >
            {isAnalyzing || agent.status === 'ANALYZING' ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              'Run Analysis'
            )}
          </button>
        )}
      </div>
    </div>
  );
}
