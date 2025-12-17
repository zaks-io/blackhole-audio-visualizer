'use client';

import { OrbitControls } from '@react-three/drei';
import { useControls, folder } from 'leva';
import { ParticleSystem } from './ParticleSystem';
import { BlackHole } from './BlackHole';

export function BlackHoleSimulation() {
  const blackHoleControls = useControls('Black Hole', {
    eventHorizonRadius: { value: 1.5, min: 0.5, max: 5, step: 0.1 },
    showISCO: true,
    iscoOpacity: { value: 0.3, min: 0, max: 1, step: 0.05 },
  });

  const particleControls = useControls('Particles', {
    pointSize: { value: 0.5, min: 0.1, max: 10, step: 0.1 },
    brightness: { value: 0.5, min: 0.1, max: 2, step: 0.1 },
    alpha: { value: 0.08, min: 0.01, max: 0.5, step: 0.01 },
    innerColor: '#ff6600',
    outerColor: '#0066ff',
    maxDistance: { value: 20, min: 5, max: 50, step: 1 },
  });

  const physicsControls = useControls('Physics', {
    gravitationalParameter: { value: 100, min: 10, max: 500, step: 10 },
    timeScale: { value: 0.5, min: 0.1, max: 2, step: 0.1 },
    decayRate: { value: 0.3, min: 0.01, max: 2, step: 0.01 },
  });

  return (
    <>
      <color attach="background" args={['#000000']} />

      <ParticleSystem
        pointSize={particleControls.pointSize}
        brightness={particleControls.brightness}
        alpha={particleControls.alpha}
        innerColor={particleControls.innerColor}
        outerColor={particleControls.outerColor}
        maxDistance={particleControls.maxDistance}
        gravitationalParameter={physicsControls.gravitationalParameter}
        timeScale={physicsControls.timeScale}
        eventHorizonRadius={blackHoleControls.eventHorizonRadius}
        decayRate={physicsControls.decayRate}
      />
      <BlackHole
        eventHorizonRadius={blackHoleControls.eventHorizonRadius}
        showISCO={blackHoleControls.showISCO}
        iscoOpacity={blackHoleControls.iscoOpacity}
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={100}
      />
    </>
  );
}
