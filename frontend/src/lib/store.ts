'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light';
export type ActivePanel = 'dashboard' | 'positions' | 'transactions' | 'neural' | 'chat' | 'reflections' | 'settings';

interface AppState {
  theme: ThemeMode;
  activePanel: ActivePanel;
  sidebarCollapsed: boolean;
  rightPanelOpen: boolean;
  rightPanelTab: 'neural' | 'chat' | 'reflections';
  chartMode: 'dollar' | 'percent';
  chartTimeRange: '1H' | '24H' | '7D' | 'ALL';
  isPlaying: boolean;
  playbackSpeed: number;

  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setActivePanel: (panel: ActivePanel) => void;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  setRightPanelTab: (tab: 'neural' | 'chat' | 'reflections') => void;
  setChartMode: (mode: 'dollar' | 'percent') => void;
  setChartTimeRange: (range: '1H' | '24H' | '7D' | 'ALL') => void;
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      theme: 'dark',
      activePanel: 'dashboard',
      sidebarCollapsed: false,
      rightPanelOpen: true,
      rightPanelTab: 'neural',
      chartMode: 'dollar',
      chartTimeRange: 'ALL',
      isPlaying: false,
      playbackSpeed: 1,

      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setActivePanel: (panel) => set({ activePanel: panel }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      toggleRightPanel: () => set((state) => ({ rightPanelOpen: !state.rightPanelOpen })),
      setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
      setChartMode: (mode) => set({ chartMode: mode }),
      setChartTimeRange: (range) => set({ chartTimeRange: range }),
      togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),
      setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
    }),
    {
      name: 'grok-trading-storage',
      partialize: (state) => ({ theme: state.theme, sidebarCollapsed: state.sidebarCollapsed }),
    }
  )
);
