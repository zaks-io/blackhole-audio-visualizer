import type { PropertyConfig, EaseFunction } from './propertyRegistry';

export interface TweenState {
  selectedProperty: PropertyConfig | null;
  targetValue: number;
  duration: number;
  ease: EaseFunction;
  isTweening: boolean;
  progress: number;
}

export interface UseTweenControlReturn {
  state: TweenState;
  currentValue: number | null;
  setSelectedProperty: (property: PropertyConfig | null) => void;
  setTargetValue: (value: number) => void;
  setDuration: (duration: number) => void;
  setEase: (ease: EaseFunction) => void;
  startTween: () => void;
  cancelTween: () => void;
}
