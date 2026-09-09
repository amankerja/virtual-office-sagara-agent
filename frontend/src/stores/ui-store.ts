import { create } from 'zustand'

const SIDEBAR_STORAGE_KEY = 'sagara-sidebar-collapsed'
const VIEW_MODE_STORAGE_KEY = 'sagara-agent-view-mode'

interface UIState {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;

  isMobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  selectedProfileId: string | null;
  setSelectedProfileId: (id: string | null) => void;

  agentViewMode: 'grid' | 'list';
  setAgentViewMode: (mode: 'grid' | 'list') => void;
}

const getInitialSidebarState = (): boolean => {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

const getInitialViewModeState = (): 'grid' | 'list' => {
  if (typeof window === 'undefined') return 'grid'
  try {
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY)
    if (stored === 'list' || stored === 'grid') return stored
  } catch {
    // ignore
  }
  return 'grid'
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: getInitialSidebarState(),
  toggleSidebar: () =>
    set((state) => {
      const nextState = !state.isSidebarCollapsed
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(nextState))
      } catch {
        // ignore
      }
      return { isSidebarCollapsed: nextState }
    }),
  setSidebarCollapsed: (collapsed) => {
    try {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(collapsed))
    } catch {
      // ignore
    }
    set({ isSidebarCollapsed: collapsed })
  },

  isMobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  selectedProfileId: null,
  setSelectedProfileId: (id) => set({ selectedProfileId: id }),

  agentViewMode: getInitialViewModeState(),
  setAgentViewMode: (mode) => {
    try {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode)
    } catch {
      // ignore
    }
    set({ agentViewMode: mode })
  },
}))
