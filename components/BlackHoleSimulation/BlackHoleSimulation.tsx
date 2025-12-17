'use client';

import { OrbitControls } from '@react-three/drei';
import { useControls } from 'leva';
import { ParticleSystem } from './ParticleSystem';
import { BlackHole } from './BlackHole';

export function BlackHoleSimulation() {
  const blackHoleControls = useControls('Black Hole', {
    eventHorizonRadius: { value: 3.0, min: 1.0, max: 8, step: 0.5 },
  });

  const particleControls = useControls('Particles', {
    pointSize: { value: 1.0, min: 0.1, max: 20, step: 0.1 },
    brightness: { value: 1.5, min: 0.1, max: 3, step: 0.1 },
    alpha: { value: 0.8, min: 0.01, max: 1.0, step: 0.01 },
    innerColor: '#ff6600',
    outerColor: '#0066ff',
    maxDistance: { value: 30, min: 5, max: 50, step: 1 },
  });

  const physicsControls = useControls('Physics', {
    gravity: { value: 30000, min: 1000, max: 100000, step: 1000 },
    timeScale: { value: 5.0, min: 0.5, max: 20, step: 0.5 },
    softening: { value: 1.0, min: 0.1, max: 5, step: 0.1 },
    drag: { value: 0.05, min: 0, max: 0.5, step: 0.01 },
    emitRadius: { value: 20, min: 5, max: 40, step: 1 },
    emitters: { value: 1, min: 1, max: 36, step: 1 },
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
        softening={physicsControls.softening}
        drag={physicsControls.drag}
        emissionRadius={physicsControls.emitRadius}
        emitterCount={physicsControls.emitters}
      />
      <BlackHole eventHorizonRadius={blackHoleControls.eventHorizonRadius} />

      {/* Emitter position indicator */}
      <mesh position={[physicsControls.emitRadius, 0, 0]}>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshBasicMaterial color="#00ff00" />
      </mesh>

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={100}
      />
    </>
  );
}
