export type CameraMode = "free" | "orbital" | "flyby" | "topdown";

export type RotateAxis = "horizontal" | "spherical";

export interface CameraPreset {
  id: Exclude<CameraMode, "free">;
  name: string;
  position: [number, number, number];
  rotateSpeed: number;
  rotateAxis: RotateAxis;
  orbitRadius?: number;
  verticalSpeed?: number;
  startingAngles?: { horizontal: number; vertical: number };
}
