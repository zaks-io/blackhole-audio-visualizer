import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PlaylistControlsState {
  selectedPlaylistId: string | null;
  setSelectedPlaylistId: (id: string | null) => void;
  shouldPlay: boolean;
  triggerPlay: () => void;
  clearTriggerPlay: () => void;
  shouldStop: boolean;
  triggerStop: () => void;
  clearTriggerStop: () => void;
}

export const usePlaylistControls = create<PlaylistControlsState>()(
  persist(
    (set) => ({
      selectedPlaylistId: null,
      setSelectedPlaylistId: (id) => set({ selectedPlaylistId: id }),
      shouldPlay: false,
      triggerPlay: () => set({ shouldPlay: true }),
      clearTriggerPlay: () => set({ shouldPlay: false }),
      shouldStop: false,
      triggerStop: () => set({ shouldStop: true }),
      clearTriggerStop: () => set({ shouldStop: false }),
    }),
    {
      name: "playlist-controls",
      partialize: (state) => ({
        selectedPlaylistId: state.selectedPlaylistId,
      }),
    }
  )
);
