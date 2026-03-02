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
const cameraSpaceVec3 = new THREE.Vector3();

const MIN_SCREEN_RADIUS = 0.0025;
const MAX_SCREEN_RADIUS = 0.45;
const NEAR_PLANE_GUARD_MULTIPLIER = 1.05;

export function updateBlackHoleScreenData(
  worldPositions: THREE.Vector3[],
  worldRadii: number[],
  masses: number[],
  maxMass: number,
  count: number,
  camera: THREE.Camera
): void {
  const clampedCount = Math.max(0, Math.min(count, 4));
  blackHoleScreenData.count = clampedCount;
  blackHoleScreenData.maxMass = Math.max(maxMass, 1);

  // Get camera right vector for edge projection
  rightVec3.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
  const perspectiveCamera = camera as THREE.PerspectiveCamera;
  const near = perspectiveCamera.isPerspectiveCamera ? perspectiveCamera.near : 0.1;
  const nearGuard = near * NEAR_PLANE_GUARD_MULTIPLIER;

  for (let i = 0; i < 4; i++) {
    if (i < clampedCount) {
      // Disable lensing when the BH is behind (or too close to) the camera plane.
      cameraSpaceVec3.copy(worldPositions[i]).applyMatrix4(camera.matrixWorldInverse);
      const depth = -cameraSpaceVec3.z;
      if (!Number.isFinite(depth) || depth <= nearGuard) {
        blackHoleScreenData.positions[i].set(0, 0);
        blackHoleScreenData.radii[i] = 0;
        blackHoleScreenData.masses[i] = 0;
        continue;
      }

      // Project center to NDC
      tempVec3.copy(worldPositions[i]);
      tempVec3.project(camera);

      if (!Number.isFinite(tempVec3.x) || !Number.isFinite(tempVec3.y)) {
        blackHoleScreenData.positions[i].set(0, 0);
        blackHoleScreenData.radii[i] = 0;
        blackHoleScreenData.masses[i] = 0;
        continue;
      }

      // Convert from NDC (-1 to 1) to UV (0 to 1)
      // Keep some off-screen range for edge lensing, but clamp runaway values.
      const clampedX = Math.max(-2, Math.min(2, tempVec3.x));
      const clampedY = Math.max(-2, Math.min(2, tempVec3.y));
      blackHoleScreenData.positions[i].set(clampedX * 0.5 + 0.5, clampedY * 0.5 + 0.5);

      // Project edge point to get exact screen radius
      edgeVec3.copy(worldPositions[i]);
      edgeVec3.addScaledVector(rightVec3, Math.max(worldRadii[i], 0));
      edgeVec3.project(camera);

      if (!Number.isFinite(edgeVec3.x) || !Number.isFinite(edgeVec3.y)) {
        blackHoleScreenData.radii[i] = MIN_SCREEN_RADIUS;
        blackHoleScreenData.masses[i] = Math.max(masses[i], 0);
        continue;
      }

      // Use distance in screen space (not just X) for robustness at all angles.
      const dx = (edgeVec3.x - tempVec3.x) * 0.5;
      const dy = (edgeVec3.y - tempVec3.y) * 0.5;
      const rawRadius = Math.sqrt(dx * dx + dy * dy);

      // Preserve visual alignment with the rendered BH while guarding against
      // near-camera explosions in post lensing.
      const screenRadius = Math.max(Math.min(rawRadius, MAX_SCREEN_RADIUS), MIN_SCREEN_RADIUS);
      blackHoleScreenData.radii[i] = screenRadius;
      blackHoleScreenData.masses[i] = Math.max(masses[i], 0);
    } else {
      blackHoleScreenData.positions[i].set(0, 0);
      blackHoleScreenData.radii[i] = 0;
      blackHoleScreenData.masses[i] = 0;
    }
  }
}
