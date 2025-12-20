import { useRef, useCallback, useEffect } from "react";
import gsap from "gsap";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import { useProducerMode } from "./useProducerMode";
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
  const { setTargetValue, setDuration, setEase, setIsTweening, setProgress, resetTween } =
    useProducerMode();
  const activePresetId = usePresets((s) => s.activePresetId);
  const presets = usePresets((s) => s.presets);

  const tweensRef = useRef<TweenRef[]>([]);
  const isPlayingRef = useRef(false);

  const activePreset = presets.find((p) => p.id === activePresetId) ?? null;

  const stopAll = useCallback(() => {
    for (const ref of tweensRef.current) {
      ref.tween.kill();
      const currentVal = vizStore.getState().getByPath(ref.path) as number;
      resetTween(ref.path, currentVal);
    }
    tweensRef.current = [];
    isPlayingRef.current = false;
  }, [vizStore, resetTween]);

  const playPreset = useCallback(
    (preset: Preset) => {
      stopAll();
      isPlayingRef.current = true;

      vizStore.getState().set("colorPalette", preset.colorPalette as ColorPaletteId);

      for (const param of preset.parameters) {
        const startValue = vizStore.getState().getByPath(param.path) as number;

        // Skip if value is already at target
        if (Math.abs(param.value - startValue) < 0.001) continue;

        setTargetValue(param.path, param.value);
        setDuration(param.path, param.duration);
        setEase(param.path, param.ease);
        setIsTweening(param.path, true);
        setProgress(param.path, 0);

        const state = { value: startValue, progress: 0 };

        const tween = gsap.to(state, {
          value: param.value,
          progress: 1,
          duration: param.duration,
          ease: param.ease,
          onUpdate: () => {
            vizStore.getState().setByPath(param.path, state.value);
          },
          onComplete: () => {
            setIsTweening(param.path, false);
            setProgress(param.path, 0);
            resetTween(param.path, param.value);
            tweensRef.current = tweensRef.current.filter((t) => t.path !== param.path);
            if (tweensRef.current.length === 0) {
              isPlayingRef.current = false;
            }
          },
        });

        tweensRef.current.push({ path: param.path, tween, state });
      }
    },
    [
      vizStore,
      stopAll,
      setTargetValue,
      setDuration,
      setEase,
      setIsTweening,
      setProgress,
      resetTween,
    ]
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
