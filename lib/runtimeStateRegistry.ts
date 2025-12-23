// Runtime visualization state - bypasses React for frame-by-frame reads
// This mutable object is updated by GPU setters during tweens and synced from the store for user changes
// IMPORTANT: Heavy 3D components should ONLY read from runtimeState, never subscribe to Zustand

import type { VisualizationControlsState } from "@/hooks/useVisualizationControls";

// Runtime state containing all values that render loops need
// These values are mutated directly for performance during tweens
export const runtimeState = {
  // Black Hole
  eventHorizonRadius: 5,
  iscoRatio: 3.0,
  beatPulse: 2,
  blackHoleCount: 3,
  orbitRadius: 25,
  orbitSpeed: 0.3,
  blackHoleMassMin: 0.3,
  blackHoleMassMax: 1.0,

  // Particles / Render
  pointSize: 1.0,
  brightness: 1.5,
  alpha: 0.3,
  maxDistance: 60,
  motionBlurTaper: 0.2,
  motionBlurFade: 0.5,
  colorPaletteOffset: 0, // Palette offset for GPU - updated via callGPUSetter

  // Physics
  gravity: 100000,
  timeScale: 5.0,
  softening: 1.0,
  orbitDecay: 1,
  iscoStrength: 0.5,
  lifetimeGracePeriod: 90,
  lifetimeMax: 60,
  lifetimeGravityMultiplier: 10,

  // Emitters
  emitRadius: 200,
  emitterCount: 12,
  emitterAngle: 0,
  emitterTilt: 0,
  inwardAngle: 0,
  spawnRate: 5000,
  emitterSpread: 0,

  // Audio
  amplitude: 10,
  audioGain: 2,
  beatRepulsion: 20,

  // Post-Processing
  bloomBaseIntensity: 1,
  bloomAudioReactivity: 1,
  chromaticAudioReactivity: 1,
  vignetteOffset: 0.5,
  vignetteDarkness: 0.5,
  hfcVelocityBoost: 0.2,
  spawnBurstMultiplier: 15.0,
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

  // Particles
  "Particles.pointSize": "pointSize",
  "Particles.brightness": "brightness",
  "Particles.alpha": "alpha",
  "Particles.maxDistance": "maxDistance",
  "Particles.motionBlurTaper": "motionBlurTaper",
  "Particles.motionBlurFade": "motionBlurFade",
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

  // Emitters
  "Emitters.emitRadius": "emitRadius",
  "Emitters.emitterCount": "emitterCount",
  "Emitters.emitterAngle": "emitterAngle",
  "Emitters.emitterTilt": "emitterTilt",
  "Emitters.inwardAngle": "inwardAngle",
  "Emitters.spawnRate": "spawnRate",
  "Emitters.emitterSpread": "emitterSpread",

  // Audio
  "Audio.amplitude": "amplitude",
  "Audio.audioGain": "audioGain",
  "Audio.beatRepulsion": "beatRepulsion",

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

  // Particles
  pointSize: "pointSize",
  brightness: "brightness",
  alpha: "alpha",
  maxDistance: "maxDistance",
  motionBlurTaper: "motionBlurTaper",
  motionBlurFade: "motionBlurFade",
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

  // Emitters
  emitRadius: "emitRadius",
  emitterCount: "emitterCount",
  emitterAngle: "emitterAngle",
  emitterTilt: "emitterTilt",
  inwardAngle: "inwardAngle",
  spawnRate: "spawnRate",
  emitterSpread: "emitterSpread",

  // Audio
  amplitude: "amplitude",
  audioGain: "audioGain",
  beatRepulsion: "beatRepulsion",

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
