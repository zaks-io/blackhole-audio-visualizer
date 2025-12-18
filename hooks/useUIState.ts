import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  sidebarOpen: boolean;
  debugPanelsVisible: boolean;
  tweenPanelVisible: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleDebugPanels: () => void;
  toggleTweenPanel: () => void;
}

export const useUIState = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      debugPanelsVisible: false,
      tweenPanelVisible: false,
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleDebugPanels: () => set((state) => ({ debugPanelsVisible: !state.debugPanelsVisible })),
      toggleTweenPanel: () => set((state) => ({ tweenPanelVisible: !state.tweenPanelVisible })),
    }),
    {
      name: "ui-state",
    }
  )
);
