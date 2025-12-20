import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  debugPanelsVisible: boolean;
  fpsVisible: boolean;
  devControlsVisible: boolean;
  bassStrobeEnabled: boolean;
  toggleDebugPanels: () => void;
  toggleFPS: () => void;
  toggleDevControls: () => void;
  toggleBassStrobe: () => void;
}

export const useUIState = create<UIState>()(
  persist(
    (set) => ({
      debugPanelsVisible: false,
      fpsVisible: false,
      devControlsVisible: false,
      bassStrobeEnabled: false,
      toggleDebugPanels: () => set((state) => ({ debugPanelsVisible: !state.debugPanelsVisible })),
      toggleFPS: () => set((state) => ({ fpsVisible: !state.fpsVisible })),
      toggleDevControls: () => set((state) => ({ devControlsVisible: !state.devControlsVisible })),
      toggleBassStrobe: () => set((state) => ({ bassStrobeEnabled: !state.bassStrobeEnabled })),
    }),
    {
      name: "ui-state",
    }
  )
);
