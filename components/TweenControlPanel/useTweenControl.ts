import { useState, useRef, useCallback, useEffect } from "react";
import gsap from "gsap";
import { levaStore } from "leva";
import type { PropertyConfig, EaseFunction } from "./propertyRegistry";
import type { TweenState, UseTweenControlReturn } from "./types";

export function useTweenControl(): UseTweenControlReturn {
  const store = levaStore;

  const [state, setState] = useState<TweenState>({
    selectedProperty: null,
    targetValue: 0,
    duration: 1.0,
    ease: "power2.inOut",
    isTweening: false,
    progress: 0,
  });

  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const tweenState = useRef({ value: 0, progress: 0 });

  const getCurrentValue = useCallback(
    (property: PropertyConfig): number => {
      return store.get(property.path) as number;
    },
    [store]
  );

  const currentValue = state.selectedProperty ? getCurrentValue(state.selectedProperty) : null;

  const setSelectedProperty = useCallback(
    (property: PropertyConfig | null) => {
      if (property) {
        const current = getCurrentValue(property);
        setState((prev) => ({
          ...prev,
          selectedProperty: property,
          targetValue: current,
        }));
      } else {
        setState((prev) => ({ ...prev, selectedProperty: null }));
      }
    },
    [getCurrentValue]
  );

  const setTargetValue = useCallback((value: number) => {
    setState((prev) => ({ ...prev, targetValue: value }));
  }, []);

  const setDuration = useCallback((duration: number) => {
    setState((prev) => ({ ...prev, duration }));
  }, []);

  const setEase = useCallback((ease: EaseFunction) => {
    setState((prev) => ({ ...prev, ease }));
  }, []);

  const startTween = useCallback(() => {
    if (!state.selectedProperty || state.isTweening) return;

    const { selectedProperty, targetValue, duration, ease } = state;
    const startValue = getCurrentValue(selectedProperty);

    if (tweenRef.current) {
      tweenRef.current.kill();
    }

    tweenState.current = { value: startValue, progress: 0 };
    setState((prev) => ({ ...prev, isTweening: true, progress: 0 }));

    tweenRef.current = gsap.to(tweenState.current, {
      value: targetValue,
      progress: 1,
      duration,
      ease,
      onUpdate: () => {
        store.setValueAtPath(selectedProperty.path, tweenState.current.value, false);
        setState((prev) => ({ ...prev, progress: tweenState.current.progress }));
      },
      onComplete: () => {
        setState((prev) => ({ ...prev, isTweening: false, progress: 0 }));
        tweenRef.current = null;
      },
    });
  }, [state, getCurrentValue, store]);

  const cancelTween = useCallback(() => {
    if (tweenRef.current) {
      tweenRef.current.kill();
      tweenRef.current = null;
      setState((prev) => ({ ...prev, isTweening: false, progress: 0 }));
    }
  }, []);

  useEffect(() => {
    return () => {
      if (tweenRef.current) {
        tweenRef.current.kill();
      }
    };
  }, []);

  return {
    state,
    currentValue,
    setSelectedProperty,
    setTargetValue,
    setDuration,
    setEase,
    startTween,
    cancelTween,
  };
}
