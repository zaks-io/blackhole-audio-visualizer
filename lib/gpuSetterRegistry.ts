// Registry for GPU setter functions - allows direct GSAP → GPU communication
// bypassing React state during animations for better performance

type GPUSetter = (value: number) => void;

const gpuSetters = new Map<string, GPUSetter>();

export function registerGPUSetter(path: string, setter: GPUSetter) {
  gpuSetters.set(path, setter);
}

export function unregisterGPUSetter(path: string) {
  gpuSetters.delete(path);
}

export function callGPUSetter(path: string, value: number): boolean {
  const setter = gpuSetters.get(path);
  if (setter) {
    setter(value);
    return true;
  }
  return false;
}

export function clearGPUSetters() {
  gpuSetters.clear();
}
