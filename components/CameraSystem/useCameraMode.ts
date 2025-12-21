"use client";

import { useRef, useCallback } from "react";
import { create } from "zustand";
import type { CameraMode } from "./types";

interface CameraModeState {
  mode: CameraMode;
  isTransitioning: boolean;
  setMode: (mode: CameraMode) => void;
  setTransitioning: (isTransitioning: boolean) => void;
}

const useCameraModeStore = create<CameraModeState>((set, get) => ({
  mode: "circle",
  isTransitioning: false,
  setMode: (newMode) => {
    const { mode, isTransitioning } = get();
    if (newMode === mode || isTransitioning) return;
    set({ mode: newMode, isTransitioning: true });
  },
  setTransitioning: (isTransitioning) => set({ isTransitioning }),
}));

export function useCameraMode() {
  const mode = useCameraModeStore((s) => s.mode);
  const isTransitioning = useCameraModeStore((s) => s.isTransitioning);
  const setModeStore = useCameraModeStore((s) => s.setMode);
  const setTransitioning = useCameraModeStore((s) => s.setTransitioning);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const setMode = useCallback(
    (newMode: CameraMode) => {
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
      setModeStore(newMode);
    },
    [setModeStore]
  );

  const onTransitionComplete = useCallback(() => {
    setTransitioning(false);
  }, [setTransitioning]);

  return {
    mode,
    setMode,
    isTransitioning,
    timelineRef,
    onTransitionComplete,
  };
}
