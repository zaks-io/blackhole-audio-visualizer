import type { CameraPreset, CameraMode } from "./types";

export const circlePreset: CameraPreset = {
  id: "circle",
  name: "Circle",
  radius: 220,
  phi: 1.2,
  horizontalSpeed: 0.15,
};

export const closeupPreset: CameraPreset = {
  id: "closeup",
  name: "Close Up",
  radius: 71,
  phi: 1.36,
  horizontalSpeed: -0.45,
};

export const orbitPreset: CameraPreset = {
  id: "orbit",
  name: "Orbit",
  radius: 150,
  phi: 1.55,
  horizontalSpeed: 0.5,
  verticalOscillation: {
    amplitude: 1.25,
    speed: 0.2,
  },
};

export const edgePreset: CameraPreset = {
  id: "edge",
  name: "Edge",
  radius: 300,
  phi: 1.5708,
  horizontalSpeed: 0.1,
};

export const PRESETS: Record<Exclude<CameraMode, "free">, CameraPreset> = {
  circle: circlePreset,
  closeup: closeupPreset,
  orbit: orbitPreset,
  edge: edgePreset,
};
