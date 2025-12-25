import { create } from "zustand";
import type { ColorPaletteId } from "@/components/ColorModeSystem";
import { syncFromStore } from "@/lib/runtimeStateRegistry";
import { PARAM_DEFAULTS } from "@/convex/lib/visualizationParameters";

export interface VisualizationControlsState {
  // Black Hole
  eventHorizonRadius: number;
  iscoRatio: number;
  beatPulse: number;
  blackHoleCount: number;
  orbitRadius: number;
  orbitSpeed: number;
  blackHoleMassMin: number;
  blackHoleMassMax: number;
  coronaEnabled: boolean;
  coronaIntensity: number;
  coronaPower: number;

  // Particles
  textureSize: number;
  pointSize: number;
  brightness: number;
  alpha: number;
  maxDistance: number;
  colorPalette: ColorPaletteId;
  motionBlurScale: number;
  motionBlurLength: number;
  motionBlurTaper: number;
  motionBlurFade: number;

  // Physics
  gravity: number;
  timeScale: number;
  softening: number;
  orbitDecay: number;
  iscoStrength: number;
  lifetimeGracePeriod: number;
  lifetimeMax: number;
  lifetimeGravityMultiplier: number;

  // Emitters
  emitRadius: number;
  emitterCount: number;
  emitterAngle: number;
  emitterTilt: number;
  inwardAngle: number;
  spawnRate: number;
  emitterSpread: number;
  showEmitters: boolean;

  // Skybox
  skybox: string;
  starDensity: number;
  starBrightness: number;

  // Audio
  amplitude: number;
  onsetDecay: number;
  audioGain: number;
  beatRepulsion: number;
  autoColorChange: boolean;

  // Post-Processing (dev controls)
  bloomEnabled: boolean;
  bloomBaseIntensity: number;
  bloomAudioReactivity: number;
  chromaticEnabled: boolean;
  chromaticAudioReactivity: number;
  vignetteEnabled: boolean;
  vignetteOffset: number;
  vignetteDarkness: number;
  hfcVelocityBoost: number;
  spawnBurstMultiplier: number;
}

interface VisualizationControlsActions {
  set: <K extends keyof VisualizationControlsState>(
    key: K,
    value: VisualizationControlsState[K]
  ) => void;
  get: <K extends keyof VisualizationControlsState>(key: K) => VisualizationControlsState[K];
  setByPath: (path: string, value: unknown) => void;
  batchSetByPath: (updates: Array<{ path: string; value: unknown }>) => void;
  getByPath: (path: string) => unknown;
  reset: () => void;
}

export type VisualizationControlsStore = VisualizationControlsState & VisualizationControlsActions;

export const pathToKey: Record<string, keyof VisualizationControlsState> = {
  "Black Hole.eventHorizonRadius": "eventHorizonRadius",
  "Black Hole.iscoRatio": "iscoRatio",
  "Black Hole.beatPulse": "beatPulse",
  "Black Hole.blackHoleCount": "blackHoleCount",
  "Black Hole.orbitRadius": "orbitRadius",
  "Black Hole.orbitSpeed": "orbitSpeed",
  "Black Hole.blackHoleMassMin": "blackHoleMassMin",
  "Black Hole.blackHoleMassMax": "blackHoleMassMax",
  "Black Hole.coronaIntensity": "coronaIntensity",
  "Black Hole.coronaPower": "coronaPower",
  "Particles.textureSize": "textureSize",
  "Particles.pointSize": "pointSize",
  "Particles.brightness": "brightness",
  "Particles.alpha": "alpha",
  "Particles.maxDistance": "maxDistance",
  "Particles.colorPalette": "colorPalette",
  "Particles.motionBlurScale": "motionBlurScale",
  "Particles.motionBlurLength": "motionBlurLength",
  "Particles.motionBlurTaper": "motionBlurTaper",
  "Particles.motionBlurFade": "motionBlurFade",
  "Physics.gravity": "gravity",
  "Physics.timeScale": "timeScale",
  "Physics.softening": "softening",
  "Physics.orbitDecay": "orbitDecay",
  "Physics.iscoStrength": "iscoStrength",
  "Physics.iscoRatio": "iscoRatio",
  "Physics.lifetimeGracePeriod": "lifetimeGracePeriod",
  "Physics.lifetimeMax": "lifetimeMax",
  "Physics.lifetimeGravityMultiplier": "lifetimeGravityMultiplier",
  "Emitters.emitRadius": "emitRadius",
  "Emitters.emitterCount": "emitterCount",
  "Emitters.emitterAngle": "emitterAngle",
  "Emitters.emitterTilt": "emitterTilt",
  "Emitters.inwardAngle": "inwardAngle",
  "Emitters.spawnRate": "spawnRate",
  "Emitters.emitterSpread": "emitterSpread",
  "Emitters.showEmitters": "showEmitters",
  "Skybox.skybox": "skybox",
  "Skybox.starDensity": "starDensity",
  "Skybox.starBrightness": "starBrightness",
  "Audio.amplitude": "amplitude",
  "Audio.onsetDecay": "onsetDecay",
  "Audio.audioGain": "audioGain",
  "Audio.beatRepulsion": "beatRepulsion",
  "Audio.autoColorChange": "autoColorChange",
  "Post-FX.bloomEnabled": "bloomEnabled",
  "Post-FX.bloomBaseIntensity": "bloomBaseIntensity",
  "Post-FX.bloomAudioReactivity": "bloomAudioReactivity",
  "Post-FX.chromaticEnabled": "chromaticEnabled",
  "Post-FX.chromaticAudioReactivity": "chromaticAudioReactivity",
  "Post-FX.vignetteEnabled": "vignetteEnabled",
  "Post-FX.vignetteOffset": "vignetteOffset",
  "Post-FX.vignetteDarkness": "vignetteDarkness",
  "Post-FX.hfcVelocityBoost": "hfcVelocityBoost",
  "Post-FX.spawnBurstMultiplier": "spawnBurstMultiplier",
};

const DEFAULT_STATE: VisualizationControlsState = {
  // Numeric defaults from PARAMS (single source of truth)
  eventHorizonRadius: PARAM_DEFAULTS.eventHorizonRadius,
  iscoRatio: PARAM_DEFAULTS.iscoRatio,
  beatPulse: PARAM_DEFAULTS.beatPulse,
  blackHoleCount: PARAM_DEFAULTS.blackHoleCount,
  orbitRadius: PARAM_DEFAULTS.orbitRadius,
  orbitSpeed: PARAM_DEFAULTS.orbitSpeed,
  blackHoleMassMin: PARAM_DEFAULTS.blackHoleMassMin,
  blackHoleMassMax: PARAM_DEFAULTS.blackHoleMassMax,
  coronaIntensity: PARAM_DEFAULTS.coronaIntensity,
  coronaPower: PARAM_DEFAULTS.coronaPower,
  textureSize: PARAM_DEFAULTS.textureSize,
  pointSize: PARAM_DEFAULTS.pointSize,
  brightness: PARAM_DEFAULTS.brightness,
  alpha: PARAM_DEFAULTS.alpha,
  maxDistance: PARAM_DEFAULTS.maxDistance,
  motionBlurTaper: PARAM_DEFAULTS.motionBlurTaper,
  motionBlurFade: PARAM_DEFAULTS.motionBlurFade,
  gravity: PARAM_DEFAULTS.gravity,
  timeScale: PARAM_DEFAULTS.timeScale,
  softening: PARAM_DEFAULTS.softening,
  orbitDecay: PARAM_DEFAULTS.orbitDecay,
  iscoStrength: PARAM_DEFAULTS.iscoStrength,
  lifetimeGracePeriod: PARAM_DEFAULTS.lifetimeGracePeriod,
  lifetimeMax: PARAM_DEFAULTS.lifetimeMax,
  lifetimeGravityMultiplier: PARAM_DEFAULTS.lifetimeGravityMultiplier,
  emitRadius: PARAM_DEFAULTS.emitRadius,
  emitterCount: PARAM_DEFAULTS.emitterCount,
  emitterAngle: PARAM_DEFAULTS.emitterAngle,
  emitterTilt: PARAM_DEFAULTS.emitterTilt,
  inwardAngle: PARAM_DEFAULTS.inwardAngle,
  spawnRate: PARAM_DEFAULTS.spawnRate,
  emitterSpread: PARAM_DEFAULTS.emitterSpread,
  starDensity: PARAM_DEFAULTS.starDensity,
  starBrightness: PARAM_DEFAULTS.starBrightness,
  amplitude: PARAM_DEFAULTS.amplitude,
  onsetDecay: PARAM_DEFAULTS.onsetDecay,
  audioGain: PARAM_DEFAULTS.audioGain,
  beatRepulsion: PARAM_DEFAULTS.beatRepulsion,
  bloomBaseIntensity: PARAM_DEFAULTS.bloomBaseIntensity,
  bloomAudioReactivity: PARAM_DEFAULTS.bloomAudioReactivity,
  chromaticAudioReactivity: PARAM_DEFAULTS.chromaticAudioReactivity,
  vignetteOffset: PARAM_DEFAULTS.vignetteOffset,
  vignetteDarkness: PARAM_DEFAULTS.vignetteDarkness,
  hfcVelocityBoost: PARAM_DEFAULTS.hfcVelocityBoost,
  spawnBurstMultiplier: PARAM_DEFAULTS.spawnBurstMultiplier,

  // Non-numeric defaults (not in PARAMS)
  coronaEnabled: false,
  colorPalette: "grayscale" as ColorPaletteId,
  motionBlurScale: 0.5,
  motionBlurLength: 8.0,
  showEmitters: false,
  skybox: "Procedural Stars",
  autoColorChange: true,
  bloomEnabled: true,
  chromaticEnabled: true,
  vignetteEnabled: true,
};

export const useVisualizationControls = create<VisualizationControlsStore>((set, get) => ({
  ...DEFAULT_STATE,

  set: (key, value) => set({ [key]: value }),

  get: (key) => get()[key],

  setByPath: (path, value) => {
    const key = pathToKey[path];
    if (key) {
      set({ [key]: value } as Partial<VisualizationControlsState>);
    }
  },

  batchSetByPath: (updates) => {
    const changes: Partial<VisualizationControlsState> = {};
    for (const { path, value } of updates) {
      const key = pathToKey[path];
      if (key) {
        (changes as Record<string, unknown>)[key] = value;
      }
    }
    if (Object.keys(changes).length > 0) {
      set(changes);
    }
  },

  getByPath: (path) => {
    const key = pathToKey[path];
    if (key) {
      return get()[key];
    }
    return undefined;
  },

  reset: () => set(DEFAULT_STATE),
}));

// Sync store changes to runtime state for render loop access
// This subscription tracks which keys changed and only syncs those (performance optimization)

// Flag to skip sync during playback (runtime state is already updated via callGPUSetter)
let skipNextSync = false;
export function setSkipNextSync(skip: boolean) {
  skipNextSync = skip;
}

// Debug timing flag
const getTimingDebug = () =>
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("timingDebug");

let prevState = useVisualizationControls.getState();
useVisualizationControls.subscribe((state) => {
  const timing = getTimingDebug();
  if (timing) performance.mark("store-subscription-start");

  // Skip sync if flag is set (playback already updated runtime state)
  if (skipNextSync) {
    skipNextSync = false;
    prevState = state;
    if (timing) console.log("[TIMING] Skipped syncFromStore (playback mode)");
    return;
  }

  const changedKeys = new Set<string>();
  for (const key of Object.keys(state) as Array<keyof VisualizationControlsState>) {
    if (state[key] !== prevState[key]) {
      changedKeys.add(key);
    }
  }
  if (changedKeys.size > 0) {
    if (timing) performance.mark("syncFromStore-start");
    syncFromStore(state, changedKeys);
    if (timing) {
      performance.mark("syncFromStore-end");
      performance.measure("syncFromStore", "syncFromStore-start", "syncFromStore-end");
      console.log(`[TIMING] syncFromStore: ${changedKeys.size} keys changed`);
    }
  }
  prevState = state;

  if (timing) {
    performance.mark("store-subscription-end");
    performance.measure("store-subscription", "store-subscription-start", "store-subscription-end");
  }
});

// Initialize runtime state with current store values (full sync on load)
syncFromStore(useVisualizationControls.getState());
