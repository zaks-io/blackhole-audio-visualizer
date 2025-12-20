import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  debugPanelsVisible: boolean;
  fpsVisible: boolean;
  devControlsVisible: boolean;
  bassStrobeEnabled: boolean;
  controlBarCollapsed: boolean;
  toggleDebugPanels: () => void;
  toggleFPS: () => void;
  toggleDevControls: () => void;
  setDevControlsVisible: (visible: boolean) => void;
  toggleBassStrobe: () => void;
  toggleControlBar: () => void;
  setControlBarCollapsed: (collapsed: boolean) => void;
}

export const useUIState = create<UIState>()(
  persist(
    (set) => ({
      debugPanelsVisible: false,
      fpsVisible: false,
      devControlsVisible: false,
      bassStrobeEnabled: false,
      controlBarCollapsed: false,
      toggleDebugPanels: () => set((state) => ({ debugPanelsVisible: !state.debugPanelsVisible })),
      toggleFPS: () => set((state) => ({ fpsVisible: !state.fpsVisible })),
      toggleDevControls: () => set((state) => ({ devControlsVisible: !state.devControlsVisible })),
      setDevControlsVisible: (visible) => set({ devControlsVisible: visible }),
      toggleBassStrobe: () => set((state) => ({ bassStrobeEnabled: !state.bassStrobeEnabled })),
      toggleControlBar: () => set((state) => ({ controlBarCollapsed: !state.controlBarCollapsed })),
      setControlBarCollapsed: (collapsed) => set({ controlBarCollapsed: collapsed }),
    }),
    {
      name: "ui-state",
    }
  )
);
