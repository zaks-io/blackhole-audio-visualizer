export type CameraMode = "free" | "circle" | "closeup" | "orbit" | "edge";

export interface CameraPreset {
  id: Exclude<CameraMode, "free">;
  name: string;
  radius: number;
  phi: number;
  horizontalSpeed: number;
  verticalOscillation?: {
    amplitude: number;
    speed: number;
  };
}
