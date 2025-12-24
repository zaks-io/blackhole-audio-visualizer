"use client";

import type { MutableRefObject } from "react";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface BlackHoleData {
  positions: THREE.Vector3[];
  masses: number[];
  radii: number[];
  count: number;
}

interface BlackHoleProps {
  blackHoleDataRef: MutableRefObject<BlackHoleData | null>;
  index: number;
}

export function BlackHole({ blackHoleDataRef, index }: BlackHoleProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current || !blackHoleDataRef.current) return;

    const bhData = blackHoleDataRef.current;

    if (index < bhData.count) {
      meshRef.current.position.copy(bhData.positions[index]);
      // Radius already includes pulse from BlackHoleSimulation
      meshRef.current.scale.setScalar(bhData.radii[index]);
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
