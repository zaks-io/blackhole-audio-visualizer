"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import gsap from "gsap";
import { usePlayPreset } from "@/components/ProducerMode/usePlayPreset";
import type { PlaylistWithPresets, ConvexPreset, Preset } from "@/components/ProducerMode/types";

export interface SectionTiming {
  index: number;
  name?: string;
  startTimeMs: number;
  endTimeMs: number;
  presetId: string;
}

export interface UnifiedPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  currentTime: number;
  duration: number;
  currentSectionIndex: number;
  status: "idle" | "playing" | "paused" | "ended";
}

export interface UnifiedPlayerConfig {
  playlist: PlaylistWithPresets | null;
  audioUrl?: string | null;
  loop?: boolean;
}

const initialState: UnifiedPlayerState = {
  isPlaying: false,
  isPaused: false,
  currentTime: 0,
  duration: 0,
  currentSectionIndex: -1,
  status: "idle",
};

function convexPresetToPreset(preset: ConvexPreset): Preset {
  return {
    id: preset._id,
    name: preset.name,
    colorPalette: preset.colorPalette,
    parameters: preset.parameters,
  };
}

function createQuickPreset(preset: Preset, duration: number): Preset {
  return {
    ...preset,
    parameters: preset.parameters.map((param) => ({
      ...param,
      duration,
    })),
  };
}

export function useUnifiedPlayer(config: UnifiedPlayerConfig) {
  const { playlist, audioUrl, loop = false } = config;
  const { playPreset, stopAll } = usePlayPreset();
  const [state, setState] = useState<UnifiedPlayerState>(initialState);
  const [loopEnabled, setLoopEnabled] = useState(loop);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentSectionRef = useRef(-1);
  const progressTweenRef = useRef<gsap.core.Tween | null>(null);
  const updateLoopAudioRef = useRef<() => void>(() => {});
  const updateLoopTimedRef = useRef<() => void>(() => {});
  const loopEnabledRef = useRef(loopEnabled);

  const sectionTimings = useMemo((): SectionTiming[] => {
    if (!playlist) return [];

    let currentTime = 0;
    return playlist.items.map((item, index) => {
      const duration = (item.waitDuration ?? playlist.defaultWaitDuration) * 1000;
      const timing: SectionTiming = {
        index,
        startTimeMs: currentTime,
        endTimeMs: currentTime + duration,
        presetId: item.presetId,
      };
      currentTime += duration;
      return timing;
    });
  }, [playlist]);

  const totalDurationMs = useMemo(() => {
    if (sectionTimings.length === 0) return 0;
    return sectionTimings[sectionTimings.length - 1].endTimeMs;
  }, [sectionTimings]);

  // Preload audio element when URL is available
  useEffect(() => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    audioRef.current.crossOrigin = "anonymous";
    audioRef.current.preload = "auto";
    audioRef.current.src = audioUrl;

    const handleLoadedMetadata = () => {
      setState((s) => ({
        ...s,
        duration: audioRef.current?.duration ?? totalDurationMs / 1000,
      }));
    };

    audioRef.current.addEventListener("loadedmetadata", handleLoadedMetadata);
    audioRef.current.load();

    return () => {
      audioRef.current?.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [audioUrl, totalDurationMs]);

  const getPresetForSection = useCallback(
    (sectionIndex: number): ConvexPreset | null => {
      if (!playlist) return null;
      const item = playlist.items[sectionIndex];
      if (!item) return null;
      const preset = playlist.presets.find((p) => p._id === item.presetId);
      if (!preset) return null;
      return preset as unknown as ConvexPreset;
    },
    [playlist]
  );

  const findSectionAtTime = useCallback(
    (timeMs: number): SectionTiming | null => {
      return sectionTimings.find((s) => timeMs >= s.startTimeMs && timeMs < s.endTimeMs) ?? null;
    },
    [sectionTimings]
  );

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (progressTweenRef.current) {
      progressTweenRef.current.kill();
      progressTweenRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    stopAll();
    currentSectionRef.current = -1;
  }, [stopAll]);

  useEffect(() => {
    updateLoopAudioRef.current = () => {
      if (!audioRef.current) return;

      const currentTimeMs = audioRef.current.currentTime * 1000;
      const section = findSectionAtTime(currentTimeMs);
      const sectionIndex = section?.index ?? -1;

      if (sectionIndex !== currentSectionRef.current && sectionIndex >= 0) {
        currentSectionRef.current = sectionIndex;
        const preset = getPresetForSection(sectionIndex);
        if (preset) {
          playPreset(convexPresetToPreset(preset));
        }
        setState((s) => ({
          ...s,
          currentSectionIndex: sectionIndex,
          currentTime: audioRef.current?.currentTime ?? 0,
        }));
      } else {
        setState((s) => ({
          ...s,
          currentTime: audioRef.current?.currentTime ?? 0,
        }));
      }

      animationFrameRef.current = requestAnimationFrame(updateLoopAudioRef.current);
    };
  }, [findSectionAtTime, getPresetForSection, playPreset]);

  useEffect(() => {
    updateLoopTimedRef.current = () => {
      if (!progressTweenRef.current) return;

      const progress = progressTweenRef.current.progress();
      const currentTimeMs = progress * totalDurationMs;
      const section = findSectionAtTime(currentTimeMs);
      const sectionIndex = section?.index ?? -1;

      if (sectionIndex !== currentSectionRef.current && sectionIndex >= 0) {
        currentSectionRef.current = sectionIndex;
        const preset = getPresetForSection(sectionIndex);
        if (preset) {
          playPreset(convexPresetToPreset(preset));
        }
      }

      setState((s) => ({
        ...s,
        currentSectionIndex: sectionIndex,
        currentTime: currentTimeMs / 1000,
      }));

      animationFrameRef.current = requestAnimationFrame(updateLoopTimedRef.current);
    };
  }, [findSectionAtTime, getPresetForSection, playPreset, totalDurationMs]);

  const play = useCallback(() => {
    if (!playlist || playlist.items.length === 0) return;

    cleanup();
    loopEnabledRef.current = loopEnabled;

    if (audioUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      audioRef.current.crossOrigin = "anonymous";
      audioRef.current.src = audioUrl;
      audioRef.current.currentTime = 0;
      audioRef.current.loop = false; // Handle looping manually for proper state reset

      const handleEnded = () => {
        if (loopEnabledRef.current) {
          // Manual loop: reset to beginning and continue playing
          if (audioRef.current) {
            audioRef.current.currentTime = 0;
            currentSectionRef.current = -1; // Force section re-detection
            setState((s) => ({
              ...s,
              currentTime: 0,
              currentSectionIndex: -1,
            }));
            audioRef.current.play().catch(() => {
              // If autoplay blocked, just update state
            });
          }
          return;
        }
        cleanup();
        setState({
          ...initialState,
          duration: totalDurationMs / 1000,
          status: "ended",
        });
      };

      const handleLoadedMetadata = () => {
        setState((s) => ({
          ...s,
          duration: audioRef.current?.duration ?? totalDurationMs / 1000,
        }));
      };

      audioRef.current.addEventListener("ended", handleEnded);
      audioRef.current.addEventListener("loadedmetadata", handleLoadedMetadata);

      audioRef.current.play().then(() => {
        setState({
          isPlaying: true,
          isPaused: false,
          currentSectionIndex: -1,
          currentTime: 0,
          duration: totalDurationMs / 1000,
          status: "playing",
        });

        animationFrameRef.current = requestAnimationFrame(updateLoopAudioRef.current);

        const preset = getPresetForSection(0);
        if (preset) {
          currentSectionRef.current = 0;
          playPreset(convexPresetToPreset(preset));
          setState((s) => ({ ...s, currentSectionIndex: 0 }));
        }
      });
    } else {
      const progressObj = { progress: 0 };
      progressTweenRef.current = gsap.to(progressObj, {
        progress: 1,
        duration: totalDurationMs / 1000,
        ease: "none",
        repeat: loopEnabled ? -1 : 0,
        onComplete: () => {
          if (!loopEnabled) {
            cleanup();
            setState({
              ...initialState,
              duration: totalDurationMs / 1000,
              status: "ended",
            });
          }
        },
      });

      setState({
        isPlaying: true,
        isPaused: false,
        currentSectionIndex: -1,
        currentTime: 0,
        duration: totalDurationMs / 1000,
        status: "playing",
      });

      animationFrameRef.current = requestAnimationFrame(updateLoopTimedRef.current);

      const preset = getPresetForSection(0);
      if (preset) {
        currentSectionRef.current = 0;
        playPreset(convexPresetToPreset(preset));
        setState((s) => ({ ...s, currentSectionIndex: 0 }));
      }
    }
  }, [playlist, audioUrl, loopEnabled, cleanup, totalDurationMs, getPresetForSection, playPreset]);

  const pause = useCallback(() => {
    if (!state.isPlaying || state.isPaused) return;

    if (audioRef.current) {
      audioRef.current.pause();
    }
    if (progressTweenRef.current) {
      progressTweenRef.current.pause();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    setState((s) => ({
      ...s,
      isPaused: true,
      status: "paused",
    }));
  }, [state.isPlaying, state.isPaused]);

  const resume = useCallback(() => {
    if (!state.isPlaying || !state.isPaused) return;

    if (audioRef.current) {
      audioRef.current.play();
      animationFrameRef.current = requestAnimationFrame(updateLoopAudioRef.current);
    } else if (progressTweenRef.current) {
      progressTweenRef.current.resume();
      animationFrameRef.current = requestAnimationFrame(updateLoopTimedRef.current);
    }

    setState((s) => ({
      ...s,
      isPaused: false,
      status: "playing",
    }));
  }, [state.isPlaying, state.isPaused]);

  const stop = useCallback(() => {
    cleanup();
    setState(initialState);
  }, [cleanup]);

  const seek = useCallback(
    (timeSeconds: number) => {
      const timeMs = timeSeconds * 1000;
      const clampedTimeMs = Math.max(0, Math.min(timeMs, totalDurationMs));
      const clampedTimeSeconds = clampedTimeMs / 1000;

      if (audioRef.current) {
        audioRef.current.currentTime = clampedTimeSeconds;
      } else if (progressTweenRef.current) {
        const progress = clampedTimeMs / totalDurationMs;
        progressTweenRef.current.progress(progress);
      }

      const section = findSectionAtTime(clampedTimeMs);

      if (section && section.index !== currentSectionRef.current) {
        currentSectionRef.current = section.index;
        const preset = getPresetForSection(section.index);
        if (preset) {
          const quickPreset = createQuickPreset(convexPresetToPreset(preset), 0.3);
          playPreset(quickPreset);
        }
        setState((s) => ({
          ...s,
          currentSectionIndex: section.index,
          currentTime: clampedTimeSeconds,
        }));
      } else {
        setState((s) => ({
          ...s,
          currentTime: clampedTimeSeconds,
        }));
      }
    },
    [totalDurationMs, findSectionAtTime, getPresetForSection, playPreset]
  );

  const setLoop = useCallback((enabled: boolean) => {
    setLoopEnabled(enabled);
    loopEnabledRef.current = enabled;
    // Note: audio looping is handled manually in the ended handler
    if (progressTweenRef.current) {
      progressTweenRef.current.repeat(enabled ? -1 : 0);
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const currentSection =
    state.currentSectionIndex >= 0 ? sectionTimings[state.currentSectionIndex] : null;

  const currentPreset =
    state.currentSectionIndex >= 0 ? getPresetForSection(state.currentSectionIndex) : null;

  const getAudioElement = useCallback(() => audioRef.current, []);

  return {
    state,
    play,
    pause,
    resume,
    stop,
    seek,
    setLoop,
    loopEnabled,
    sectionTimings,
    totalDurationMs,
    currentSection,
    currentPreset,
    getAudioElement,
  };
}
