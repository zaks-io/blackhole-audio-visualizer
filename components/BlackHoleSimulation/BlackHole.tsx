'use client';

interface BlackHoleProps {
  eventHorizonRadius: number;
}

export function BlackHole({ eventHorizonRadius }: BlackHoleProps) {
  return (
    <mesh>
      <sphereGeometry args={[eventHorizonRadius, 32, 32]} />
      <meshBasicMaterial color="#000000" />
    </mesh>
  );
}
