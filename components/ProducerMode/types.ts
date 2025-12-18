export interface ParameterConfig {
  path: string;
  label: string;
  min: number;
  max: number;
  step: number;
  formatValue?: (value: number) => string;
}

export interface ParameterGroup {
  name: string;
  parameters: ParameterConfig[];
}

export type EaseFunction =
  | "none"
  | "power1.in"
  | "power1.out"
  | "power1.inOut"
  | "power2.in"
  | "power2.out"
  | "power2.inOut"
  | "power3.in"
  | "power3.out"
  | "power3.inOut"
  | "power4.in"
  | "power4.out"
  | "power4.inOut"
  | "back.in"
  | "back.out"
  | "back.inOut"
  | "elastic.out"
  | "bounce.out";

export interface TweenParameterState {
  targetValue: number;
  duration: number;
  ease: EaseFunction;
  isTweening: boolean;
  progress: number;
}

export interface ProducerModeState {
  isOpen: boolean;
  tweenStates: Record<string, TweenParameterState>;

  setOpen: (open: boolean) => void;
  toggleOpen: () => void;

  initParameter: (path: string, currentValue: number) => void;
  setTargetValue: (path: string, value: number) => void;
  setDuration: (path: string, duration: number) => void;
  setEase: (path: string, ease: EaseFunction) => void;

  setIsTweening: (path: string, isTweening: boolean) => void;
  setProgress: (path: string, progress: number) => void;
  resetTween: (path: string, currentValue: number) => void;
  resetAllTweens: () => void;
}

export interface PresetParameter {
  path: string;
  value: number;
  duration: number;
  ease: EaseFunction;
}

export interface Preset {
  id: string;
  name: string;
  colorPalette: string;
  parameters: PresetParameter[];
  createdAt: number;
}
