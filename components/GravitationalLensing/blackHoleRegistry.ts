import * as THREE from "three";

export interface BlackHoleScreenData {
  positions: THREE.Vector2[];
  radii: number[];
  masses: number[];
  maxMass: number;
  count: number;
}

// Module-level registry for sharing black hole screen positions between
// BlackHoleSimulation and the post-processing lensing effect
export const blackHoleScreenData: BlackHoleScreenData = {
  positions: [new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2(), new THREE.Vector2()],
  radii: [0, 0, 0, 0],
  masses: [0, 0, 0, 0],
  maxMass: 100000,
  count: 0,
};

// Temp vectors for projection (avoid allocations)
const tempVec3 = new THREE.Vector3();
const edgeVec3 = new THREE.Vector3();
const rightVec3 = new THREE.Vector3();

export function updateBlackHoleScreenData(
  worldPositions: THREE.Vector3[],
  worldRadii: number[],
  masses: number[],
  maxMass: number,
  count: number,
  camera: THREE.Camera
): void {
  blackHoleScreenData.count = count;
  blackHoleScreenData.maxMass = maxMass;

  // Get camera right vector for edge projection
  rightVec3.setFromMatrixColumn(camera.matrixWorld, 0);

  for (let i = 0; i < 4; i++) {
    if (i < count) {
      // Project center to NDC
      tempVec3.copy(worldPositions[i]);
      tempVec3.project(camera);

      // If behind camera, clamp to screen edge but keep the effect active
      if (tempVec3.z > 1) {
        // Flip and clamp - behind camera means roughly opposite direction
        const clampedX = Math.max(-1.5, Math.min(1.5, -tempVec3.x));
        const clampedY = Math.max(-1.5, Math.min(1.5, -tempVec3.y));
        blackHoleScreenData.positions[i].set(clampedX * 0.5 + 0.5, clampedY * 0.5 + 0.5);
        // Keep mass and use minimum radius so effect persists
        blackHoleScreenData.radii[i] = 0.02;
        blackHoleScreenData.masses[i] = masses[i];
        continue;
      }

      // Convert from NDC (-1 to 1) to UV (0 to 1)
      // Allow values outside 0-1 for off-screen lensing effects
      blackHoleScreenData.positions[i].set(tempVec3.x * 0.5 + 0.5, tempVec3.y * 0.5 + 0.5);

      // Project edge point to get exact screen radius
      edgeVec3.copy(worldPositions[i]);
      edgeVec3.addScaledVector(rightVec3, worldRadii[i]);
      edgeVec3.project(camera);

      // Use distance in screen space (not just X) for robustness at all angles
      const dx = (edgeVec3.x - tempVec3.x) * 0.5;
      const dy = (edgeVec3.y - tempVec3.y) * 0.5;
      const rawRadius = Math.sqrt(dx * dx + dy * dy);

      // Clamp to reasonable range with minimum to prevent effect disappearing
      const screenRadius = Math.max(Math.min(rawRadius, 0.5), 0.01);
      blackHoleScreenData.radii[i] = screenRadius;
      blackHoleScreenData.masses[i] = masses[i];
    } else {
      blackHoleScreenData.positions[i].set(0, 0);
      blackHoleScreenData.radii[i] = 0;
      blackHoleScreenData.masses[i] = 0;
    }
  }
}
