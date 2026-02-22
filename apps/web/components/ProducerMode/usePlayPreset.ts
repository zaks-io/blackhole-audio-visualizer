import { useRef, useCallback, useEffect } from "react";
import gsap from "gsap";
import { useVisualizationControls, setSkipNextSync } from "@/hooks/useVisualizationControls";
import { callGPUSetter } from "@/lib/gpuSetterRegistry";
import { setRuntimeValue } from "@/lib/runtimeStateRegistry";
import { usePresets } from "./usePresets";
import type { Preset } from "./types";
import { PALETTE_OFFSETS, type ColorPaletteId } from "@/components/ColorModeSystem";
import { PARAMS } from "@blackhole/backend/convex/lib/visualizationParameters";

interface TweenRef {
  path: string;
  tween: gsap.core.Tween;
  state: { value: number; progress: number };
}

// Debug timing flag: add ?timingDebug to URL to see performance marks
const getTimingDebug = () =>
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("timingDebug");

export function usePlayPreset() {
  const vizStore = useVisualizationControls;
  const activePresetId = usePresets((s) => s.activePresetId);
  const presets = usePresets((s) => s.presets);

  const tweensRef = useRef<TweenRef[]>([]);
  const isPlayingRef = useRef(false);
  const onCompleteRef = useRef<(() => void) | null>(null);
  const completedParamsRef = useRef<Array<{ path: string; value: number }>>([]);

  const activePreset = presets.find((p) => p.id === activePresetId) ?? null;

  const stopAll = useCallback(() => {
    for (const ref of tweensRef.current) {
      ref.tween.kill();
    }
    tweensRef.current = [];
    completedParamsRef.current = [];
    isPlayingRef.current = false;
    onCompleteRef.current = null;
  }, []);

  const playPreset = useCallback(
    (preset: Preset, onComplete?: () => void) => {
      const timing = getTimingDebug();
      if (timing) performance.mark("playPreset-start");

      stopAll();
      isPlayingRef.current = true;
      onCompleteRef.current = onComplete ?? null;

      // Update colorPalette via runtimeState - NO React re-renders
      // This bypasses Zustand entirely during playback
      const paletteOffset = PALETTE_OFFSETS[preset.colorPalette as ColorPaletteId];
      setRuntimeValue("colorPaletteOffset", paletteOffset);

      for (const param of preset.parameters) {
        // Skip system parameters - they should not be tweened by presets
        const paramDef = PARAMS[param.path];
        if (paramDef?.system) continue;

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
            // Collect completed param for batch update
            completedParamsRef.current.push({ path: param.path, value: state.value });
            tweensRef.current = tweensRef.current.filter((t) => t.path !== param.path);

            // All tweens complete - now sync store for UI consistency
            if (tweensRef.current.length === 0) {
              const timing = getTimingDebug();
              if (timing) performance.mark("tweens-complete-start");

              // Sync final values to store (single batch update)
              // Skip syncFromStore since runtime state is already correct from callGPUSetter
              if (timing) performance.mark("batchSetByPath-start");
              setSkipNextSync(true);
              vizStore.getState().batchSetByPath(completedParamsRef.current);
              setSkipNextSync(true);
              // Also sync colorPalette since we skipped it during playback
              vizStore.getState().set("colorPalette", preset.colorPalette as ColorPaletteId);
              if (timing) {
                performance.mark("batchSetByPath-end");
                performance.measure("batchSetByPath", "batchSetByPath-start", "batchSetByPath-end");
              }

              completedParamsRef.current = [];
              isPlayingRef.current = false;

              if (timing) {
                performance.mark("tweens-complete-end");
                performance.measure(
                  "tweens-complete",
                  "tweens-complete-start",
                  "tweens-complete-end"
                );
                // Log all measures
                const measures = performance.getEntriesByType("measure");
                console.log(
                  "[TIMING]",
                  measures.map((m) => `${m.name}: ${m.duration.toFixed(2)}ms`)
                );
                performance.clearMarks();
                performance.clearMeasures();
              }

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
