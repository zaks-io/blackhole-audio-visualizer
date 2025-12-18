import type { CameraPreset, CameraMode } from "./types";

export const circlePreset: CameraPreset = {
  id: "circle",
  name: "Circle",
  position: [220, 80, 0],
  rotateSpeed: 1,
  rotateAxis: "horizontal",
};

export const closeupPreset: CameraPreset = {
  id: "closeup",
  name: "Close Up",
  position: [50, 15, 50],
  rotateSpeed: -3,
  rotateAxis: "horizontal",
};

export const orbitPreset: CameraPreset = {
  id: "orbit",
  name: "Orbit",
  position: [0, 150, 50], // Fallback, actual position computed from startingAngles
  rotateSpeed: 0.5,
  rotateAxis: "spherical",
  orbitRadius: 150,
  verticalSpeed: 0.2,
  startingAngles: { horizontal: 0, vertical: -Math.PI / 2 },
};

export const PRESETS: Record<Exclude<CameraMode, "free">, CameraPreset> = {
  circle: circlePreset,
  closeup: closeupPreset,
  orbit: orbitPreset,
};
