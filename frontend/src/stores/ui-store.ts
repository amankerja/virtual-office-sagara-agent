import { create } from 'zustand'

const SIDEBAR_STORAGE_KEY = 'sagara-sidebar-collapsed'

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
}

const getInitialSidebarState = (): boolean => {
  if (typeof window === 'undefined') return false
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
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
}))
