import { useState, useCallback, useRef } from "react";
import type { CameraMode } from "./types";

export function useCameraMode() {
  const [mode, setModeState] = useState<CameraMode>("circle");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);

  const setMode = useCallback(
    (newMode: CameraMode) => {
      if (newMode === mode || isTransitioning) return;

      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }

      setIsTransitioning(true);
      setModeState(newMode);
    },
    [mode, isTransitioning]
  );

  const onTransitionComplete = useCallback(() => {
    setIsTransitioning(false);
  }, []);

  return {
    mode,
    setMode,
    isTransitioning,
    timelineRef,
    onTransitionComplete,
  };
}
