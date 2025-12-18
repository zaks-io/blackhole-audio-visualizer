import { useRef, useCallback, useEffect } from "react";
import gsap from "gsap";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import { useProducerMode } from "./useProducerMode";
import type { ParameterConfig, EaseFunction } from "./types";

export function useProducerTween(config: ParameterConfig) {
  const store = useVisualizationControls;
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

  const currentValue = store.getState().getByPath(config.path) as number;
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

  const startTween = useCallback(() => {
    if (!paramState || paramState.isTweening) return;

    const startValue = store.getState().getByPath(config.path) as number;
    const { targetValue, duration, ease } = paramState;

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
        store.getState().setByPath(config.path, tweenState.current.value);
        setProgress(config.path, tweenState.current.progress);
      },
      onComplete: () => {
        setIsTweening(config.path, false);
        setProgress(config.path, 0);
        resetTween(config.path, targetValue);
        tweenRef.current = null;
      },
    });
  }, [config.path, paramState, store, setIsTweening, setProgress, resetTween]);

  const cancelTween = useCallback(() => {
    if (tweenRef.current) {
      tweenRef.current.kill();
      tweenRef.current = null;
      const currentVal = store.getState().getByPath(config.path) as number;
      resetTween(config.path, currentVal);
    }
  }, [config.path, store, resetTween]);

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
    cancelTween,
  };
}
