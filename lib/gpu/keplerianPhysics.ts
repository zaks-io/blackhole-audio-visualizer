import * as THREE from 'three';

export const TEXTURE_SIZE = 256;
export const PARTICLE_COUNT = TEXTURE_SIZE * TEXTURE_SIZE;

export const EMISSION_RADIUS = 20.0;

export function createOrbitalElementsTexture(): THREE.DataTexture {
  const data = new Float32Array(PARTICLE_COUNT * 4);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i4 = i * 4;

    // All particles start at emission ring radius
    const a = EMISSION_RADIUS;

    // Eccentricity: low for nearly circular orbits
    const e = Math.pow(Math.random(), 2) * 0.1;

    // Inclination: tight disk, -15 to +15 degrees
    const i_rad = (Math.random() - 0.5) * (Math.PI / 6);

    // Argument of periapsis: uniform 0 to 2π
    const omega = Math.random() * Math.PI * 2;

    data[i4 + 0] = a;
    data[i4 + 1] = e;
    data[i4 + 2] = i_rad;
    data[i4 + 3] = omega;
  }

  const texture = new THREE.DataTexture(
    data,
    TEXTURE_SIZE,
    TEXTURE_SIZE,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  texture.needsUpdate = true;

  return texture;
}

function gaussianRandom(): number {
  // Box-Muller transform for gaussian distribution
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function createPhaseTexture(): THREE.DataTexture {
  const data = new Float32Array(PARTICLE_COUNT * 4);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i4 = i * 4;

    // Longitude of ascending node: uniform 0 to 2π
    const Omega = Math.random() * Math.PI * 2;

    // Initial mean anomaly: uniform 0 to 2π
    const M0 = Math.random() * Math.PI * 2;

    // Spawn delay: 0-1 random value (multiplied by spawn duration in shader)
    const spawnDelay = Math.random();

    data[i4 + 0] = Omega;
    data[i4 + 1] = M0;
    data[i4 + 2] = spawnDelay;
    data[i4 + 3] = 0; // respawn timer (0 = ready to spawn)
  }

  const texture = new THREE.DataTexture(
    data,
    TEXTURE_SIZE,
    TEXTURE_SIZE,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  texture.needsUpdate = true;

  return texture;
}

export function createInitialPositionTexture(
  orbitalElements: THREE.DataTexture,
  phase: THREE.DataTexture
): THREE.DataTexture {
  const data = new Float32Array(PARTICLE_COUNT * 4);
  const elementsData = orbitalElements.image.data as Float32Array;
  const phaseData = phase.image.data as Float32Array;

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i4 = i * 4;

    const a = elementsData[i4 + 0];
    const e = elementsData[i4 + 1];
    const inc = elementsData[i4 + 2];
    const omega = elementsData[i4 + 3];
    const Omega = phaseData[i4 + 0];
    const M0 = phaseData[i4 + 1];

    // Solve Kepler's equation at t=0 (M = M0)
    let E = M0;
    for (let iter = 0; iter < 5; iter++) {
      E = E - (E - e * Math.sin(E) - M0) / (1 - e * Math.cos(E));
    }

    // True anomaly from eccentric anomaly
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);
    const cosNu = (cosE - e) / (1 - e * cosE);
    const sinNu = (Math.sqrt(1 - e * e) * sinE) / (1 - e * cosE);
    const nu = Math.atan2(sinNu, cosNu);

    // Radius
    const r = (a * (1 - e * e)) / (1 + e * Math.cos(nu));

    // Position in orbital plane
    const x_orb = r * Math.cos(nu);
    const y_orb = r * Math.sin(nu);

    // Rotation matrix components
    const cosOmega = Math.cos(Omega);
    const sinOmega = Math.sin(Omega);
    const cosInc = Math.cos(inc);
    const sinInc = Math.sin(inc);
    const cosOmegaSmall = Math.cos(omega);
    const sinOmegaSmall = Math.sin(omega);

    // Transform to 3D
    const x =
      (cosOmega * cosOmegaSmall - sinOmega * sinOmegaSmall * cosInc) * x_orb +
      (-cosOmega * sinOmegaSmall - sinOmega * cosOmegaSmall * cosInc) * y_orb;
    const y =
      (sinOmega * cosOmegaSmall + cosOmega * sinOmegaSmall * cosInc) * x_orb +
      (-sinOmega * sinOmegaSmall + cosOmega * cosOmegaSmall * cosInc) * y_orb;
    const z = sinOmegaSmall * sinInc * x_orb + cosOmegaSmall * sinInc * y_orb;

    data[i4 + 0] = x;
    data[i4 + 1] = y;
    data[i4 + 2] = z;
    data[i4 + 3] = a; // Store semi-major axis for decay tracking
  }

  const texture = new THREE.DataTexture(
    data,
    TEXTURE_SIZE,
    TEXTURE_SIZE,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  texture.needsUpdate = true;

  return texture;
}
