// Runtime visualization state - bypasses React for frame-by-frame reads
// This mutable object is updated by GPU setters during tweens and synced from the store for user changes

import { pathToKey, type VisualizationControlsState } from "@/hooks/useVisualizationControls";

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

  // Physics
  gravity: 100000,
  timeScale: 5.0,
  softening: 1.0,
  orbitDecay: 1,
  iscoStrength: 0.5,
  lifetimeGracePeriod: 30,
  lifetimeMax: 60,
  lifetimeGravityMultiplier: 3.0,

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
  bloomBaseIntensity: 0.5,
  bloomAudioReactivity: 1,
  chromaticAudioReactivity: 1,
  vignetteOffset: 0.5,
  vignetteDarkness: 0.5,
  hfcVelocityBoost: 0.2,
  spawnBurstMultiplier: 2.0,
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

// Sync all values from visualization store state to runtime state
// Called on store subscription to keep runtime state in sync with user changes
export function syncFromStore(state: VisualizationControlsState) {
  for (const [path, runtimeKey] of Object.entries(runtimePathToKey)) {
    const storeKey = pathToKey[path];
    if (storeKey && typeof state[storeKey] === "number") {
      runtimeState[runtimeKey] = state[storeKey] as number;
    }
  }
}
