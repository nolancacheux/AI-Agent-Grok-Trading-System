'use client';

import { useAppStore } from '@/lib/store';
import { Icons } from '@/components/ui/Icons';
import { useChatHistory, useReflections } from '@/hooks/useAgentState';
import type { Trade } from '@/types';
import clsx from 'clsx';
import { format } from 'date-fns';

interface RightPanelProps {
  trades: Trade[];
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
  const logs = trades.slice(0, 20).map((trade) => ({
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
          <p>No neural activity yet</p>
          <p className="text-xs mt-2 opacity-60">Activity will appear here when the bot analyzes and trades.</p>
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

function ChatHistory() {
  const { data, isLoading } = useChatHistory(50);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full" />
      </div>
    );
  }

  const messages = data?.messages || [];

  return (
    <div className="space-y-3">
      {messages.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-text-muted)]">
          <p>No chat history yet</p>
          <p className="text-xs mt-2 opacity-60">The AI's thinking and analysis will appear here.</p>
        </div>
      ) : (
        messages.map((msg) => (
          <div key={msg.id} className="animate-fadeIn">
            <div className="flex items-center gap-2 mb-1">
              <span className={clsx(
                'text-xs font-mono font-semibold uppercase',
                msg.role === 'assistant' ? 'text-cyan-400' : msg.role === 'system' ? 'text-amber-400' : 'text-zinc-400'
              )}>
                {msg.role}
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {formatTime(msg.timestamp)}
              </span>
              {msg.tokens_used && (
                <span className="text-xs text-[var(--color-text-muted)] opacity-50">
                  {msg.tokens_used} tokens
                </span>
              )}
            </div>
            <div className="p-3 rounded-lg bg-[var(--color-bg-tertiary)] text-sm text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap">
              {msg.content.length > 500 ? msg.content.slice(0, 500) + '...' : msg.content}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function Reflections() {
  const { data, isLoading } = useReflections(10);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full" />
      </div>
    );
  }

  const reflections = data?.reflections || [];

  return (
    <div className="space-y-3">
      {reflections.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-text-muted)]">
          <p>No reflections yet</p>
          <p className="text-xs mt-2 opacity-60">The AI reflects on its performance every 5 trades.</p>
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

            {/* Stats */}
            <div className="flex items-center gap-4 mb-3 text-xs">
              <span className="text-[var(--color-text-muted)]">
                {ref.trades_analyzed} trades analyzed
              </span>
              <span className={ref.total_pnl >= 0 ? 'text-profit' : 'text-loss'}>
                {ref.total_pnl >= 0 ? '+' : ''}${ref.total_pnl.toFixed(2)} P&L
              </span>
              <span className="text-[var(--color-text-muted)]">
                {(ref.win_rate * 100).toFixed(0)}% win rate
              </span>
            </div>

            <p className="text-sm text-[var(--color-text-primary)] leading-relaxed mb-2">
              {ref.content}
            </p>

            {ref.lessons_learned && (
              <div className="mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
                <p className="text-xs font-medium text-amber-400 mb-1">Lessons Learned</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{ref.lessons_learned}</p>
              </div>
            )}

            {ref.strategy_adjustments && (
              <div className="mt-2">
                <p className="text-xs font-medium text-cyan-400 mb-1">Strategy Adjustments</p>
                <p className="text-xs text-[var(--color-text-secondary)]">{ref.strategy_adjustments}</p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export function RightPanel({ trades }: RightPanelProps) {
  const { rightPanelOpen, rightPanelTab, setRightPanelTab, toggleRightPanel } = useAppStore();
  const { data: chatData } = useChatHistory(50);
  const { data: reflectionsData } = useReflections(10);

  const tabs = [
    { id: 'neural' as const, label: 'Neural', count: trades.length },
    { id: 'chat' as const, label: 'Chat', count: chatData?.messages?.length || 0 },
    { id: 'reflections' as const, label: 'Reflect', count: reflectionsData?.reflections?.length || 0 },
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
        {rightPanelTab === 'chat' && <ChatHistory />}
        {rightPanelTab === 'reflections' && <Reflections />}
      </div>
    </aside>
  );
}
