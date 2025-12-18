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

  // Audio
  amplitude: number;
  onsetDecay: number;
  audioGain: number;
  beatRepulsion: number;
  autoColorChange: boolean;
}

interface VisualizationControlsActions {
  set: <K extends keyof VisualizationControlsState>(
    key: K,
    value: VisualizationControlsState[K]
  ) => void;
  get: <K extends keyof VisualizationControlsState>(key: K) => VisualizationControlsState[K];
  setByPath: (path: string, value: unknown) => void;
  getByPath: (path: string) => unknown;
}

export type VisualizationControlsStore = VisualizationControlsState & VisualizationControlsActions;

const pathToKey: Record<string, keyof VisualizationControlsState> = {
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
  "Emitters.emitRadius": "emitRadius",
  "Emitters.emitterCount": "emitterCount",
  "Emitters.emitterAngle": "emitterAngle",
  "Emitters.emitterTilt": "emitterTilt",
  "Emitters.inwardAngle": "inwardAngle",
  "Emitters.spawnRate": "spawnRate",
  "Emitters.emitterSpread": "emitterSpread",
  "Emitters.showEmitters": "showEmitters",
  "Skybox.skybox": "skybox",
  "Audio.amplitude": "amplitude",
  "Audio.onsetDecay": "onsetDecay",
  "Audio.audioGain": "audioGain",
  "Audio.beatRepulsion": "beatRepulsion",
  "Audio.autoColorChange": "autoColorChange",
};

export const useVisualizationControls = create<VisualizationControlsStore>((set, get) => ({
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

  // Emitters defaults
  emitRadius: 200,
  emitterCount: 36,
  emitterAngle: 0,
  emitterTilt: 0,
  inwardAngle: 0,
  spawnRate: 1.0,
  emitterSpread: 0,
  showEmitters: false,

  // Skybox defaults
  skybox: "Hazy Nebulae",

  // Audio defaults
  amplitude: 5,
  onsetDecay: 0.92,
  audioGain: 2,
  beatRepulsion: 20,
  autoColorChange: true,

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
}));
