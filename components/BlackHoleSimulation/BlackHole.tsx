'use client';

import * as THREE from 'three';

interface BlackHoleProps {
  eventHorizonRadius: number;
  showISCO: boolean;
  iscoOpacity: number;
}

export function BlackHole({ eventHorizonRadius, showISCO, iscoOpacity }: BlackHoleProps) {
  const iscoRadius = eventHorizonRadius * 3;

  return (
    <group>
      {/* Event horizon */}
      <mesh>
        <sphereGeometry args={[eventHorizonRadius, 32, 32]} />
        <meshBasicMaterial color="#000000" />
      </mesh>

      {/* ISCO ring - innermost stable circular orbit */}
      {showISCO && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[iscoRadius - 0.05, iscoRadius + 0.05, 64]} />
          <meshBasicMaterial
            color="#ff4400"
            transparent
            opacity={iscoOpacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
    </group>
  );
}
