import { useRef, useCallback, useEffect } from "react";
import gsap from "gsap";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import { callGPUSetter } from "@/lib/gpuSetterRegistry";
import { usePresets } from "./usePresets";
import type { Preset } from "./types";
import type { ColorPaletteId } from "@/components/ColorModeSystem";

interface TweenRef {
  path: string;
  tween: gsap.core.Tween;
  state: { value: number; progress: number };
}

export function usePlayPreset() {
  const vizStore = useVisualizationControls;
  const activePresetId = usePresets((s) => s.activePresetId);
  const presets = usePresets((s) => s.presets);

  const tweensRef = useRef<TweenRef[]>([]);
  const isPlayingRef = useRef(false);
  const onCompleteRef = useRef<(() => void) | null>(null);

  const activePreset = presets.find((p) => p.id === activePresetId) ?? null;

  const stopAll = useCallback(() => {
    for (const ref of tweensRef.current) {
      ref.tween.kill();
    }
    tweensRef.current = [];
    isPlayingRef.current = false;
    onCompleteRef.current = null;
  }, []);

  const playPreset = useCallback(
    (preset: Preset, onComplete?: () => void) => {
      stopAll();
      isPlayingRef.current = true;
      onCompleteRef.current = onComplete ?? null;

      vizStore.getState().set("colorPalette", preset.colorPalette as ColorPaletteId);

      for (const param of preset.parameters) {
        const startValue = vizStore.getState().getByPath(param.path) as number;

        // Skip if value is already at target
        if (Math.abs(param.value - startValue) < 0.001) continue;

        // No Zustand updates during playback - callGPUSetter handles animation
        // State is synced via batchEndTweens on completion

        const state = { value: startValue, progress: 0 };

        // Push to ref array BEFORE creating tween to handle synchronous onComplete (duration=0)
        const ref: TweenRef = { path: param.path, tween: null! as gsap.core.Tween, state };
        tweensRef.current.push(ref);

        // Handle durations stored as milliseconds (legacy/AI-generated) vs seconds
        // If duration > 100, assume it's milliseconds and convert to seconds
        const durationInSeconds = param.duration > 100 ? param.duration / 1000 : param.duration;
        const tween = gsap.to(state, {
          value: param.value,
          progress: 1,
          duration: durationInSeconds,
          ease: param.ease,
          onUpdate: () => {
            // Direct GPU update - bypasses React state for performance
            callGPUSetter(param.path, state.value);
          },
          onComplete: () => {
            // Sync final value to visualization store
            vizStore.getState().setByPath(param.path, state.value);
            tweensRef.current = tweensRef.current.filter((t) => t.path !== param.path);

            // All tweens complete - batch update producer mode state
            if (tweensRef.current.length === 0) {
              isPlayingRef.current = false;
              if (onCompleteRef.current) {
                queueMicrotask(() => {
                  if (onCompleteRef.current) {
                    onCompleteRef.current();
                    onCompleteRef.current = null;
                  }
                });
              }
            }
          },
        });

        ref.tween = tween;
      }

      // If no tweens were started (e.g. all values matched), trigger completion immediately
      if (tweensRef.current.length === 0) {
        isPlayingRef.current = false;
        if (onCompleteRef.current) {
          // Use queueMicrotask to avoid synchronous callback issues
          queueMicrotask(() => {
            if (onCompleteRef.current) {
              onCompleteRef.current();
              onCompleteRef.current = null;
            }
          });
        }
      }
    },
    [vizStore, stopAll]
  );

  const playActive = useCallback(() => {
    if (activePreset) {
      playPreset(activePreset);
    }
  }, [activePreset, playPreset]);

  useEffect(() => {
    return () => {
      stopAll();
    };
  }, [stopAll]);

  return {
    activePreset,
    playPreset,
    playActive,
    stopAll,
    isPlaying: () => isPlayingRef.current,
  };
}
