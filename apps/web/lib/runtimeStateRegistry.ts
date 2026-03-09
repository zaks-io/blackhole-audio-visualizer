// Runtime visualization state - bypasses React for frame-by-frame reads
// This mutable object is updated by GPU setters during tweens and synced from the store for user changes
// IMPORTANT: Heavy 3D components should ONLY read from runtimeState, never subscribe to Zustand

import type { VisualizationControlsState } from "@/hooks/useVisualizationControls";
import { PARAM_DEFAULTS } from "@blackhole/backend/convex/lib/visualizationParameters";

// Runtime state containing all values that render loops need
// These values are mutated directly for performance during tweens
// Numeric defaults come from PARAMS (single source of truth)
export const runtimeState = {
  // Black Hole
  eventHorizonRadius: PARAM_DEFAULTS.eventHorizonRadius,
  iscoRatio: PARAM_DEFAULTS.iscoRatio,
  beatPulse: PARAM_DEFAULTS.beatPulse,
  blackHoleCount: PARAM_DEFAULTS.blackHoleCount,
  orbitRadius: PARAM_DEFAULTS.orbitRadius,
  orbitSpeed: PARAM_DEFAULTS.orbitSpeed,
  blackHoleMassMin: PARAM_DEFAULTS.blackHoleMassMin,
  blackHoleMassMax: PARAM_DEFAULTS.blackHoleMassMax,
  blackHoleOffsetY: PARAM_DEFAULTS.blackHoleOffsetY,
  whiteBlackHole: PARAM_DEFAULTS.whiteBlackHole,

  // Particles / Render
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
  colorPaletteOffset: 0, // Palette offset for GPU - updated via callGPUSetter

  // Physics
  gravity: PARAM_DEFAULTS.gravity,
  timeScale: PARAM_DEFAULTS.timeScale,
  softening: PARAM_DEFAULTS.softening,
  orbitDecay: PARAM_DEFAULTS.orbitDecay,
  iscoStrength: PARAM_DEFAULTS.iscoStrength,
  lifetimeGracePeriod: PARAM_DEFAULTS.lifetimeGracePeriod,
  lifetimeMax: PARAM_DEFAULTS.lifetimeMax,
  lifetimeGravityMultiplier: PARAM_DEFAULTS.lifetimeGravityMultiplier,
  frameDragging: PARAM_DEFAULTS.frameDragging,

  // Emitters
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

  // Audio
  amplitude: PARAM_DEFAULTS.amplitude,
  audioGain: PARAM_DEFAULTS.audioGain,
  beatRepulsion: PARAM_DEFAULTS.beatRepulsion,
  beatTimeScale: PARAM_DEFAULTS.beatTimeScale,
  beatMassPulse: PARAM_DEFAULTS.beatMassPulse,
  beatPhaseCorrection: PARAM_DEFAULTS.beatPhaseCorrection,

  // Post-Processing
  bloomBaseIntensity: PARAM_DEFAULTS.bloomBaseIntensity,
  bloomAudioReactivity: PARAM_DEFAULTS.bloomAudioReactivity,
  chromaticAudioReactivity: PARAM_DEFAULTS.chromaticAudioReactivity,
  vignetteOffset: PARAM_DEFAULTS.vignetteOffset,
  vignetteDarkness: PARAM_DEFAULTS.vignetteDarkness,
  hfcVelocityBoost: PARAM_DEFAULTS.hfcVelocityBoost,
  spawnBurstMultiplier: PARAM_DEFAULTS.spawnBurstMultiplier,
};

export type RuntimeStateKey = keyof typeof runtimeState;

// Direct key setter for internal use
export function setRuntimeValue(key: RuntimeStateKey, value: number) {
  runtimeState[key] = value;
}

// Map from path (e.g. "Physics.gravity") to runtime key
// Only includes paths for values in runtimeState
const runtimePathToKey: Record<string, RuntimeStateKey> = {
  // Black Hole
  "Black Hole.eventHorizonRadius": "eventHorizonRadius",
  "Black Hole.iscoRatio": "iscoRatio",
  "Black Hole.beatPulse": "beatPulse",
  "Black Hole.blackHoleCount": "blackHoleCount",
  "Black Hole.orbitRadius": "orbitRadius",
  "Black Hole.orbitSpeed": "orbitSpeed",
  "Black Hole.blackHoleMassMin": "blackHoleMassMin",
  "Black Hole.blackHoleMassMax": "blackHoleMassMax",
  "Black Hole.blackHoleOffsetY": "blackHoleOffsetY",
  "Black Hole.whiteBlackHole": "whiteBlackHole",

  // Particles
  "Particles.pointSize": "pointSize",
  "Particles.brightness": "brightness",
  "Particles.alpha": "alpha",
  "Particles.maxDistance": "maxDistance",
  "Particles.motionBlurTaper": "motionBlurTaper",
  "Particles.motionBlurFade": "motionBlurFade",
  "Particles.denseGuardEnterFps": "denseGuardEnterFps",
  "Particles.denseGuardExitFps": "denseGuardExitFps",
  "Particles.denseGuardEnterFrames": "denseGuardEnterFrames",
  "Particles.denseGuardExitFrames": "denseGuardExitFrames",
  "Particles.denseGuardStrength": "denseGuardStrength",
  "Particles.denseCenterBias": "denseCenterBias",
  "Particles.densityScale": "densityScale",
  "Particles.colorPaletteOffset": "colorPaletteOffset",

  // Physics
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

  // Emitters
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

  // Audio
  "Audio.amplitude": "amplitude",
  "Audio.audioGain": "audioGain",
  "Audio.beatRepulsion": "beatRepulsion",
  "Audio.beatTimeScale": "beatTimeScale",
  "Audio.beatMassPulse": "beatMassPulse",
  "Audio.beatPhaseCorrection": "beatPhaseCorrection",

  // Post-FX
  "Post-FX.bloomBaseIntensity": "bloomBaseIntensity",
  "Post-FX.bloomAudioReactivity": "bloomAudioReactivity",
  "Post-FX.chromaticAudioReactivity": "chromaticAudioReactivity",
  "Post-FX.vignetteOffset": "vignetteOffset",
  "Post-FX.vignetteDarkness": "vignetteDarkness",
  "Post-FX.hfcVelocityBoost": "hfcVelocityBoost",
  "Post-FX.spawnBurstMultiplier": "spawnBurstMultiplier",
};

// Path-based setter for GPU setter integration
export function setRuntimeValueByPath(path: string, value: number): boolean {
  const key = runtimePathToKey[path];
  if (key) {
    runtimeState[key] = value;
    return true;
  }
  return false;
}

// Reverse lookup: store key → runtime key (for selective sync)
const storeKeyToRuntimeKey: Record<string, RuntimeStateKey> = {
  // Black Hole
  eventHorizonRadius: "eventHorizonRadius",
  iscoRatio: "iscoRatio",
  beatPulse: "beatPulse",
  blackHoleCount: "blackHoleCount",
  orbitRadius: "orbitRadius",
  orbitSpeed: "orbitSpeed",
  blackHoleMassMin: "blackHoleMassMin",
  blackHoleMassMax: "blackHoleMassMax",
  blackHoleOffsetY: "blackHoleOffsetY",
  whiteBlackHole: "whiteBlackHole",

  // Particles
  pointSize: "pointSize",
  brightness: "brightness",
  alpha: "alpha",
  maxDistance: "maxDistance",
  motionBlurTaper: "motionBlurTaper",
  motionBlurFade: "motionBlurFade",
  denseGuardEnterFps: "denseGuardEnterFps",
  denseGuardExitFps: "denseGuardExitFps",
  denseGuardEnterFrames: "denseGuardEnterFrames",
  denseGuardExitFrames: "denseGuardExitFrames",
  denseGuardStrength: "denseGuardStrength",
  denseCenterBias: "denseCenterBias",
  densityScale: "densityScale",
  // Note: colorPaletteOffset is NOT synced from store - it's set directly via callGPUSetter

  // Physics
  gravity: "gravity",
  timeScale: "timeScale",
  softening: "softening",
  orbitDecay: "orbitDecay",
  iscoStrength: "iscoStrength",
  lifetimeGracePeriod: "lifetimeGracePeriod",
  lifetimeMax: "lifetimeMax",
  lifetimeGravityMultiplier: "lifetimeGravityMultiplier",
  frameDragging: "frameDragging",

  // Emitters
  emitRadius: "emitRadius",
  emitterCount: "emitterCount",
  emitterAngle: "emitterAngle",
  emitterTilt: "emitterTilt",
  inwardAngle: "inwardAngle",
  spawnRate: "spawnRate",
  emitterSpread: "emitterSpread",
  emitterWidth: "emitterWidth",
  emissionShape: "emissionShape",
  emitterLineY: "emitterLineY",
  emitterLineWidth: "emitterLineWidth",

  // Audio
  amplitude: "amplitude",
  audioGain: "audioGain",
  beatRepulsion: "beatRepulsion",
  beatTimeScale: "beatTimeScale",
  beatMassPulse: "beatMassPulse",
  beatPhaseCorrection: "beatPhaseCorrection",

  // Post-FX
  bloomBaseIntensity: "bloomBaseIntensity",
  bloomAudioReactivity: "bloomAudioReactivity",
  chromaticAudioReactivity: "chromaticAudioReactivity",
  vignetteOffset: "vignetteOffset",
  vignetteDarkness: "vignetteDarkness",
  hfcVelocityBoost: "hfcVelocityBoost",
  spawnBurstMultiplier: "spawnBurstMultiplier",
};

// Sync values from visualization store state to runtime state
// When changedKeys is provided, only syncs those specific keys (performance optimization)
// When changedKeys is undefined, syncs all keys (used for initial load)
export function syncFromStore(state: VisualizationControlsState, changedKeys?: Set<string>) {
  if (changedKeys) {
    // Selective sync - only changed keys
    for (const key of changedKeys) {
      const runtimeKey = storeKeyToRuntimeKey[key];
      if (runtimeKey && typeof state[key as keyof VisualizationControlsState] === "number") {
        runtimeState[runtimeKey] = state[key as keyof VisualizationControlsState] as number;
      }
    }
  } else {
    // Full sync (initial load)
    for (const [storeKey, runtimeKey] of Object.entries(storeKeyToRuntimeKey)) {
      const value = state[storeKey as keyof VisualizationControlsState];
      if (typeof value === "number") {
        runtimeState[runtimeKey] = value;
      }
    }
  }
}
