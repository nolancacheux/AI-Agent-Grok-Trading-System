'use client';

import type { AgentState, Trade } from '@/types';
import { formatCurrency } from '@/data/mockData';

interface AgentStatusCardProps {
  agent: AgentState;
  lastTrade?: Trade;
}

function RiskGauge({ value }: { value: number }) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const progress = (value / 100) * circumference;
  const offset = circumference - progress;

  const color =
    value >= 80
      ? '#ff3333'
      : value >= 50
      ? '#ffaa00'
      : '#00ff00';

  return (
    <div className="relative w-28 h-28">
      <svg
        className="w-full h-full transform -rotate-90"
        viewBox="0 0 100 100"
      >
        {/* Background circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#222"
          strokeWidth="8"
        />
        {/* Progress circle */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="gauge-ring transition-all duration-700"
          style={{
            filter: `drop-shadow(0 0 6px ${color})`,
          }}
        />
        {/* Glow effect */}
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="gauge-ring"
          style={{
            filter: `blur(4px)`,
            opacity: 0.5,
          }}
        />
      </svg>

      {/* Center text */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-2xl font-bold font-display"
          style={{ color }}
        >
          {value}
        </span>
        <span className="text-xs text-terminal-text">RISK</span>
      </div>
    </div>
  );
}

export function AgentStatusCard({ agent, lastTrade }: AgentStatusCardProps) {
  const statusConfig = {
    IDLE: {
      color: 'text-gray-400',
      bg: 'bg-gray-400/10',
      border: 'border-gray-400/30',
      glow: '',
      icon: '...',
    },
    ANALYZING: {
      color: 'text-cyan-400',
      bg: 'bg-cyan-400/10',
      border: 'border-cyan-400/30',
      glow: 'animate-pulse',
      icon: '>>',
    },
    TRADING: {
      color: 'text-neon-green',
      bg: 'bg-neon-green/10',
      border: 'border-neon-green/30',
      glow: 'animate-pulse glow-green',
      icon: '!!',
    },
  };

  const config = statusConfig[agent.status];
  const lastRisk = lastTrade?.evaluatedRisk || 0;

  return (
    <div className="terminal-panel p-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-neon-green text-lg font-mono">&gt;&gt;</span>
          <h2 className="text-sm font-medium text-terminal-text uppercase tracking-widest">
            Agent Status
          </h2>
        </div>
      </div>

      {/* Agent Name & Status */}
      <div className="flex items-center gap-4 mb-6">
        <div
          className={`w-12 h-12 rounded flex items-center justify-center border ${config.bg} ${config.border} ${config.glow}`}
        >
          <span className={`font-mono text-lg ${config.color}`}>
            {config.icon}
          </span>
        </div>
        <div>
          <div className="font-display text-xl font-bold text-white">
            {agent.name}
          </div>
          <div className={`text-sm font-medium ${config.color}`}>
            {agent.status}
            {agent.status === 'ANALYZING' && (
              <span className="ml-2 animate-blink">_</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-terminal-dark border border-terminal-border rounded p-3">
          <div className="text-xs text-terminal-text uppercase tracking-wider mb-1">
            Cash Balance
          </div>
          <div className="text-lg font-bold text-neon-green">
            {formatCurrency(agent.cash)}
          </div>
        </div>
        <div className="bg-terminal-dark border border-terminal-border rounded p-3">
          <div className="text-xs text-terminal-text uppercase tracking-wider mb-1">
            Open Positions
          </div>
          <div className="text-lg font-bold text-white">
            {agent.holdings}
          </div>
        </div>
      </div>

      {/* Risk Gauge */}
      <div className="flex items-center justify-center mb-6">
        <RiskGauge value={lastRisk} />
      </div>

      {/* Last Action */}
      <div className="bg-terminal-dark border border-terminal-border rounded p-3">
        <div className="text-xs text-terminal-text uppercase tracking-wider mb-2">
          Last Action
        </div>
        <p className="text-sm text-gray-300 line-clamp-2">
          {agent.lastAction || 'No recent actions'}
        </p>
        {agent.lastActionTime && (
          <div className="text-xs text-terminal-text mt-2">
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
    </div>
  );
}
