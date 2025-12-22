"use client";

import type { RefObject } from "react";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";

interface BlackHoleProps {
  beatIntensityRef: RefObject<number>;
  index: number;
}

export function BlackHole({ beatIntensityRef, index }: BlackHoleProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      const controls = useVisualizationControls.getState();
      const {
        blackHoleCount,
        orbitRadius,
        orbitSpeed,
        eventHorizonRadius,
        beatPulse,
        blackHoleMassMin,
        blackHoleMassMax,
      } = controls;

      // Calculate mass ratio for this black hole (interpolate from max to min)
      const t = blackHoleCount > 1 ? index / (blackHoleCount - 1) : 0;
      const massRatio = blackHoleMassMax - t * (blackHoleMassMax - blackHoleMassMin);

      // Calculate position for this black hole
      let x = 0,
        z = 0;

      if (blackHoleCount > 1) {
        // Calculate average mass ratio for barycenter adjustment
        let totalMassRatio = 0;
        for (let i = 0; i < blackHoleCount; i++) {
          const ti = i / (blackHoleCount - 1);
          totalMassRatio += blackHoleMassMax - ti * (blackHoleMassMax - blackHoleMassMin);
        }
        const avgMassRatio = totalMassRatio / blackHoleCount;

        // Orbit radius inversely proportional to mass (heavier = closer to center)
        const adjustedRadius = orbitRadius * (avgMassRatio / massRatio);

        const angleStep = (2 * Math.PI) / blackHoleCount;
        const angle = state.clock.elapsedTime * orbitSpeed + index * angleStep;
        x = Math.cos(angle) * adjustedRadius;
        z = Math.sin(angle) * adjustedRadius;
      }

      // Update position
      meshRef.current.position.set(x, 0, z);

      // Update scale with beat pulse - event horizon scales with mass
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
