"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SceneControlsState {
  selectedSceneId: string | null;
  setSelectedSceneId: (id: string | null) => void;
  isSceneEditorOpen: boolean;
  openSceneEditor: () => void;
  closeSceneEditor: () => void;
  toggleSceneEditor: () => void;
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
      isSceneEditorOpen: false,
      openSceneEditor: () => set({ isSceneEditorOpen: true }),
      closeSceneEditor: () => set({ isSceneEditorOpen: false }),
      toggleSceneEditor: () => set((s) => ({ isSceneEditorOpen: !s.isSceneEditorOpen })),
      chatThreadId: null,
      setChatThreadId: (id) => set({ chatThreadId: id }),
      isCreatingScene: false,
      setIsCreatingScene: (value) => set({ isCreatingScene: value }),
    }),
    {
      name: "scene-controls",
      partialize: (state) => ({ isSceneEditorOpen: state.isSceneEditorOpen }),
    }
  )
);
