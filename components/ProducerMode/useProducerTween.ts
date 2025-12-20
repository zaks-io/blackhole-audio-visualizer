import { useRef, useCallback, useEffect } from "react";
import gsap from "gsap";
import { useVisualizationControls, pathToKey } from "@/hooks/useVisualizationControls";
import { useProducerMode } from "./useProducerMode";
import { DEFAULT_DURATION, DEFAULT_EASE } from "./producerConfig";
import type { ParameterConfig, EaseFunction } from "./types";

export function useProducerTween(config: ParameterConfig) {
  const vizStore = useVisualizationControls;
  const producerStore = useProducerMode;
  const stateKey = pathToKey[config.path];
  const currentValue = useVisualizationControls((s) => s[stateKey]) as number;
  const {
    tweenStates,
    initParameter,
    setTargetValue,
    setDuration,
    setEase,
    setIsTweening,
    setProgress,
    resetTween,
  } = useProducerMode();

  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const tweenState = useRef({ value: 0, progress: 0 });

  const paramState = tweenStates[config.path];

  useEffect(() => {
    initParameter(config.path, currentValue);
  }, [config.path, initParameter, currentValue]);

  const handleTargetChange = useCallback(
    (value: number) => {
      setTargetValue(config.path, value);
    },
    [config.path, setTargetValue]
  );

  const handleDurationChange = useCallback(
    (duration: number) => {
      setDuration(config.path, duration);
    },
    [config.path, setDuration]
  );

  const handleEaseChange = useCallback(
    (ease: EaseFunction) => {
      setEase(config.path, ease);
    },
    [config.path, setEase]
  );

  const startTween = useCallback(
    (overrideTarget?: number) => {
      // Read fresh state directly from stores to avoid stale closures
      const freshParamState = producerStore.getState().tweenStates[config.path];
      if (freshParamState?.isTweening) return;

      const startValue = vizStore.getState().getByPath(config.path) as number;
      const duration = freshParamState?.duration ?? DEFAULT_DURATION;
      const ease = freshParamState?.ease ?? DEFAULT_EASE;
      const targetValue = overrideTarget ?? freshParamState?.targetValue ?? startValue;

      // Don't start tween if no meaningful change
      if (Math.abs(targetValue - startValue) < config.step) return;

      // Sync target value to store
      setTargetValue(config.path, targetValue);

      if (tweenRef.current) {
        tweenRef.current.kill();
      }

      tweenState.current = { value: startValue, progress: 0 };
      setIsTweening(config.path, true);
      setProgress(config.path, 0);

      tweenRef.current = gsap.to(tweenState.current, {
        value: targetValue,
        progress: 1,
        duration,
        ease,
        onUpdate: () => {
          vizStore.getState().setByPath(config.path, tweenState.current.value);
        },
        onComplete: () => {
          setIsTweening(config.path, false);
          setProgress(config.path, 0);
          resetTween(config.path, targetValue);
          tweenRef.current = null;
        },
      });
    },
    [
      config.path,
      config.step,
      vizStore,
      producerStore,
      setTargetValue,
      setIsTweening,
      setProgress,
      resetTween,
    ]
  );

  const killTween = useCallback(() => {
    if (tweenRef.current) {
      tweenRef.current.kill();
      tweenRef.current = null;
      setIsTweening(config.path, false);
      setProgress(config.path, 0);
    }
  }, [config.path, setIsTweening, setProgress]);

  const cancelTween = useCallback(() => {
    if (tweenRef.current) {
      tweenRef.current.kill();
      tweenRef.current = null;
      const currentVal = vizStore.getState().getByPath(config.path) as number;
      resetTween(config.path, currentVal);
    }
  }, [config.path, vizStore, resetTween]);

  useEffect(() => {
    return () => {
      if (tweenRef.current) {
        tweenRef.current.kill();
      }
    };
  }, []);

  return {
    currentValue,
    targetValue: paramState?.targetValue ?? currentValue,
    duration: paramState?.duration ?? 5,
    ease: paramState?.ease ?? "power2.inOut",
    isTweening: paramState?.isTweening ?? false,
    progress: paramState?.progress ?? 0,
    setTargetValue: handleTargetChange,
    setDuration: handleDurationChange,
    setEase: handleEaseChange,
    startTween,
    killTween,
    cancelTween,
  };
}
