import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarOpen: boolean;
  debugPanelsVisible: boolean;
  fpsVisible: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDebugPanels: () => void;
  toggleFPS: () => void;
}

export const useUIState = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      debugPanelsVisible: false,
      fpsVisible: false,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleDebugPanels: () => set((state) => ({ debugPanelsVisible: !state.debugPanelsVisible })),
      toggleFPS: () => set((state) => ({ fpsVisible: !state.fpsVisible })),
    }),
    {
      name: "ui-state",
    }
  )
);
