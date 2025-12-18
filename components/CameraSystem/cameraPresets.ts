import type { CameraPreset, CameraMode } from './types';

export const orbitalPreset: CameraPreset = {
  id: 'orbital',
  name: 'Orbital',
  position: [150, 60, 0],
  rotateSpeed: 1,
  rotateAxis: 'horizontal',
};

export const flybyPreset: CameraPreset = {
  id: 'flyby',
  name: 'Flyby',
  position: [80, 20, 80],
  rotateSpeed: 3,
  rotateAxis: 'horizontal',
};

export const topdownPreset: CameraPreset = {
  id: 'topdown',
  name: 'Top View',
  position: [0, 150, 50],
  rotateSpeed: 0.5,
  rotateAxis: 'spherical',
  orbitRadius: 150,
  verticalSpeed: 0.2,
};

export const PRESETS: Record<Exclude<CameraMode, 'free'>, CameraPreset> = {
  orbital: orbitalPreset,
  flyby: flybyPreset,
  topdown: topdownPreset,
};
