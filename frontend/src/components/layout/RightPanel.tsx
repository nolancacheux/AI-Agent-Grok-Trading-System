'use client';

import { useAppStore } from '@/lib/store';
import { Icons } from '@/components/ui/Icons';
import type { Trade, NeuralLog } from '@/types';
import clsx from 'clsx';
import { format } from 'date-fns';

interface RightPanelProps {
  trades: Trade[];
  neuralLogs?: NeuralLog[];
}

function formatTime(timestamp: string): string {
  try {
    return format(new Date(timestamp), 'HH:mm:ss');
  } catch {
    return '--:--:--';
  }
}

function formatDate(timestamp: string): string {
  try {
    return format(new Date(timestamp), 'MMM d');
  } catch {
    return '';
  }
}

function NeuralActivity({ trades }: { trades: Trade[] }) {
  // Generate neural logs from trades
  const logs = trades.slice(0, 20).map((trade, i) => ({
    id: trade.id,
    timestamp: trade.timestamp,
    type: trade.action === 'buy' || trade.action === 'sell' ? 'trade' : 'analysis',
    summary: trade.reasoning?.slice(0, 60) + (trade.reasoning?.length > 60 ? '...' : '') || `${trade.action.toUpperCase()} ${trade.symbol}`,
    status: trade.status === 'filled' ? 'complete' : 'pending',
  }));

  return (
    <div className="space-y-2">
      {logs.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-text-muted)]">
          No neural activity yet
        </div>
      ) : (
        logs.map((log) => (
          <div
            key={log.id}
            className="p-3 rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] transition-colors animate-fadeIn"
          >
            <div className="flex items-start gap-3">
              <div className={clsx(
                'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-sm',
                log.status === 'complete' ? 'bg-[var(--color-profit-bg)] text-[var(--color-profit)]' : 'bg-[var(--color-info-bg)] text-[var(--color-info)]'
              )}>
                {log.status === 'complete' ? '✓' : '⋯'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-text-primary)] leading-snug">
                  {log.summary}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {formatDate(log.timestamp)}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {formatTime(log.timestamp)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function ChatHistory({ trades }: { trades: Trade[] }) {
  // Generate chat-like entries from trade reasonings
  const messages = trades
    .filter(t => t.reasoning)
    .slice(0, 15)
    .map((trade) => ({
      id: trade.id,
      timestamp: trade.timestamp,
      content: trade.reasoning,
      action: trade.action,
      symbol: trade.symbol,
    }));

  return (
    <div className="space-y-3">
      {messages.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-text-muted)]">
          No chat history yet
        </div>
      ) : (
        messages.map((msg) => (
          <div key={msg.id} className="animate-fadeIn">
            <div className="flex items-center gap-2 mb-1">
              <span className={clsx(
                'text-xs font-mono font-semibold',
                msg.action === 'buy' ? 'text-profit' : msg.action === 'sell' ? 'text-loss' : 'text-info'
              )}>
                {msg.action.toUpperCase()} {msg.symbol}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {formatTime(msg.timestamp)}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-bg-tertiary)] text-sm text-[var(--color-text-secondary)] leading-relaxed">
              {msg.content}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function Reflections({ trades }: { trades: Trade[] }) {
  // Aggregate reflections from trades
  const reflections = trades
    .filter(t => t.reasoning && t.reasoning.length > 50)
    .slice(0, 10)
    .map((trade, i) => ({
      id: trade.id,
      timestamp: trade.timestamp,
      insight: trade.reasoning,
      result: trade.status === 'filled' ? 'success' : 'pending',
    }));

  return (
    <div className="space-y-3">
      {reflections.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-text-muted)]">
          No reflections yet
        </div>
      ) : (
        reflections.map((ref) => (
          <div
            key={ref.id}
            className="p-4 rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)] animate-fadeIn"
          >
            <div className="flex items-center gap-2 mb-2">
              <Icons.Reflections width={14} height={14} className="text-[var(--color-info)]" />
              <span className="text-xs font-medium text-[var(--color-text-muted)]">
                {formatDate(ref.timestamp)} at {formatTime(ref.timestamp)}
              </span>
            </div>
            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed">
              {ref.insight}
            </p>
          </div>
        ))
      )}
    </div>
  );
}

export function RightPanel({ trades }: RightPanelProps) {
  const { rightPanelOpen, rightPanelTab, setRightPanelTab, toggleRightPanel } = useAppStore();

  const tabs = [
    { id: 'neural' as const, label: 'Neural', count: trades.length },
    { id: 'chat' as const, label: 'Chat', count: trades.filter(t => t.reasoning).length },
    { id: 'reflections' as const, label: 'Reflect', count: trades.filter(t => t.reasoning?.length > 50).length },
  ];

  return (
    <aside className={clsx('right-panel', !rightPanelOpen && 'collapsed')}>
      <div className="right-panel-header">
        <div className="right-panel-tabs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setRightPanelTab(tab.id)}
              className={clsx('right-panel-tab', rightPanelTab === tab.id && 'active')}
            >
              {tab.label}
              <span className="ml-1 opacity-60">({tab.count})</span>
            </button>
          ))}
        </div>
        <button
          onClick={toggleRightPanel}
          className="btn btn-ghost btn-icon btn-sm"
        >
          <Icons.Close width={16} height={16} />
        </button>
      </div>

      <div className="right-panel-content">
        {rightPanelTab === 'neural' && <NeuralActivity trades={trades} />}
        {rightPanelTab === 'chat' && <ChatHistory trades={trades} />}
        {rightPanelTab === 'reflections' && <Reflections trades={trades} />}
      </div>
    </aside>
  );
}
