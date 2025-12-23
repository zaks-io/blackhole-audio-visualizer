import { useRef, useCallback, useEffect, useState } from "react";
import gsap from "gsap";
import { usePlayPreset } from "@/components/ProducerMode/usePlayPreset";
import { useCameraMode } from "@/components/CameraSystem";
import { usePresetSelector } from "@/components/playlist/usePresetSelector";
import type { ConvexPreset, Preset } from "@/components/ProducerMode/types";
import type { CameraMode } from "@/components/CameraSystem";

const CAMERA_MODES: Exclude<CameraMode, "free">[] = ["circle", "closeup", "orbit", "edge"];
const CYCLE_DURATION = 10;

export interface FeelingLuckyState {
  isPlaying: boolean;
  isPaused: boolean;
  cycleKey: number;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function convexPresetToPreset(preset: ConvexPreset): Preset {
  return {
    id: preset._id,
    name: preset.name,
    colorPalette: preset.colorPalette,
    parameters: preset.parameters,
  };
}

export function useFeelingLucky(allPresets: ConvexPreset[]) {
  const { playPreset, stopAll } = usePlayPreset();
  const { setMode: setCameraMode } = useCameraMode();

  const mode = usePresetSelector((s) => s.mode);
  const isLuckyPlaying = usePresetSelector((s) => s.isLuckyPlaying);
  const setLuckyPlaying = usePresetSelector((s) => s.setLuckyPlaying);
  const shouldPlay = usePresetSelector((s) => s.shouldPlay);
  const clearTriggerPlay = usePresetSelector((s) => s.clearTriggerPlay);
  const shouldStop = usePresetSelector((s) => s.shouldStop);
  const clearTriggerStop = usePresetSelector((s) => s.clearTriggerStop);

  const timerRef = useRef<gsap.core.Tween | null>(null);
  const isActiveRef = useRef(false);
  const playNextRef = useRef<() => void>(() => {});

  // Shuffle state
  const presetOrderRef = useRef<number[]>([]);
  const presetIndexRef = useRef(0);
  const cameraOrderRef = useRef<number[]>([]);
  const cameraIndexRef = useRef(0);

  const [state, setState] = useState<FeelingLuckyState>({
    isPlaying: false,
    isPaused: false,
    cycleKey: 0,
  });

  useEffect(() => {
    playNextRef.current = () => {
      if (!isActiveRef.current || allPresets.length === 0) return;

      // Kill any existing timer
      timerRef.current?.kill();

      // Shuffle presets if needed (first run or reached end)
      if (
        presetOrderRef.current.length === 0 ||
        presetIndexRef.current >= presetOrderRef.current.length
      ) {
        const indices = allPresets.map((_, i) => i);
        presetOrderRef.current = shuffleArray(indices);
        presetIndexRef.current = 0;
      }

      // Shuffle cameras if needed
      if (
        cameraOrderRef.current.length === 0 ||
        cameraIndexRef.current >= cameraOrderRef.current.length
      ) {
        const indices = CAMERA_MODES.map((_, i) => i);
        cameraOrderRef.current = shuffleArray(indices);
        cameraIndexRef.current = 0;
      }

      // Get next preset and camera from shuffled order
      const presetIdx = presetOrderRef.current[presetIndexRef.current];
      const nextPreset = allPresets[presetIdx];
      presetIndexRef.current++;

      const cameraIdx = cameraOrderRef.current[cameraIndexRef.current];
      const nextCamera = CAMERA_MODES[cameraIdx];
      cameraIndexRef.current++;

      setCameraMode(nextCamera);

      // Play the preset
      playPreset(convexPresetToPreset(nextPreset));

      // Increment cycleKey to reset CSS animation
      setState((s) => ({ ...s, cycleKey: s.cycleKey + 1 }));

      // Start timer for next cycle
      const timerObj = { progress: 0 };
      timerRef.current = gsap.to(timerObj, {
        progress: 1,
        duration: CYCLE_DURATION,
        ease: "none",
        onComplete: () => {
          timerRef.current = null;
          if (isActiveRef.current) {
            playNextRef.current();
          }
        },
      });
    };
  }, [allPresets, playPreset, setCameraMode]);

  const start = useCallback(() => {
    if (allPresets.length === 0) return;

    isActiveRef.current = true;
    setLuckyPlaying(true);
    setState((s) => ({ isPlaying: true, isPaused: false, cycleKey: s.cycleKey + 1 }));
    playNextRef.current();
  }, [allPresets.length, setLuckyPlaying]);

  const stop = useCallback(() => {
    isActiveRef.current = false;
    timerRef.current?.kill();
    timerRef.current = null;
    stopAll();
    setLuckyPlaying(false);
    // Reset shuffle state
    presetOrderRef.current = [];
    presetIndexRef.current = 0;
    cameraOrderRef.current = [];
    cameraIndexRef.current = 0;
    setState((s) => ({ isPlaying: false, isPaused: false, cycleKey: s.cycleKey }));
  }, [stopAll, setLuckyPlaying]);

  const pause = useCallback(() => {
    if (!isLuckyPlaying || state.isPaused) return;
    timerRef.current?.pause();
    setState((s) => ({ ...s, isPaused: true }));
  }, [isLuckyPlaying, state.isPaused]);

  const resume = useCallback(() => {
    if (!isLuckyPlaying || !state.isPaused) return;
    timerRef.current?.resume();
    setState((s) => ({ ...s, isPaused: false }));
  }, [isLuckyPlaying, state.isPaused]);

  const skip = useCallback(() => {
    if (!isLuckyPlaying) return;
    timerRef.current?.kill();
    timerRef.current = null;
    setState((s) => ({ ...s, isPaused: false }));
    playNextRef.current();
  }, [isLuckyPlaying]);

  useEffect(() => {
    if (shouldPlay && mode === "feeling-lucky" && !isLuckyPlaying) {
      queueMicrotask(() => start());
      clearTriggerPlay();
    } else if (shouldPlay && mode !== "feeling-lucky") {
      clearTriggerPlay();
    }
  }, [shouldPlay, mode, isLuckyPlaying, start, clearTriggerPlay]);

  useEffect(() => {
    if (shouldStop && isLuckyPlaying) {
      queueMicrotask(() => stop());
      clearTriggerStop();
    } else if (shouldStop) {
      clearTriggerStop();
    }
  }, [shouldStop, isLuckyPlaying, stop, clearTriggerStop]);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  useEffect(() => {
    if (mode !== "feeling-lucky" && isLuckyPlaying) {
      queueMicrotask(() => stop());
    }
  }, [mode, isLuckyPlaying, stop]);

  return {
    start,
    stop,
    pause,
    resume,
    skip,
    state,
  };
}
