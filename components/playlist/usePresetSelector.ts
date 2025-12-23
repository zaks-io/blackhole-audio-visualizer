import { create } from "zustand";
import { persist } from "zustand/middleware";

type SelectionMode = "none" | "preset" | "feeling-lucky";

interface PresetSelectorState {
  mode: SelectionMode;
  selectedPresetId: string | null;
  isLuckyPlaying: boolean;

  setMode: (mode: SelectionMode) => void;
  setSelectedPresetId: (id: string | null) => void;
  setLuckyPlaying: (playing: boolean) => void;

  shouldPlay: boolean;
  triggerPlay: () => void;
  clearTriggerPlay: () => void;
  shouldStop: boolean;
  triggerStop: () => void;
  clearTriggerStop: () => void;
}

export const usePresetSelector = create<PresetSelectorState>()(
  persist(
    (set) => ({
      mode: "feeling-lucky",
      selectedPresetId: null,
      isLuckyPlaying: false,

      setMode: (mode) => set({ mode }),
      setSelectedPresetId: (id) => set({ selectedPresetId: id }),
      setLuckyPlaying: (playing) => set({ isLuckyPlaying: playing }),

      shouldPlay: false,
      triggerPlay: () => set({ shouldPlay: true }),
      clearTriggerPlay: () => set({ shouldPlay: false }),
      shouldStop: false,
      triggerStop: () => set({ shouldStop: true }),
      clearTriggerStop: () => set({ shouldStop: false }),
    }),
    {
      name: "preset-selector",
      partialize: (state) => ({
        mode: state.mode,
        selectedPresetId: state.selectedPresetId,
      }),
    }
  )
);
