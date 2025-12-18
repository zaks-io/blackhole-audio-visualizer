'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface BlackHoleProps {
  eventHorizonRadius: number;
  beatIntensity?: number;
  beatPulse?: number;
}

export function BlackHole({ eventHorizonRadius, beatIntensity = 0, beatPulse = 0.3 }: BlackHoleProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (meshRef.current) {
      const pulse = 1 + beatIntensity * beatPulse;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[eventHorizonRadius, 32, 32]} />
      <meshBasicMaterial color="#000000" />
    </mesh>
  );
}
