"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SceneControlsState {
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
  isSceneAgentOpen: boolean;
  openSceneAgent: () => void;
  closeSceneAgent: () => void;
  toggleSceneAgent: () => void;
  chatThreadId: string | null;
  setChatThreadId: (id: string | null) => void;
  isCreatingScene: boolean;
  setIsCreatingScene: (value: boolean) => void;
}

export const useSceneControls = create<SceneControlsState>()(
  persist(
    (set) => ({
      selectedSceneId: null,
      setSelectedSceneId: (id) => set({ selectedSceneId: id }),
      isSceneAgentOpen: false,
      openSceneAgent: () => set({ isSceneAgentOpen: true }),
      closeSceneAgent: () => set({ isSceneAgentOpen: false }),
      toggleSceneAgent: () => set((s) => ({ isSceneAgentOpen: !s.isSceneAgentOpen })),
      chatThreadId: null,
      setChatThreadId: (id) => set({ chatThreadId: id }),
      isCreatingScene: false,
      setIsCreatingScene: (value) => set({ isCreatingScene: value }),
    }),
    {
      name: "scene-controls",
      partialize: (state) => ({ isSceneAgentOpen: state.isSceneAgentOpen }),
    }
  )
);
