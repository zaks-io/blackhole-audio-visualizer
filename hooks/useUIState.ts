import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Resolution = "auto" | "4k" | "1080" | "720" | "480";

interface UIState {
  debugPanelsVisible: boolean;
  fpsVisible: boolean;
  devControlsVisible: boolean;
  bassStrobeEnabled: boolean;
  controlBarCollapsed: boolean;
  resolution: Resolution;
  toggleDebugPanels: () => void;
  toggleFPS: () => void;
  toggleDevControls: () => void;
  setDevControlsVisible: (visible: boolean) => void;
  toggleBassStrobe: () => void;
  toggleControlBar: () => void;
  setControlBarCollapsed: (collapsed: boolean) => void;
  setResolution: (resolution: Resolution) => void;
}

export const useUIState = create<UIState>()(
  persist(
    (set) => ({
      debugPanelsVisible: false,
      fpsVisible: false,
      devControlsVisible: false,
      bassStrobeEnabled: false,
      controlBarCollapsed: false,
      resolution: "auto",
      toggleDebugPanels: () => set((state) => ({ debugPanelsVisible: !state.debugPanelsVisible })),
      toggleFPS: () => set((state) => ({ fpsVisible: !state.fpsVisible })),
      toggleDevControls: () => set((state) => ({ devControlsVisible: !state.devControlsVisible })),
      setDevControlsVisible: (visible) => set({ devControlsVisible: visible }),
      toggleBassStrobe: () => set((state) => ({ bassStrobeEnabled: !state.bassStrobeEnabled })),
      toggleControlBar: () => set((state) => ({ controlBarCollapsed: !state.controlBarCollapsed })),
      setControlBarCollapsed: (collapsed) => set({ controlBarCollapsed: collapsed }),
      setResolution: (resolution) => set({ resolution }),
    }),
    {
      name: "ui-state",
    }
  )
);
