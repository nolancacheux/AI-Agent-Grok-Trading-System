'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Icons } from '@/components/ui/Icons';
import { useChatHistory, useReflections, useDecisions } from '@/hooks/useAgentState';
import clsx from 'clsx';
import { format } from 'date-fns';

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

function formatTimezone(timestamp: string, timezone: string): string {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return '--:--:--';
  }
}

interface Decision {
  id: number;
  timestamp: string;
  action: 'buy' | 'sell' | 'close' | 'keep';
  symbol?: string;
  quantity?: number;
  reasoning: string;
  context?: string;
  risk_score?: number;
  executed: boolean;
  trade_id?: number;
}

function AnalysesActivity() {
  const { data, isLoading } = useDecisions({ limit: 50 });
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full" />
      </div>
    );
  }

  const decisions: Decision[] = data?.decisions || [];

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getActionIcon = (action: string, executed: boolean) => {
    if (action === 'keep') return '⏸';
    if (action === 'buy') return executed ? '↑' : '?';
    if (action === 'sell' || action === 'close') return executed ? '↓' : '?';
    return '⋯';
  };

  const getActionColor = (action: string) => {
    if (action === 'keep') return 'bg-[var(--color-info-bg)] text-[var(--color-info)]';
    if (action === 'buy') return 'bg-[var(--color-profit-bg)] text-[var(--color-profit)]';
    if (action === 'sell' || action === 'close') return 'bg-[var(--color-loss-bg)] text-[var(--color-loss)]';
    return 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)]';
  };

  return (
    <div className="space-y-2">
      {decisions.length === 0 ? (
        <div className="text-center py-8 text-[var(--color-text-muted)]">
          <p>No analyses yet</p>
          <p className="text-xs mt-2 opacity-60">Activity will appear here when the bot analyzes.</p>
        </div>
      ) : (
        decisions.map((decision) => (
          <div
            key={decision.id}
            className="rounded-lg bg-[var(--color-bg-tertiary)] hover:bg-[var(--color-bg-hover)] transition-colors animate-fadeIn overflow-hidden"
          >
            <button
              onClick={() => toggleExpand(decision.id)}
              className="w-full p-3 text-left"
            >
              <div className="flex items-start gap-3">
                <div className={clsx(
                  'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-sm font-bold',
                  getActionColor(decision.action)
                )}>
                  {getActionIcon(decision.action, decision.executed)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={clsx(
                        'text-xs font-semibold uppercase px-1.5 py-0.5 rounded',
                        decision.action === 'keep' ? 'bg-[var(--color-info)]/20 text-[var(--color-info)]' :
                        decision.action === 'buy' ? 'bg-[var(--color-profit)]/20 text-[var(--color-profit)]' :
                        'bg-[var(--color-loss)]/20 text-[var(--color-loss)]'
                      )}>
                        {decision.action}
                      </span>
                      {decision.symbol && (
                        <span className="text-sm font-mono text-[var(--color-text-primary)]">
                          {decision.symbol}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]">
                      <span className="hidden sm:inline">View Details</span>
                      <Icons.ChevronLeft
                        width={14}
                        height={14}
                        className={clsx(
                          'transition-transform',
                          expandedId === decision.id ? 'rotate-90' : '-rotate-90'
                        )}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-[var(--color-text-secondary)] leading-snug mt-1 line-clamp-2">
                    {decision.reasoning.slice(0, 80)}{decision.reasoning.length > 80 ? '...' : ''}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {formatDate(decision.timestamp)}
                    </span>
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {formatTime(decision.timestamp)}
                    </span>
                    {decision.executed && (
                      <span className="text-xs text-[var(--color-profit)] font-medium">
                        ✓ Executed
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>

            {/* Expanded Details */}
            {expandedId === decision.id && (
              <div className="px-3 pb-3 border-t border-[var(--color-border-subtle)] mt-2 pt-3">
                {/* Full Reasoning */}
                <div className="mb-3">
                  <p className="text-xs font-medium text-[var(--color-text-muted)] mb-1">Full Reasoning</p>
                  <p className="text-sm text-[var(--color-text-primary)] leading-relaxed whitespace-pre-wrap">
                    {decision.reasoning}
                  </p>
                </div>

                {/* Action Details */}
                {decision.action !== 'keep' && decision.symbol && (
                  <div className="mb-3 p-2 rounded bg-[var(--color-bg-secondary)]">
                    <div className="flex items-center justify-between text-xs">
                      <span className={clsx(
                        'font-semibold uppercase',
                        decision.action === 'buy' ? 'text-[var(--color-profit)]' :
                        'text-[var(--color-loss)]'
                      )}>
                        {decision.action}
                      </span>
                      <span className="text-[var(--color-text-primary)] font-mono">
                        {decision.symbol}
                      </span>
                    </div>
                    {decision.quantity && (
                      <div className="flex items-center justify-between text-xs mt-1 text-[var(--color-text-muted)]">
                        <span>{decision.quantity} shares</span>
                        <span>{decision.executed ? 'Executed' : 'Not executed'}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Risk Score */}
                {decision.risk_score !== undefined && decision.risk_score !== null && (
                  <div className="mb-3 p-2 rounded bg-[var(--color-bg-secondary)]">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--color-text-muted)]">Risk Score</span>
                      <span className={clsx(
                        'font-medium',
                        decision.risk_score <= 30 ? 'text-[var(--color-profit)]' :
                        decision.risk_score <= 60 ? 'text-[var(--color-warning)]' :
                        'text-[var(--color-loss)]'
                      )}>
                        {decision.risk_score}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Timezone Times */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-[var(--color-bg-secondary)]">
                    <span className="text-[var(--color-text-muted)] block">Paris</span>
                    <span className="text-[var(--color-text-primary)] font-mono">
                      {formatTimezone(decision.timestamp, 'Europe/Paris')}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[var(--color-bg-secondary)]">
                    <span className="text-[var(--color-text-muted)] block">New York</span>
                    <span className="text-[var(--color-text-primary)] font-mono">
                      {formatTimezone(decision.timestamp, 'America/New_York')}
                    </span>
                  </div>
                </div>
              </div>
            )}
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
  const [expandedId, setExpandedId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-5 h-5 border-2 border-zinc-600 border-t-white rounded-full" />
      </div>
    );
  }

  const reflections = data?.reflections || [];

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

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
            className="rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-bg-tertiary)] animate-fadeIn overflow-hidden"
          >
            {/* Collapsed Header */}
            <button
              onClick={() => toggleExpand(ref.id)}
              className="w-full p-4 text-left"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Icons.Reflections width={14} height={14} className="text-[var(--color-info)]" />
                  <span className="text-xs font-medium text-[var(--color-text-muted)]">
                    {formatDate(ref.timestamp)}
                  </span>
                </div>
                <Icons.ChevronLeft
                  width={14}
                  height={14}
                  className={clsx(
                    'text-[var(--color-text-muted)] transition-transform',
                    expandedId === ref.id ? 'rotate-90' : '-rotate-90'
                  )}
                />
              </div>

              {/* Stats */}
              <div className="flex items-center gap-4 text-xs">
                <span className="text-[var(--color-text-muted)]">
                  {ref.trades_analyzed} trades
                </span>
                <span className={ref.total_pnl >= 0 ? 'text-profit' : 'text-loss'}>
                  {ref.total_pnl >= 0 ? '+' : ''}${ref.total_pnl.toFixed(2)}
                </span>
                <span className="text-[var(--color-text-muted)]">
                  {(ref.win_rate * 100).toFixed(0)}% win
                </span>
              </div>
            </button>

            {/* Expanded Content */}
            {expandedId === ref.id && (
              <div className="px-4 pb-4 border-t border-[var(--color-border-subtle)] pt-3">
                {/* Timezone Times */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div className="p-2 rounded bg-[var(--color-bg-secondary)]">
                    <span className="text-[var(--color-text-muted)] block">Paris</span>
                    <span className="text-[var(--color-text-primary)] font-mono">
                      {formatTimezone(ref.timestamp, 'Europe/Paris')}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-[var(--color-bg-secondary)]">
                    <span className="text-[var(--color-text-muted)] block">New York</span>
                    <span className="text-[var(--color-text-primary)] font-mono">
                      {formatTimezone(ref.timestamp, 'America/New_York')}
                    </span>
                  </div>
                </div>

                {/* Full Content */}
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
            )}
          </div>
        ))
      )}
    </div>
  );
}

export function RightPanel() {
  const { rightPanelOpen, rightPanelTab, setRightPanelTab, toggleRightPanel } = useAppStore();
  const { data: decisionsData } = useDecisions({ limit: 50 });
  const { data: chatData } = useChatHistory(50);
  const { data: reflectionsData } = useReflections(10);

  const tabs = [
    { id: 'neural' as const, label: 'Analyses', count: decisionsData?.decisions?.length || 0 },
    { id: 'chat' as const, label: 'Chat', count: chatData?.messages?.length || 0 },
    { id: 'reflections' as const, label: 'Auto-Reflection', count: reflectionsData?.reflections?.length || 0 },
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
        {rightPanelTab === 'neural' && <AnalysesActivity />}
        {rightPanelTab === 'chat' && <ChatHistory />}
        {rightPanelTab === 'reflections' && <Reflections />}
      </div>
    </aside>
  );
}
