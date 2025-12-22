"use client";

import type { RefObject } from "react";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";

interface BlackHoleProps {
  beatIntensityRef: RefObject<number>;
}

export function BlackHole({ beatIntensityRef }: BlackHoleProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      const state = useVisualizationControls.getState();
      const pulse = 1 + (beatIntensityRef.current ?? 0) * state.beatPulse;
      // Scale based on both radius and beat
      meshRef.current.scale.setScalar(state.eventHorizonRadius * pulse);
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
