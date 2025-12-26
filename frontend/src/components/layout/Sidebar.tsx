'use client';

import { useAppStore, type ActivePanel } from '@/lib/store';
import { Icons } from '@/components/ui/Icons';
import clsx from 'clsx';

interface NavItemConfig {
  id: ActivePanel;
  label: string;
  icon: keyof typeof Icons;
}

const mainNavItems: NavItemConfig[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'Dashboard' },
  { id: 'analytics', label: 'Analytics', icon: 'Analytics' },
  { id: 'positions', label: 'Positions', icon: 'Positions' },
  { id: 'transactions', label: 'Transactions', icon: 'Transactions' },
];

const agentNavItems: NavItemConfig[] = [
  { id: 'neural', label: 'Neural Log', icon: 'Neural' },
  { id: 'chat', label: 'Chat History', icon: 'Chat' },
  { id: 'reflections', label: 'Reflections', icon: 'Reflections' },
];

export function Sidebar() {
  const { activePanel, setActivePanel, sidebarCollapsed, toggleSidebar, theme, toggleTheme } = useAppStore();

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

  return (
    <aside className={clsx('sidebar', sidebarCollapsed && 'collapsed')}>
      {/* Logo */}
      <div className="sidebar-header">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center">
            <Icons.Grok width={20} height={20} className="text-white" />
          </div>
          <span className={clsx(
            'font-display font-semibold text-base tracking-tight transition-opacity duration-200',
            sidebarCollapsed ? 'opacity-0 w-0' : 'opacity-100'
          )}>
            Grok Trading
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {/* Main Navigation */}
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </div>

        <div className="nav-divider" />

        {/* Agent Section */}
        <div className={clsx(
          'text-label px-3 py-2 transition-opacity duration-200',
          sidebarCollapsed ? 'opacity-0' : 'opacity-100'
        )}>
          Agent Activity
        </div>
        <div className="space-y-1">
          {agentNavItems.map((item) => (
            <NavItem key={item.id} item={item} />
          ))}
        </div>

        <div className="nav-divider" />

        {/* Settings */}
        <NavItem item={{ id: 'settings', label: 'Settings', icon: 'Settings' }} />
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
