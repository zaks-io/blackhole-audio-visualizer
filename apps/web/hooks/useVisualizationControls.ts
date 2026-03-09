import { create } from "zustand";
import type { ColorPaletteId } from "@/components/ColorModeSystem";
import { syncFromStore } from "@/lib/runtimeStateRegistry";
import { PARAM_DEFAULTS } from "@blackhole/backend/convex/lib/visualizationParameters";

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
  blackHoleOffsetY: number;
  whiteBlackHole: number;

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
  denseGuardEnterFps: number;
  denseGuardExitFps: number;
  denseGuardEnterFrames: number;
  denseGuardExitFrames: number;
  denseGuardStrength: number;
  denseCenterBias: number;
  densityScale: number;

  // Physics
  gravity: number;
  timeScale: number;
  softening: number;
  orbitDecay: number;
  iscoStrength: number;
  lifetimeGracePeriod: number;
  lifetimeMax: number;
  lifetimeGravityMultiplier: number;
  frameDragging: number;

  // Emitters
  emitRadius: number;
  emitterCount: number;
  emitterAngle: number;
  emitterTilt: number;
  inwardAngle: number;
  spawnRate: number;
  emitterSpread: number;
  emitterWidth: number;
  emissionShape: number;
  emitterLineY: number;
  emitterLineWidth: number;
  showEmitters: boolean;

  // Skybox
  skybox: string;
  starDensity: number;
  starBrightness: number;
  // Spectrum
  spectrumEnabled: boolean;
  spectrumRadius: number;
  spectrumHeight: number;
  spectrumRepeats: number;
  spectrumAlpha: number;
  spectrumSmoothing: number;
  spectrumBarGap: number;
  // Audio
  amplitude: number;
  onsetDecay: number;
  audioGain: number;
  beatRepulsion: number;
  beatTimeScale: number;
  beatMassPulse: number;
  beatPhaseCorrection: number;
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
  invertColors: boolean;
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
  "Black Hole.blackHoleOffsetY": "blackHoleOffsetY",
  "Black Hole.whiteBlackHole": "whiteBlackHole",
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
  "Particles.denseGuardEnterFps": "denseGuardEnterFps",
  "Particles.denseGuardExitFps": "denseGuardExitFps",
  "Particles.denseGuardEnterFrames": "denseGuardEnterFrames",
  "Particles.denseGuardExitFrames": "denseGuardExitFrames",
  "Particles.denseGuardStrength": "denseGuardStrength",
  "Particles.denseCenterBias": "denseCenterBias",
  "Particles.densityScale": "densityScale",
  "Physics.gravity": "gravity",
  "Physics.timeScale": "timeScale",
  "Physics.softening": "softening",
  "Physics.orbitDecay": "orbitDecay",
  "Physics.iscoStrength": "iscoStrength",
  "Physics.iscoRatio": "iscoRatio",
  "Physics.lifetimeGracePeriod": "lifetimeGracePeriod",
  "Physics.lifetimeMax": "lifetimeMax",
  "Physics.lifetimeGravityMultiplier": "lifetimeGravityMultiplier",
  "Physics.frameDragging": "frameDragging",
  "Emitters.emitRadius": "emitRadius",
  "Emitters.emitterCount": "emitterCount",
  "Emitters.emitterAngle": "emitterAngle",
  "Emitters.emitterTilt": "emitterTilt",
  "Emitters.inwardAngle": "inwardAngle",
  "Emitters.spawnRate": "spawnRate",
  "Emitters.emitterSpread": "emitterSpread",
  "Emitters.emitterWidth": "emitterWidth",
  "Emitters.emissionShape": "emissionShape",
  "Emitters.emitterLineY": "emitterLineY",
  "Emitters.emitterLineWidth": "emitterLineWidth",
  "Emitters.showEmitters": "showEmitters",
  "Skybox.skybox": "skybox",
  "Skybox.starDensity": "starDensity",
  "Skybox.starBrightness": "starBrightness",
  "Spectrum.spectrumEnabled": "spectrumEnabled",
  "Spectrum.spectrumRadius": "spectrumRadius",
  "Spectrum.spectrumHeight": "spectrumHeight",
  "Spectrum.spectrumRepeats": "spectrumRepeats",
  "Spectrum.spectrumAlpha": "spectrumAlpha",
  "Spectrum.spectrumSmoothing": "spectrumSmoothing",
  "Spectrum.spectrumBarGap": "spectrumBarGap",
  "Audio.amplitude": "amplitude",
  "Audio.onsetDecay": "onsetDecay",
  "Audio.audioGain": "audioGain",
  "Audio.beatRepulsion": "beatRepulsion",
  "Audio.beatTimeScale": "beatTimeScale",
  "Audio.beatMassPulse": "beatMassPulse",
  "Audio.beatPhaseCorrection": "beatPhaseCorrection",
  "Audio.autoColorChange": "autoColorChange",
  "Post-FX.bloomEnabled": "bloomEnabled",
  "Post-FX.bloomBaseIntensity": "bloomBaseIntensity",
  "Post-FX.bloomAudioReactivity": "bloomAudioReactivity",
  "Post-FX.chromaticEnabled": "chromaticEnabled",
  "Post-FX.chromaticAudioReactivity": "chromaticAudioReactivity",
  "Post-FX.vignetteEnabled": "vignetteEnabled",
  "Post-FX.vignetteOffset": "vignetteOffset",
  "Post-FX.vignetteDarkness": "vignetteDarkness",
  "Post-FX.invertColors": "invertColors",
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
  blackHoleOffsetY: PARAM_DEFAULTS.blackHoleOffsetY,
  whiteBlackHole: PARAM_DEFAULTS.whiteBlackHole,
  textureSize: PARAM_DEFAULTS.textureSize,
  pointSize: PARAM_DEFAULTS.pointSize,
  brightness: PARAM_DEFAULTS.brightness,
  alpha: PARAM_DEFAULTS.alpha,
  maxDistance: PARAM_DEFAULTS.maxDistance,
  motionBlurTaper: PARAM_DEFAULTS.motionBlurTaper,
  motionBlurFade: PARAM_DEFAULTS.motionBlurFade,
  denseGuardEnterFps: PARAM_DEFAULTS.denseGuardEnterFps,
  denseGuardExitFps: PARAM_DEFAULTS.denseGuardExitFps,
  denseGuardEnterFrames: PARAM_DEFAULTS.denseGuardEnterFrames,
  denseGuardExitFrames: PARAM_DEFAULTS.denseGuardExitFrames,
  denseGuardStrength: PARAM_DEFAULTS.denseGuardStrength,
  denseCenterBias: PARAM_DEFAULTS.denseCenterBias,
  densityScale: PARAM_DEFAULTS.densityScale,
  gravity: PARAM_DEFAULTS.gravity,
  timeScale: PARAM_DEFAULTS.timeScale,
  softening: PARAM_DEFAULTS.softening,
  orbitDecay: PARAM_DEFAULTS.orbitDecay,
  iscoStrength: PARAM_DEFAULTS.iscoStrength,
  lifetimeGracePeriod: PARAM_DEFAULTS.lifetimeGracePeriod,
  lifetimeMax: PARAM_DEFAULTS.lifetimeMax,
  lifetimeGravityMultiplier: PARAM_DEFAULTS.lifetimeGravityMultiplier,
  frameDragging: PARAM_DEFAULTS.frameDragging,
  emitRadius: PARAM_DEFAULTS.emitRadius,
  emitterCount: PARAM_DEFAULTS.emitterCount,
  emitterAngle: PARAM_DEFAULTS.emitterAngle,
  emitterTilt: PARAM_DEFAULTS.emitterTilt,
  inwardAngle: PARAM_DEFAULTS.inwardAngle,
  spawnRate: PARAM_DEFAULTS.spawnRate,
  emitterSpread: PARAM_DEFAULTS.emitterSpread,
  emitterWidth: PARAM_DEFAULTS.emitterWidth,
  emissionShape: PARAM_DEFAULTS.emissionShape,
  emitterLineY: PARAM_DEFAULTS.emitterLineY,
  emitterLineWidth: PARAM_DEFAULTS.emitterLineWidth,
  starDensity: PARAM_DEFAULTS.starDensity,
  starBrightness: PARAM_DEFAULTS.starBrightness,
  spectrumRadius: PARAM_DEFAULTS.spectrumRadius,
  spectrumHeight: PARAM_DEFAULTS.spectrumHeight,
  spectrumRepeats: PARAM_DEFAULTS.spectrumRepeats,
  spectrumAlpha: PARAM_DEFAULTS.spectrumAlpha,
  spectrumSmoothing: PARAM_DEFAULTS.spectrumSmoothing,
  spectrumBarGap: PARAM_DEFAULTS.spectrumBarGap,
  amplitude: PARAM_DEFAULTS.amplitude,
  onsetDecay: PARAM_DEFAULTS.onsetDecay,
  audioGain: PARAM_DEFAULTS.audioGain,
  beatRepulsion: PARAM_DEFAULTS.beatRepulsion,
  beatTimeScale: PARAM_DEFAULTS.beatTimeScale,
  beatMassPulse: PARAM_DEFAULTS.beatMassPulse,
  beatPhaseCorrection: PARAM_DEFAULTS.beatPhaseCorrection,
  bloomBaseIntensity: PARAM_DEFAULTS.bloomBaseIntensity,
  bloomAudioReactivity: PARAM_DEFAULTS.bloomAudioReactivity,
  chromaticAudioReactivity: PARAM_DEFAULTS.chromaticAudioReactivity,
  vignetteOffset: PARAM_DEFAULTS.vignetteOffset,
  vignetteDarkness: PARAM_DEFAULTS.vignetteDarkness,
  hfcVelocityBoost: PARAM_DEFAULTS.hfcVelocityBoost,
  spawnBurstMultiplier: PARAM_DEFAULTS.spawnBurstMultiplier,

  // Non-numeric defaults (not in PARAMS)
  spectrumEnabled: false,
  coronaEnabled: false,
  colorPalette: "grayscale" as ColorPaletteId,
  motionBlurScale: 0.5,
  motionBlurLength: 8.0,
  showEmitters: false,
  skybox: "None",
  autoColorChange: true,
  bloomEnabled: true,
  chromaticEnabled: true,
  vignetteEnabled: true,
  invertColors: false,
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
