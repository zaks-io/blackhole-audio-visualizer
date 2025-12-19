export type CameraMode = "free" | "circle" | "closeup" | "orbit";

export interface CameraPreset {
  id: Exclude<CameraMode, "free">;
  name: string;
  radius: number;
  height: number;
  horizontalSpeed: number;
  verticalOscillation?: {
    amplitude: number;
    speed: number;
  };
}
