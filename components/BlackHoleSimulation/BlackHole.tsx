"use client";

import type { RefObject, MutableRefObject } from "react";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { runtimeState } from "@/lib/runtimeStateRegistry";

interface BlackHoleData {
  positions: THREE.Vector3[];
  masses: number[];
  radii: number[];
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

    const { beatPulse } = runtimeState;
    const bhData = blackHoleDataRef.current;

    if (index < bhData.count) {
      meshRef.current.position.copy(bhData.positions[index]);

      // Use pre-computed radius from parent, apply beat pulse
      const pulse = 1 + (beatIntensityRef.current ?? 0) * beatPulse;
      meshRef.current.scale.setScalar(bhData.radii[index] * pulse);
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
