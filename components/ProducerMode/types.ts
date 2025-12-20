export interface ParameterConfig {
  path: string;
  label: string;
  description: string;
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
  globalDuration: number;
  globalEase: EaseFunction;

  setOpen: (open: boolean) => void;
  toggleOpen: () => void;

  initParameter: (path: string, currentValue: number) => void;
  setTargetValue: (path: string, value: number) => void;
  setDuration: (path: string, duration: number) => void;
  setEase: (path: string, ease: EaseFunction) => void;
  setGlobalDuration: (duration: number) => void;
  setGlobalEase: (ease: EaseFunction) => void;

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

// Convex types (using string for IDs to match Convex's Id type at runtime)
export interface ConvexPreset {
  _id: string;
  userId: string;
  name: string;
  colorPalette: string;
  parameters: PresetParameter[];
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PlaylistItem {
  presetId: string;
  waitDuration?: number;
}

export interface Playlist {
  _id: string;
  userId: string;
  name: string;
  items: PlaylistItem[];
  shuffle: boolean;
  defaultWaitDuration: number;
  isPublic: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface PlaylistWithPresets extends Playlist {
  presets: ConvexPreset[];
}

export type PlaybackStatus = "idle" | "tweening" | "waiting";

export interface PlaylistPlayerState {
  isPlaying: boolean;
  isPaused: boolean;
  currentIndex: number;
  status: PlaybackStatus;
  waitProgress: number;
}
