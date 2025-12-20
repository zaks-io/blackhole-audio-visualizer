import { useRef, useState, useCallback, useEffect } from "react";
import gsap from "gsap";
import type { CameraMode } from "@/components/CameraSystem";
import type { CameraPresetItem } from "@/components/ProducerMode/types";

const DEFAULT_CAMERA_DURATION = 20;

interface CameraPlaylistState {
  isActive: boolean;
  currentIndex: number;
  currentMode: CameraMode | null;
}

const initialState: CameraPlaylistState = {
  isActive: false,
  currentIndex: -1,
  currentMode: null,
};

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Normalize camera presets to handle both old string format and new object format
function normalizePresets(presets: (CameraPresetItem | string)[] | undefined): CameraPresetItem[] {
  if (!presets) return [];
  return presets.map((p) => (typeof p === "string" ? { mode: p } : p));
}

export function useCameraPlaylist(
  cameraPresets: CameraPresetItem[] | undefined,
  shuffle: boolean,
  defaultDuration: number | undefined,
  setMode: (mode: CameraMode) => void
) {
  const [state, setState] = useState<CameraPlaylistState>(initialState);

  const playOrderRef = useRef<number[]>([]);
  const orderIndexRef = useRef(0);
  const isActiveRef = useRef(false);
  const timerRef = useRef<gsap.core.Tween | null>(null);
  const scheduleNextRef = useRef<((duration: number) => void) | null>(null);

  // Normalize presets to handle legacy string format
  const normalizedPresets = normalizePresets(
    cameraPresets as (CameraPresetItem | string)[] | undefined
  );
  const effectiveDuration = defaultDuration ?? DEFAULT_CAMERA_DURATION;

  const advanceToNext = useCallback(() => {
    if (!isActiveRef.current || normalizedPresets.length === 0) return;

    orderIndexRef.current++;

    if (orderIndexRef.current >= playOrderRef.current.length) {
      const indices = normalizedPresets.map((_, i) => i);
      playOrderRef.current = shuffle ? shuffleArray(indices) : indices;
      orderIndexRef.current = 0;
    }

    const nextIndex = playOrderRef.current[orderIndexRef.current];
    const nextPreset = normalizedPresets[nextIndex];
    const nextMode = nextPreset.mode as CameraMode;
    setMode(nextMode);

    setState((s) => ({
      ...s,
      currentIndex: nextIndex,
      currentMode: nextMode,
    }));

    const nextDuration = nextPreset.duration ?? effectiveDuration;
    scheduleNextRef.current?.(nextDuration);
  }, [normalizedPresets, shuffle, setMode, effectiveDuration]);

  const scheduleNextTransition = useCallback(
    (duration: number) => {
      if (timerRef.current) {
        timerRef.current.kill();
      }

      timerRef.current = gsap.delayedCall(duration, advanceToNext);
    },
    [advanceToNext]
  );

  // Keep ref updated
  useEffect(() => {
    scheduleNextRef.current = scheduleNextTransition;
  }, [scheduleNextTransition]);

  const start = useCallback(() => {
    if (normalizedPresets.length === 0) return;

    const indices = normalizedPresets.map((_, i) => i);
    playOrderRef.current = shuffle ? shuffleArray(indices) : indices;
    orderIndexRef.current = 0;
    isActiveRef.current = true;

    const firstIndex = playOrderRef.current[0];
    const firstPreset = normalizedPresets[firstIndex];
    const firstMode = firstPreset.mode as CameraMode;
    setMode(firstMode);

    setState({
      isActive: true,
      currentIndex: firstIndex,
      currentMode: firstMode,
    });

    const firstDuration = firstPreset.duration ?? effectiveDuration;
    scheduleNextTransition(firstDuration);
  }, [normalizedPresets, shuffle, setMode, effectiveDuration, scheduleNextTransition]);

  const stop = useCallback(() => {
    isActiveRef.current = false;
    if (timerRef.current) {
      timerRef.current.kill();
      timerRef.current = null;
    }
    setState(initialState);
  }, []);

  useEffect(() => {
    return () => {
      isActiveRef.current = false;
      if (timerRef.current) {
        timerRef.current.kill();
      }
    };
  }, []);

  return {
    state,
    start,
    stop,
  };
}
