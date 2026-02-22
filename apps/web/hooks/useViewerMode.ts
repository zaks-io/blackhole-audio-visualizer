"use client";

import { create } from "zustand";

export type ViewerMode = "live" | "scene";

interface ViewerModeState {
  mode: ViewerMode;
  sceneId: string | null;
  navigatingToSceneId: string | null;
  setMode: (mode: ViewerMode, sceneId?: string | null) => void;
  setLiveMode: () => void;
  setSceneMode: (sceneId: string) => void;
  setNavigating: (sceneId: string | null) => void;
}

export const useViewerMode = create<ViewerModeState>((set) => ({
  mode: "live",
  sceneId: null,
  navigatingToSceneId: null,
  setMode: (mode, sceneId = null) => set({ mode, sceneId, navigatingToSceneId: null }),
  setLiveMode: () => set({ mode: "live", sceneId: null, navigatingToSceneId: null }),
  setSceneMode: (sceneId) => set({ mode: "scene", sceneId, navigatingToSceneId: null }),
  setNavigating: (sceneId) => set({ navigatingToSceneId: sceneId }),
}));
