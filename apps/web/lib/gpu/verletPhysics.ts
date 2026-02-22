import * as THREE from "three";

export const DEFAULT_TEXTURE_SIZE = 512;
export const EMISSION_RADIUS = 20.0;
export const DEFAULT_GM = 100000.0;
export const DEFAULT_SOFTENING = 0.5;

/**
 * Create initial position texture for Verlet integration.
 * Particles wait at origin with staggered spawn times.
 * Format: (x, y, z, lifetime) - negative lifetime = waiting to spawn
 */
export function createInitialPositionTexture(
  textureSize: number,
  emissionRadius: number = EMISSION_RADIUS
): THREE.DataTexture {
  const particleCount = textureSize * textureSize;
  const data = new Float32Array(particleCount * 4);

  // Deterministic pseudo-random in [0,1). We avoid perfect stratification because it creates
  // visibly regular spacing/banding when lots of particles converge into thin streams.
  const rand01 = (i: number) => {
    // splitmix32-ish hash
    let x = (i + 1) >>> 0;
    x ^= x >>> 16;
    x = Math.imul(x, 0x7feb352d);
    x ^= x >>> 15;
    x = Math.imul(x, 0x846ca68b);
    x ^= x >>> 16;
    return (x >>> 0) / 4294967296;
  };

  for (let i = 0; i < particleCount; i++) {
    const i4 = i * 4;

    // All start at origin (hidden), waiting to spawn
    data[i4 + 0] = 0;
    data[i4 + 1] = 0;
    data[i4 + 2] = 0;

    // Randomize initial queue position (negative lifetime = waiting).
    // NOTE: previous implementation used a permutation (perfectly even spacing),
    // which can create unnatural, static banding/lanes at high density.
    data[i4 + 3] = -rand01(i);
  }

  const texture = new THREE.DataTexture(
    data,
    textureSize,
    textureSize,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  texture.needsUpdate = true;

  return texture;
}

/**
 * Create initial velocity texture for Verlet integration.
 * Particles start with circular orbital velocity tangent to their position.
 * Format: (vx, vy, vz, mass)
 */
export function createInitialVelocityTexture(
  textureSize: number,
  positionTexture: THREE.DataTexture,
  gravitationalParameter: number = DEFAULT_GM
): THREE.DataTexture {
  const particleCount = textureSize * textureSize;
  const data = new Float32Array(particleCount * 4);
  const posData = positionTexture.image.data as Float32Array;

  for (let i = 0; i < particleCount; i++) {
    const i4 = i * 4;

    // Get position from position texture
    const x = posData[i4 + 0];
    const z = posData[i4 + 2];
    const r = Math.sqrt(x * x + z * z);

    // Orbital velocity magnitude at this radius
    const vMag = r > 0.1 ? Math.sqrt(gravitationalParameter / r) : 0;

    // Tangent direction: perpendicular to position, counterclockwise
    // For (x, 0, z), tangent is (-z, 0, x) normalized
    const len = Math.sqrt(x * x + z * z);
    const tx = len > 0.01 ? -z / len : 0;
    const tz = len > 0.01 ? x / len : 0;

    data[i4 + 0] = tx * vMag;
    data[i4 + 1] = 0;
    data[i4 + 2] = tz * vMag;
    data[i4 + 3] = 1.0;
  }

  const texture = new THREE.DataTexture(
    data,
    textureSize,
    textureSize,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  texture.needsUpdate = true;

  return texture;
}
