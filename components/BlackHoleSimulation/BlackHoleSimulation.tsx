'use client';

import { OrbitControls } from '@react-three/drei';
import { useControls, folder } from 'leva';
import { ParticleSystem } from './ParticleSystem';
import { BlackHole } from './BlackHole';

export function BlackHoleSimulation() {
  const blackHoleControls = useControls('Black Hole', {
    eventHorizonRadius: { value: 1.5, min: 0.5, max: 5, step: 0.1 },
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
    gravity: { value: 100, min: 10, max: 500, step: 10 },
    timeScale: { value: 0.5, min: 0.1, max: 2, step: 0.1 },
    spiralSpeed: { value: 0.5, min: 0.01, max: 2, step: 0.01 },
    emitRadius: { value: 20, min: 10, max: 40, step: 1 },
    spawnTime: { value: 5, min: 1, max: 15, step: 0.5 },
    emitters: { value: 12, min: 4, max: 36, step: 1 },
    eccentricity: { value: 0, min: 0, max: 0.5, step: 0.01 },
    inclination: { value: 0, min: 0, max: 0.5, step: 0.01 },
    omega: { value: 0, min: 0, max: 6.28, step: 0.1 },
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
        gravitationalParameter={physicsControls.gravity}
        timeScale={physicsControls.timeScale}
        eventHorizonRadius={blackHoleControls.eventHorizonRadius}
        decayRate={physicsControls.spiralSpeed}
        emissionRadius={physicsControls.emitRadius}
        spawnDuration={physicsControls.spawnTime}
        emitterCount={physicsControls.emitters}
        eccentricity={physicsControls.eccentricity}
        inclination={physicsControls.inclination}
        omega={physicsControls.omega}
      />
      <BlackHole eventHorizonRadius={blackHoleControls.eventHorizonRadius} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={100}
      />
    </>
  );
}
