// Registry for GPU setter functions - allows direct GSAP → GPU communication
// bypassing React state during animations for better performance

import { getParam } from "@blackhole/backend/convex/lib/visualizationParameters";
import { setRuntimeValueByPath } from "./runtimeStateRegistry";

type GPUSetter = (value: number) => void;

const gpuSetters = new Map<string, GPUSetter>();

export function registerGPUSetter(path: string, setter: GPUSetter) {
  gpuSetters.set(path, setter);
}

export function unregisterGPUSetter(path: string) {
  gpuSetters.delete(path);
}

export function callGPUSetter(path: string, value: number): boolean {
  // Clamp to parameter bounds from single source of truth
  const param = getParam(path);
  const clampedValue = param ? Math.max(param.min, Math.min(param.max, value)) : value;

  // Always update runtime state so render loops see the change
  setRuntimeValueByPath(path, clampedValue);

  // Also call specific GPU setter if registered (for compute shader uniforms)
  const setter = gpuSetters.get(path);
  if (setter) {
    setter(clampedValue);
    return true;
  }
  return false;
}

export function clearGPUSetters() {
  gpuSetters.clear();
}
