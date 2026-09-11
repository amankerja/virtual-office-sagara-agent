import { create } from 'zustand'

const SIDEBAR_STORAGE_KEY = 'sagara-sidebar-collapsed'
const VIEW_MODE_STORAGE_KEY = 'sagara-agent-view-mode'
const OFFICE_VIEW_MODE_STORAGE_KEY = 'sagara-office-view-mode'
const OFFICE_ZOOM_STORAGE_KEY = 'sagara-office-zoom'

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

  officeViewMode: 'office' | 'list';
  setOfficeViewMode: (mode: 'office' | 'list') => void;

  officeZoom: number;
  setOfficeZoom: (zoom: number) => void;
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

const getInitialOfficeViewModeState = (): 'office' | 'list' => {
  if (typeof window === 'undefined') return 'office'
  try {
    const stored = localStorage.getItem(OFFICE_VIEW_MODE_STORAGE_KEY)
    if (stored === 'office' || stored === 'list') return stored
  } catch {
    // ignore
  }
  return 'office'
}

const getInitialOfficeZoom = (): number => {
  if (typeof window === 'undefined') return 1
  try {
    const stored = localStorage.getItem(OFFICE_ZOOM_STORAGE_KEY)
    if (stored) {
      const parsed = parseFloat(stored)
      if (!isNaN(parsed) && parsed >= 0.5 && parsed <= 2) return parsed
    }
  } catch {
    // ignore
  }
  return 1
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

  officeViewMode: getInitialOfficeViewModeState(),
  setOfficeViewMode: (mode) => {
    try {
      localStorage.setItem(OFFICE_VIEW_MODE_STORAGE_KEY, mode)
    } catch {
      // ignore
    }
    set({ officeViewMode: mode })
  },

  officeZoom: getInitialOfficeZoom(),
  setOfficeZoom: (zoom) => {
    try {
      localStorage.setItem(OFFICE_ZOOM_STORAGE_KEY, String(zoom))
    } catch {
      // ignore
    }
    set({ officeZoom: zoom })
  },
}))
