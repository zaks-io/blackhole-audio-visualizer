import type { CameraPreset, CameraMode } from "./types";

export const circlePreset: CameraPreset = {
  id: "circle",
  name: "Circle",
  radius: 220,
  height: 80,
  horizontalSpeed: 0.15,
};

export const closeupPreset: CameraPreset = {
  id: "closeup",
  name: "Close Up",
  radius: 71,
  height: 15,
  horizontalSpeed: -0.45,
};

export const orbitPreset: CameraPreset = {
  id: "orbit",
  name: "Orbit",
  radius: 150,
  height: 75,
  horizontalSpeed: 0.5,
  verticalOscillation: {
    amplitude: 70,
    speed: 0.2,
  },
};

export const PRESETS: Record<Exclude<CameraMode, "free">, CameraPreset> = {
  circle: circlePreset,
  closeup: closeupPreset,
  orbit: orbitPreset,
};
