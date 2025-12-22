"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { usePlayPreset } from "@/components/ProducerMode/usePlayPreset";
import type { SceneWithDetails, CompositionPlan } from "./useConvexScenes";
import type { ConvexPreset, Preset } from "@/components/ProducerMode/types";

export interface ScenePlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  currentSectionIndex: number;
  currentTime: number;
  duration: number;
  status: "idle" | "playing" | "paused" | "ended";
}

const initialState: ScenePlayerState = {
  isPlaying: false,
  isPaused: false,
  currentSectionIndex: -1,
  currentTime: 0,
  duration: 0,
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

export function useScenePlayer(scene: SceneWithDetails | null) {
  const { playPreset, stopAll } = usePlayPreset();
  const [state, setState] = useState<ScenePlayerState>(initialState);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const currentSectionRef = useRef(-1);
  const updateLoopRef = useRef<() => void>(() => {});

  // Calculate section timings from composition plan
  const getSectionTimings = useCallback((compositionPlan: CompositionPlan) => {
    let currentTime = 0;
    return compositionPlan.sections.map((section, index) => {
      const timing = {
        index,
        name: section.section_name,
        startTimeMs: currentTime,
        endTimeMs: currentTime + section.duration_ms,
      };
      currentTime += section.duration_ms;
      return timing;
    });
  }, []);

  // Get preset for a given section index
  const getPresetForSection = useCallback(
    (sectionIndex: number): ConvexPreset | null => {
      if (!scene?.playlist) return null;
      const item = scene.playlist.items[sectionIndex];
      if (!item) return null;
      const preset = scene.playlist.presets.find((p) => p?._id === item.presetId);
      if (!preset) return null;
      // Cast DB preset to ConvexPreset type (ease is stored as string in DB)
      return preset as unknown as ConvexPreset;
    },
    [scene]
  );

  // Update the updateLoop ref in an effect to avoid accessing ref during render
  useEffect(() => {
    updateLoopRef.current = () => {
      if (!audioRef.current || !scene || !scene.compositionPlan) return;

      const currentTimeMs = audioRef.current.currentTime * 1000;
      const sectionTimings = getSectionTimings(scene.compositionPlan);

      // Find current section
      const currentSection = sectionTimings.find(
        (s) => currentTimeMs >= s.startTimeMs && currentTimeMs < s.endTimeMs
      );

      const sectionIndex = currentSection?.index ?? -1;

      // If section changed, play the new preset
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

      animationFrameRef.current = requestAnimationFrame(updateLoopRef.current);
    };
  }, [scene, getSectionTimings, getPresetForSection, playPreset]);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    stopAll();
    currentSectionRef.current = -1;
  }, [stopAll]);

  const play = useCallback(() => {
    if (!scene?.audioUrl) return;

    cleanup();

    // Create or reuse audio element
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    audioRef.current.src = scene.audioUrl;
    audioRef.current.currentTime = 0;

    const handleEnded = () => {
      cleanup();
      setState({
        ...initialState,
        duration: scene.audioDurationMs / 1000,
        status: "ended",
      });
    };

    const handleLoadedMetadata = () => {
      setState((s) => ({
        ...s,
        duration: audioRef.current?.duration ?? scene.audioDurationMs / 1000,
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
        duration: scene.audioDurationMs / 1000,
        status: "playing",
      });

      // Start update loop
      animationFrameRef.current = requestAnimationFrame(updateLoopRef.current);

      // Play first section immediately
      const preset = getPresetForSection(0);
      if (preset) {
        currentSectionRef.current = 0;
        playPreset(convexPresetToPreset(preset));
        setState((s) => ({ ...s, currentSectionIndex: 0 }));
      }
    });

    return () => {
      audioRef.current?.removeEventListener("ended", handleEnded);
      audioRef.current?.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [scene, cleanup, getPresetForSection, playPreset]);

  const pause = useCallback(() => {
    if (!state.isPlaying || state.isPaused) return;

    audioRef.current?.pause();

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

    audioRef.current?.play();
    animationFrameRef.current = requestAnimationFrame(updateLoopRef.current);

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
    (time: number) => {
      if (!audioRef.current || !scene || !scene.compositionPlan) return;

      audioRef.current.currentTime = time;
      const currentTimeMs = time * 1000;
      const sectionTimings = getSectionTimings(scene.compositionPlan);

      // Find and play the correct section for the new time
      const currentSection = sectionTimings.find(
        (s) => currentTimeMs >= s.startTimeMs && currentTimeMs < s.endTimeMs
      );

      if (currentSection && currentSection.index !== currentSectionRef.current) {
        currentSectionRef.current = currentSection.index;
        const preset = getPresetForSection(currentSection.index);
        if (preset) {
          playPreset(convexPresetToPreset(preset));
        }
        setState((s) => ({
          ...s,
          currentSectionIndex: currentSection.index,
          currentTime: time,
        }));
      }
    },
    [scene, getSectionTimings, getPresetForSection, playPreset]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // Current section info
  const currentSection =
    state.currentSectionIndex >= 0 && scene?.compositionPlan
      ? scene.compositionPlan.sections[state.currentSectionIndex]
      : null;

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
    currentSection,
    currentPreset,
    getAudioElement,
  };
}
