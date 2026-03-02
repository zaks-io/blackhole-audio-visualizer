import { useRef, useCallback, useEffect, useMemo, useState } from "react";
import gsap from "gsap";
import { useQuery } from "convex/react";
import { api } from "@blackhole/backend/convex/_generated/api";
import type { Id } from "@blackhole/backend/convex/_generated/dataModel";
import { usePlayPreset } from "@/components/ProducerMode/usePlayPreset";
import { useCameraMode } from "@/components/CameraSystem";
import { usePresetSelector } from "@/components/playlist/usePresetSelector";
import type { ConvexPreset, Preset } from "@/components/ProducerMode/types";
import type { CameraMode } from "@/components/CameraSystem";

const CAMERA_MODES: Exclude<CameraMode, "free" | "edge">[] = ["circle", "closeup", "orbit"];
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

  const presetIds = useMemo(() => allPresets.map((p) => p._id as Id<"presets">), [allPresets]);
  const presetMap = useMemo(() => {
    const map = new Map<string, ConvexPreset>();
    for (const p of allPresets) map.set(p._id, p);
    return map;
  }, [allPresets]);

  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 2147483647));

  const shuffledIds = useQuery(
    api.model.presetVotes.public.getShuffledPresetsForLucky,
    presetIds.length > 0 ? { presetIds, seed } : "skip"
  );

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

  const presetIndexRef = useRef(0);
  const cameraOrderRef = useRef<number[]>([]);
  const cameraIndexRef = useRef(0);
  const pendingAdvanceRef = useRef(false);

  const [state, setState] = useState<FeelingLuckyState>({
    isPlaying: false,
    isPaused: false,
    cycleKey: 0,
  });

  useEffect(() => {
    playNextRef.current = () => {
      if (!isActiveRef.current || !shuffledIds || shuffledIds.length === 0) return;

      timerRef.current?.kill();

      // When we've exhausted the list, bump seed to get a fresh shuffle
      if (presetIndexRef.current >= shuffledIds.length) {
        presetIndexRef.current = 0;
        pendingAdvanceRef.current = true;
        setSeed((s) => (s + 1) % 2147483647);
        return;
      }

      // Shuffle cameras if needed
      if (
        cameraOrderRef.current.length === 0 ||
        cameraIndexRef.current >= cameraOrderRef.current.length
      ) {
        cameraOrderRef.current = shuffleArray(CAMERA_MODES.map((_, i) => i));
        cameraIndexRef.current = 0;
      }

      const nextId = shuffledIds[presetIndexRef.current];
      const nextPreset = presetMap.get(String(nextId));
      presetIndexRef.current++;

      if (!nextPreset) {
        queueMicrotask(() => playNextRef.current());
        return;
      }

      const cameraIdx = cameraOrderRef.current[cameraIndexRef.current];
      const nextCamera = CAMERA_MODES[cameraIdx];
      cameraIndexRef.current++;

      setCameraMode(nextCamera);
      playPreset(convexPresetToPreset(nextPreset));
      usePresetSelector.getState().setActivePresetId(nextPreset._id);

      setState((s) => ({ ...s, cycleKey: s.cycleKey + 1 }));

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
  }, [shuffledIds, presetMap, playPreset, setCameraMode]);

  // Resume playback after a seed bump delivers a fresh shuffled list
  useEffect(() => {
    if (pendingAdvanceRef.current && isActiveRef.current && shuffledIds && shuffledIds.length > 0) {
      pendingAdvanceRef.current = false;
      playNextRef.current();
    }
  }, [shuffledIds]);

  const start = useCallback(() => {
    if (!shuffledIds || shuffledIds.length === 0) return;

    presetIndexRef.current = 0;
    cameraOrderRef.current = [];
    cameraIndexRef.current = 0;
    isActiveRef.current = true;
    setLuckyPlaying(true);
    setState((s) => ({ isPlaying: true, isPaused: false, cycleKey: s.cycleKey + 1 }));
    playNextRef.current();
  }, [shuffledIds, setLuckyPlaying]);

  const stop = useCallback(() => {
    isActiveRef.current = false;
    pendingAdvanceRef.current = false;
    timerRef.current?.kill();
    timerRef.current = null;
    stopAll();
    setLuckyPlaying(false);
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
