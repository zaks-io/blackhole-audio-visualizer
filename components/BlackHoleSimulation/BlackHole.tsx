"use client";

import type { RefObject, MutableRefObject } from "react";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { runtimeState } from "@/lib/runtimeStateRegistry";

interface BlackHoleData {
  positions: THREE.Vector3[];
  masses: number[];
  count: number;
}

interface BlackHoleProps {
  beatIntensityRef: RefObject<number>;
  blackHoleDataRef: MutableRefObject<BlackHoleData | null>;
  index: number;
}

export function BlackHole({ beatIntensityRef, blackHoleDataRef, index }: BlackHoleProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current || !blackHoleDataRef.current) return;

    // Read from runtimeState instead of store for performance during tweens
    const { eventHorizonRadius, beatPulse, gravity, blackHoleMassMax } = runtimeState;
    const bhData = blackHoleDataRef.current;

    // Use pre-computed position from parent (already calculated in BlackHoleSimulation.useFrame)
    if (index < bhData.count) {
      meshRef.current.position.copy(bhData.positions[index]);

      // Calculate scale from mass - mass is already computed by parent
      const mass = bhData.masses[index];
      const massRatio = gravity > 0 ? mass / (gravity * blackHoleMassMax) : 1;

      // Update scale with beat pulse
      const pulse = 1 + (beatIntensityRef.current ?? 0) * beatPulse;
      meshRef.current.scale.setScalar(eventHorizonRadius * massRatio * pulse);
    }
  });

  return (
    <mesh ref={meshRef}>
      {/* Use unit sphere and scale it */}
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#000000" />
    </mesh>
  );
}
