import { create } from 'zustand'

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

export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),

  isMobileSidebarOpen: false,
  setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  selectedProfileId: null,
  setSelectedProfileId: (id) => set({ selectedProfileId: id }),
}))
