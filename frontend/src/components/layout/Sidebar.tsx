'use client';

import { useAppStore, type ActivePanel } from '@/lib/store';
import { Icons } from '@/components/ui/Icons';
import { useHealth, useSchedulerStatus, useSetSchedulerMode, useTriggerAnalysis } from '@/hooks/useAgentState';
import clsx from 'clsx';
import { useState } from 'react';

interface NavItemConfig {
  id: ActivePanel;
  label: string;
  icon: keyof typeof Icons;
}

const mainNavItems: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'Dashboard' },
  { id: 'positions', label: 'Positions', icon: 'Positions' },
  { id: 'transactions', label: 'Transactions', icon: 'Transactions' },
];

const systemNavItems: NavItemConfig[] = [
  { id: 'settings', label: 'System Status', icon: 'Settings' },
];

export function Sidebar() {
  const { activePanel, setActivePanel, sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useAppStore();
  const { data: health, isLoading: healthLoading } = useHealth();
  const { data: scheduler, isLoading: schedulerLoading } = useSchedulerStatus();
  const setModeMutation = useSetSchedulerMode();
  const triggerMutation = useTriggerAnalysis();
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  const handleModeChange = (mode: 'MANUAL' | 'AUTO') => {
    setModeMutation.mutate(mode);
  };

  const handleTriggerAnalysis = () => {
    setAnalysisResult(null);
    triggerMutation.mutate(undefined, {
      onSuccess: (data) => {
        if (data.status === 'trade_executed' && data.trade) {
          setAnalysisResult(`${data.trade.action.toUpperCase()} ${data.trade.quantity} ${data.trade.symbol}`);
        } else if (data.decision) {
          const decision = data.decision as { action?: string; symbol?: string };
          setAnalysisResult(`${decision.action || 'KEEP'} ${decision.symbol || 'positions'}`);
        } else {
          setAnalysisResult('No trade');
        }
        setTimeout(() => setAnalysisResult(null), 5000);
      },
      onError: () => {
        setAnalysisResult('Error');
        setTimeout(() => setAnalysisResult(null), 3000);
      },
    });
  };

  const currentMode = scheduler?.mode || health?.scheduler_mode || 'AUTO';
  const isSchedulerRunning = scheduler?.is_running ?? health?.scheduler_running ?? false;
  const marketStatus = scheduler?.market_status || health?.market_status || 'CLOSED';
  const ibkrConnected = health?.ibkr_connected ?? false;
  const apiOnline = !healthLoading && health?.status === 'healthy';

  const NavItem = ({ item }: { item: NavItemConfig }) => {
    const Icon = Icons[item.icon];
    const isActive = activePanel === item.id;

    return (
      <button
        onClick={() => setActivePanel(item.id)}
        className={clsx('nav-item', isActive && 'active')}
        title={sidebarCollapsed ? item.label : undefined}
      >
        <Icon width={20} height={20} />
        <span className={clsx(
          'transition-opacity duration-200',
          sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'
        )}>
          {item.label}
        </span>
      </button>
    );
  };

  const StatusDot = ({ connected, label }: { connected: boolean; label: string }) => (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      <div className="flex items-center gap-2">
        <div className={clsx(
          'w-2 h-2 rounded-full',
          connected ? 'bg-[var(--color-profit)]' : 'bg-[var(--color-loss)]'
        )} />
        <span className={clsx(
          'text-xs font-medium',
          connected ? 'text-[var(--color-profit)]' : 'text-[var(--color-loss)]'
        )}>
          {connected ? 'Online' : 'Offline'}
        </span>
      </div>
    </div>
  );

  return (
    <aside className={clsx('sidebar', sidebarCollapsed && 'collapsed')}>
      {/* Branding */}
      <div className="sidebar-header">
        <div className={clsx(
          'transition-opacity duration-200',
          sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'
        )}>
          <span className="font-display font-semibold text-base tracking-tight text-[var(--color-text-primary)]">
            xAI Trading
          </span>
          <span className="text-xs text-[var(--color-text-muted)] block">
            by Nolan CACHEUX
          </span>
        </div>
      </div>

      {/* Status Section */}
      {!sidebarCollapsed && (
        <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
          <div className="text-label mb-2">STATUS</div>
          <div className="space-y-1">
            <StatusDot connected={ibkrConnected} label="IBKR" />
            <StatusDot connected={apiOnline} label="API" />
            <StatusDot connected={isSchedulerRunning} label="Scheduler" />
          </div>
          <div className="flex items-center justify-between py-1 mt-1">
            <span className="text-xs text-[var(--color-text-muted)]">Market</span>
            <span className={clsx(
              'text-xs font-medium px-2 py-0.5 rounded',
              marketStatus === 'OPEN' ? 'bg-[var(--color-profit)]/20 text-[var(--color-profit)]' :
              marketStatus === 'PRE_MARKET' ? 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]' :
              marketStatus === 'AFTER_HOURS' ? 'bg-[var(--color-warning)]/20 text-[var(--color-warning)]' :
              'bg-[var(--color-text-muted)]/20 text-[var(--color-text-muted)]'
            )}>
              {marketStatus.replace('_', ' ')}
            </span>
          </div>
        </div>
      )}

      {/* Trading Controls */}
      {!sidebarCollapsed && (
        <div className="px-4 py-3 border-b border-[var(--color-border-subtle)]">
          <div className="text-label mb-2">TRADING</div>

          {/* Auto Trading Toggle */}
          <div className="mb-3">
            <button
              onClick={() => handleModeChange(currentMode === 'AUTO' ? 'MANUAL' : 'AUTO')}
              disabled={setModeMutation.isPending}
              className={clsx(
                'w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all',
                currentMode === 'AUTO'
                  ? 'bg-[var(--color-profit)]/15 border border-[var(--color-profit)]/30'
                  : 'bg-[var(--color-bg-tertiary)] border border-[var(--color-border-subtle)]'
              )}
            >
              <span className={clsx(
                'text-sm font-medium',
                currentMode === 'AUTO' ? 'text-[var(--color-profit)]' : 'text-[var(--color-text-secondary)]'
              )}>
                Auto Trading
              </span>
              <div className={clsx(
                'w-10 h-5 rounded-full transition-all relative',
                currentMode === 'AUTO' ? 'bg-[var(--color-profit)]' : 'bg-[var(--color-bg-secondary)]'
              )}>
                <div className={clsx(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                  currentMode === 'AUTO' ? 'left-5' : 'left-0.5'
                )} />
              </div>
            </button>
          </div>

          {/* Trigger Analysis Button */}
          <button
            onClick={handleTriggerAnalysis}
            disabled={triggerMutation.isPending || marketStatus !== 'OPEN'}
            title={marketStatus !== 'OPEN' ? 'Analysis only available during market hours' : undefined}
            className={clsx(
              'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all',
              marketStatus !== 'OPEN'
                ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] cursor-not-allowed'
                : triggerMutation.isPending
                  ? 'bg-[var(--color-bg-tertiary)] text-[var(--color-text-muted)] cursor-wait'
                  : 'bg-[var(--color-accent-primary)]/10 text-[var(--color-accent-primary)] hover:bg-[var(--color-accent-primary)]/20'
            )}
          >
            {triggerMutation.isPending ? (
              <>
                <Icons.Loader width={16} height={16} className="animate-spin" />
                Analyzing...
              </>
            ) : marketStatus !== 'OPEN' ? (
              <>
                <Icons.Neural width={16} height={16} />
                Market Closed
              </>
            ) : (
              <>
                <Icons.Neural width={16} height={16} />
                Trigger Analysis
              </>
            )}
          </button>

          {/* Analysis Result */}
          {analysisResult && (
            <div className={clsx(
              'mt-2 px-3 py-2 rounded-lg text-xs font-medium text-center',
              analysisResult === 'Error'
                ? 'bg-[var(--color-loss)]/10 text-[var(--color-loss)]'
                : 'bg-[var(--color-profit)]/10 text-[var(--color-profit)]'
            )}>
              {analysisResult}
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {/* Main Navigation */}
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </div>

        <div className="nav-divider" />

        {/* System */}
        <div className="space-y-1">
          {systemNavItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[var(--color-border-subtle)]">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          {theme === 'dark' ? (
            <Icons.Moon width={18} height={18} className="text-[var(--color-text-muted)]" />
          ) : (
            <Icons.Sun width={18} height={18} className="text-[var(--color-text-muted)]" />
          )}
          <span className={clsx(
            'text-sm text-[var(--color-text-secondary)] transition-opacity duration-200',
            sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'
          )}>
            {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
          </span>
        </button>

        {/* Collapse Toggle */}
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center justify-center gap-3 px-3 py-2 mt-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
        >
          <Icons.ChevronLeft
            width={18}
            height={18}
            className={clsx(
              'text-[var(--color-text-muted)] transition-transform duration-300',
              sidebarCollapsed && 'rotate-180'
            )}
          />
          <span className={clsx(
            'text-sm text-[var(--color-text-secondary)] transition-opacity duration-200',
            sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'
          )}>
            Collapse
          </span>
        </button>
      </div>
    </aside>
  );
}
