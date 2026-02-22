"use client";

import { create } from "zustand";

export type ViewerMode = "live" | "scene";

interface ViewerModeState {
  mode: ViewerMode;
  sceneId: string | null;
  setMode: (mode: ViewerMode, sceneId?: string | null) => void;
  setLiveMode: () => void;
  setSceneMode: (sceneId: string) => void;
}

export const useViewerMode = create<ViewerModeState>((set) => ({
  mode: "live",
  sceneId: null,
  setMode: (mode, sceneId = null) => set({ mode, sceneId }),
  setLiveMode: () => set({ mode: "live", sceneId: null }),
  setSceneMode: (sceneId) => set({ mode: "scene", sceneId }),
}));
