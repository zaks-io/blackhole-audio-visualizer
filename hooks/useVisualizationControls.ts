import { create } from "zustand";
import type { ColorPaletteId } from "@/components/ColorModeSystem";

export interface VisualizationControlsState {
  // Black Hole
  eventHorizonRadius: number;
  iscoRatio: number;
  beatPulse: number;

  // Particles
  textureSize: number;
  pointSize: number;
  brightness: number;
  alpha: number;
  maxDistance: number;
  colorPalette: ColorPaletteId;

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
  getByPath: (path: string) => unknown;
  reset: () => void;
}

export type VisualizationControlsStore = VisualizationControlsState & VisualizationControlsActions;

export const pathToKey: Record<string, keyof VisualizationControlsState> = {
  "Black Hole.eventHorizonRadius": "eventHorizonRadius",
  "Black Hole.iscoRatio": "iscoRatio",
  "Black Hole.beatPulse": "beatPulse",
  "Particles.textureSize": "textureSize",
  "Particles.pointSize": "pointSize",
  "Particles.brightness": "brightness",
  "Particles.alpha": "alpha",
  "Particles.maxDistance": "maxDistance",
  "Particles.colorPalette": "colorPalette",
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
  // Black Hole defaults
  eventHorizonRadius: 5,
  iscoRatio: 3.0,
  beatPulse: 2,

  // Particles defaults
  textureSize: 512,
  pointSize: 1.0,
  brightness: 1.5,
  alpha: 0.8,
  maxDistance: 60,
  colorPalette: "grayscale" as ColorPaletteId,

  // Physics defaults
  gravity: 100000,
  timeScale: 5.0,
  softening: 1.0,
  orbitDecay: 1,
  iscoStrength: 0.5,
  lifetimeGracePeriod: 30,
  lifetimeMax: 60,
  lifetimeGravityMultiplier: 3.0,

  // Emitters defaults
  emitRadius: 200,
  emitterCount: 12,
  emitterAngle: 0,
  emitterTilt: 0,
  inwardAngle: 0,
  spawnRate: 5000,
  emitterSpread: 0,
  showEmitters: false,

  // Skybox defaults
  skybox: "Procedural Stars",
  starDensity: 20000,
  starBrightness: 0.2,

  // Audio defaults
  amplitude: 10,
  onsetDecay: 0.92,
  audioGain: 2,
  beatRepulsion: 20,
  autoColorChange: true,

  // Post-Processing defaults
  bloomEnabled: true,
  bloomBaseIntensity: 0.1,
  bloomAudioReactivity: 1,
  chromaticEnabled: true,
  chromaticAudioReactivity: 1,
  vignetteEnabled: true,
  vignetteOffset: 0.5,
  vignetteDarkness: 0.5,
  hfcVelocityBoost: 0.3,
  spawnBurstMultiplier: 2.0,
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

  getByPath: (path) => {
    const key = pathToKey[path];
    if (key) {
      return get()[key];
    }
    return undefined;
  },

  reset: () => set(DEFAULT_STATE),
}));
