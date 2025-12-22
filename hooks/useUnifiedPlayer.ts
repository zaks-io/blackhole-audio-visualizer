"use client";

import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import gsap from "gsap";
import { usePlayPreset } from "@/components/ProducerMode/usePlayPreset";
import { resumeAudioContext } from "./useAudioElementAnalyzer";
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
  duration: number;
  currentSectionIndex: number;
  status: "idle" | "playing" | "paused" | "ended";
}

export type TimeSubscriber = (currentTime: number, duration: number) => void;

export interface UnifiedPlayerConfig {
  playlist: PlaylistWithPresets | null;
  audioUrl?: string | null;
  loop?: boolean;
  onCameraModeChange?: (mode: string) => void;
}

const initialState: UnifiedPlayerState = {
  isPlaying: false,
  isPaused: false,
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
    cameraMode: preset.cameraMode,
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
  const { playlist, audioUrl, loop = false, onCameraModeChange } = config;
  const { playPreset, stopAll } = usePlayPreset();
  const [state, setState] = useState<UnifiedPlayerState>(initialState);
  const [loopEnabled, setLoopEnabled] = useState(loop);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentSectionRef = useRef(-1);
  const progressTweenRef = useRef<gsap.core.Tween | null>(null);
  const updateLoopAudioRef = useRef<() => void>(() => {});
  const updateLoopTimedRef = useRef<() => void>(() => {});
  const loopEnabledRef = useRef(loopEnabled);
  const currentTimeRef = useRef(0);
  const timeSubscribersRef = useRef<Set<TimeSubscriber>>(new Set());

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

  // Preload audio element when URL is available (don't connect analyzer yet)
  useEffect(() => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio();
      // Don't call setAudioElement here - wait until play() to connect analyzer
      // This ensures AudioContext is created during user gesture
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
      const preset = playlist.presets.find((p) => p?._id === item.presetId);
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
    currentTimeRef.current = 0;
  }, [stopAll]);

  useEffect(() => {
    updateLoopAudioRef.current = () => {
      if (!audioRef.current) return;

      const currentTime = audioRef.current.currentTime;
      const currentTimeMs = currentTime * 1000;
      const section = findSectionAtTime(currentTimeMs);
      const sectionIndex = section?.index ?? -1;

      // Update ref (no React re-render)
      currentTimeRef.current = currentTime;

      // Notify subscribers (they handle their own rendering)
      const duration = audioRef.current.duration || 0;
      timeSubscribersRef.current.forEach((subscriber) => subscriber(currentTime, duration));

      // Only update React state when section changes
      const sectionChanged = sectionIndex !== currentSectionRef.current && sectionIndex >= 0;

      if (sectionChanged) {
        currentSectionRef.current = sectionIndex;
        const preset = getPresetForSection(sectionIndex);
        if (preset) {
          const convertedPreset = convexPresetToPreset(preset);
          playPreset(convertedPreset);

          // Trigger camera mode change only if mode is different from previous
          if (onCameraModeChange && convertedPreset.cameraMode) {
            const previousPreset = sectionIndex > 0 ? getPresetForSection(sectionIndex - 1) : null;
            const previousCameraMode = previousPreset
              ? convexPresetToPreset(previousPreset).cameraMode
              : null;

            if (convertedPreset.cameraMode !== previousCameraMode) {
              onCameraModeChange(convertedPreset.cameraMode);
            }
          }
        }
        setState((s) => ({
          ...s,
          currentSectionIndex: sectionIndex,
        }));
      }

      animationFrameRef.current = requestAnimationFrame(updateLoopAudioRef.current);
    };
  }, [findSectionAtTime, getPresetForSection, playPreset, onCameraModeChange]);

  useEffect(() => {
    updateLoopTimedRef.current = () => {
      if (!progressTweenRef.current) return;

      const progress = progressTweenRef.current.progress();
      const currentTimeMs = progress * totalDurationMs;
      const currentTime = currentTimeMs / 1000;
      const section = findSectionAtTime(currentTimeMs);
      const sectionIndex = section?.index ?? -1;

      // Update ref (no React re-render)
      currentTimeRef.current = currentTime;

      // Notify subscribers (they handle their own rendering)
      const duration = totalDurationMs / 1000;
      timeSubscribersRef.current.forEach((subscriber) => subscriber(currentTime, duration));

      // Only update React state when section changes
      const sectionChanged = sectionIndex !== currentSectionRef.current && sectionIndex >= 0;

      if (sectionChanged) {
        currentSectionRef.current = sectionIndex;
        const preset = getPresetForSection(sectionIndex);
        if (preset) {
          const convertedPreset = convexPresetToPreset(preset);
          playPreset(convertedPreset);

          // Trigger camera mode change only if mode is different from previous
          if (onCameraModeChange && convertedPreset.cameraMode) {
            const previousPreset = sectionIndex > 0 ? getPresetForSection(sectionIndex - 1) : null;
            const previousCameraMode = previousPreset
              ? convexPresetToPreset(previousPreset).cameraMode
              : null;

            if (convertedPreset.cameraMode !== previousCameraMode) {
              onCameraModeChange(convertedPreset.cameraMode);
            }
          }
        }
        setState((s) => ({
          ...s,
          currentSectionIndex: sectionIndex,
        }));
      }

      animationFrameRef.current = requestAnimationFrame(updateLoopTimedRef.current);
    };
  }, [findSectionAtTime, getPresetForSection, playPreset, totalDurationMs, onCameraModeChange]);

  const play = useCallback(async () => {
    if (!playlist || playlist.items.length === 0) return;

    // Resume audio context during user gesture (must await to ensure it's ready)
    await resumeAudioContext();

    cleanup();
    loopEnabledRef.current = loopEnabled;

    if (audioUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }
      // Connect analyzer now (after AudioContext is resumed during user gesture)
      if (!audioElement) {
        setAudioElement(audioRef.current);
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
            currentTimeRef.current = 0;
            setState((s) => ({
              ...s,
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
        currentTimeRef.current = 0;
        setState({
          isPlaying: true,
          isPaused: false,
          currentSectionIndex: -1,
          duration: totalDurationMs / 1000,
          status: "playing",
        });

        animationFrameRef.current = requestAnimationFrame(updateLoopAudioRef.current);

        const preset = getPresetForSection(0);
        if (preset) {
          currentSectionRef.current = 0;
          const convertedPreset = convexPresetToPreset(preset);
          playPreset(convertedPreset);
          setState((s) => ({ ...s, currentSectionIndex: 0 }));

          // Trigger initial camera mode
          if (onCameraModeChange && convertedPreset.cameraMode) {
            onCameraModeChange(convertedPreset.cameraMode);
          }
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

      currentTimeRef.current = 0;
      setState({
        isPlaying: true,
        isPaused: false,
        currentSectionIndex: -1,
        duration: totalDurationMs / 1000,
        status: "playing",
      });

      animationFrameRef.current = requestAnimationFrame(updateLoopTimedRef.current);

      const preset = getPresetForSection(0);
      if (preset) {
        currentSectionRef.current = 0;
        const convertedPreset = convexPresetToPreset(preset);
        playPreset(convertedPreset);
        setState((s) => ({ ...s, currentSectionIndex: 0 }));

        // Trigger initial camera mode
        if (onCameraModeChange && convertedPreset.cameraMode) {
          onCameraModeChange(convertedPreset.cameraMode);
        }
      }
    }
  }, [
    playlist,
    audioUrl,
    audioElement,
    loopEnabled,
    cleanup,
    totalDurationMs,
    getPresetForSection,
    playPreset,
    onCameraModeChange,
  ]);

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

      // Update the time ref
      currentTimeRef.current = clampedTimeSeconds;

      if (audioRef.current) {
        audioRef.current.currentTime = clampedTimeSeconds;
      } else if (progressTweenRef.current) {
        const progress = clampedTimeMs / totalDurationMs;
        progressTweenRef.current.progress(progress);
      }

      // Notify subscribers of seek
      const duration = audioRef.current?.duration || totalDurationMs / 1000;
      timeSubscribersRef.current.forEach((subscriber) => subscriber(clampedTimeSeconds, duration));

      const section = findSectionAtTime(clampedTimeMs);

      if (section && section.index !== currentSectionRef.current) {
        const previousSectionIndex = currentSectionRef.current;
        currentSectionRef.current = section.index;
        const preset = getPresetForSection(section.index);
        if (preset) {
          const convertedPreset = convexPresetToPreset(preset);
          const quickPreset = createQuickPreset(convertedPreset, 0.3);
          playPreset(quickPreset);

          // Trigger camera mode change only if mode is different from previous
          if (onCameraModeChange && convertedPreset.cameraMode) {
            const previousPreset =
              previousSectionIndex >= 0 ? getPresetForSection(previousSectionIndex) : null;
            const previousCameraMode = previousPreset
              ? convexPresetToPreset(previousPreset).cameraMode
              : null;

            if (convertedPreset.cameraMode !== previousCameraMode) {
              onCameraModeChange(convertedPreset.cameraMode);
            }
          }
        }
        setState((s) => ({
          ...s,
          currentSectionIndex: section.index,
        }));
      }
    },
    [totalDurationMs, findSectionAtTime, getPresetForSection, playPreset, onCameraModeChange]
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

  const subscribeToTime = useCallback((callback: TimeSubscriber) => {
    timeSubscribersRef.current.add(callback);
    return () => {
      timeSubscribersRef.current.delete(callback);
    };
  }, []);

  const getCurrentTime = useCallback(() => currentTimeRef.current, []);

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
    audioElement,
    getAudioElement,
    subscribeToTime,
    getCurrentTime,
  };
}
