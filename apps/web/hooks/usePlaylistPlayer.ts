import { useRef, useState, useCallback, useEffect } from "react";
import gsap from "gsap";
import { usePlayPreset } from "@/components/ProducerMode/usePlayPreset";
import { usePresetSelector } from "@/components/playlist/usePresetSelector";
import type {
  PlaylistWithPresets,
  ConvexPreset,
  PlaylistPlayerState,
  Preset,
} from "@/components/ProducerMode/types";

const initialState: PlaylistPlayerState = {
  isPlaying: false,
  isPaused: false,
  currentIndex: -1,
  status: "idle",
  waitProgress: 0,
};

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

export function usePlaylistPlayer(playlist: PlaylistWithPresets | null) {
  const { playPreset, stopAll } = usePlayPreset();

  const [state, setState] = useState<PlaylistPlayerState>(initialState);

  const playOrderRef = useRef<number[]>([]);
  const orderIndexRef = useRef(0);
  const waitTweenRef = useRef<gsap.core.Tween | null>(null);
  const isActiveRef = useRef(false);
  const playNextRef = useRef<() => void>(() => {});

  const getPresetAtIndex = useCallback(
    (itemIndex: number): ConvexPreset | null => {
      if (!playlist) return null;
      const item = playlist.items[itemIndex];
      if (!item) return null;
      return playlist.presets.find((p) => p?._id === item.presetId) ?? null;
    },
    [playlist]
  );

  const getWaitDuration = useCallback(
    (itemIndex: number): number => {
      if (!playlist) return 0;
      const item = playlist.items[itemIndex];
      if (!item) return 0;
      return item.waitDuration ?? playlist.defaultWaitDuration;
    },
    [playlist]
  );

  const cleanup = useCallback(() => {
    waitTweenRef.current?.kill();
    waitTweenRef.current = null;
    stopAll();
    isActiveRef.current = false;
  }, [stopAll]);

  useEffect(() => {
    playNextRef.current = () => {
      if (!playlist || !isActiveRef.current) return;

      if (orderIndexRef.current >= playOrderRef.current.length) {
        // Loop back to the beginning, reshuffle if enabled
        const indices = playlist.items.map((_, i) => i);
        playOrderRef.current = playlist.shuffle ? shuffleArray(indices) : indices;
        orderIndexRef.current = 0;
      }

      const itemIndex = playOrderRef.current[orderIndexRef.current];
      const preset = getPresetAtIndex(itemIndex);

      if (!preset) {
        orderIndexRef.current++;
        playNextRef.current();
        return;
      }

      setState((s) => ({
        ...s,
        currentIndex: itemIndex,
        status: "tweening",
        waitProgress: 0,
      }));

      playPreset(convexPresetToPreset(preset), () => {
        if (!isActiveRef.current) return;

        const waitDuration = getWaitDuration(itemIndex);

        if (waitDuration <= 0) {
          orderIndexRef.current++;
          playNextRef.current();
          return;
        }

        setState((s) => ({ ...s, status: "waiting", waitProgress: 0 }));

        const progressObj = { progress: 0 };
        waitTweenRef.current = gsap.to(progressObj, {
          progress: 1,
          duration: waitDuration,
          ease: "none",
          onUpdate: () => {
            setState((s) => ({ ...s, waitProgress: progressObj.progress }));
          },
          onComplete: () => {
            waitTweenRef.current = null;
            if (!isActiveRef.current) return;
            orderIndexRef.current++;
            playNextRef.current();
          },
        });
      });
    };
  }, [playlist, getPresetAtIndex, getWaitDuration, playPreset, cleanup]);

  const play = useCallback(() => {
    if (!playlist || playlist.items.length === 0) return;

    cleanup();

    const indices = playlist.items.map((_, i) => i);
    playOrderRef.current = playlist.shuffle ? shuffleArray(indices) : indices;
    orderIndexRef.current = 0;
    isActiveRef.current = true;

    setState({
      isPlaying: true,
      isPaused: false,
      currentIndex: -1,
      status: "idle",
      waitProgress: 0,
    });

    playNextRef.current();
  }, [playlist, cleanup]);

  const pause = useCallback(() => {
    if (!state.isPlaying || state.isPaused) return;
    waitTweenRef.current?.pause();
    setState((s) => ({ ...s, isPaused: true }));
  }, [state.isPlaying, state.isPaused]);

  const resume = useCallback(() => {
    if (!state.isPlaying || !state.isPaused) return;
    waitTweenRef.current?.resume();
    setState((s) => ({ ...s, isPaused: false }));
  }, [state.isPlaying, state.isPaused]);

  const stop = useCallback(() => {
    cleanup();
    setState(initialState);
  }, [cleanup]);

  const skip = useCallback(() => {
    if (!state.isPlaying) return;
    waitTweenRef.current?.kill();
    waitTweenRef.current = null;
    stopAll();
    orderIndexRef.current++;
    playNextRef.current();
  }, [state.isPlaying, stopAll]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const shouldStop = usePresetSelector((s) => s.shouldStop);
  const clearTriggerStop = usePresetSelector((s) => s.clearTriggerStop);

  useEffect(() => {
    if (!shouldStop) return;
    clearTriggerStop();
    if (state.isPlaying) {
      queueMicrotask(() => stop());
    }
  }, [shouldStop, state.isPlaying, stop, clearTriggerStop]);

  const currentPreset = state.currentIndex >= 0 ? getPresetAtIndex(state.currentIndex) : null;

  return {
    state,
    play,
    pause,
    resume,
    stop,
    skip,
    currentPreset,
  };
}
