'use client';

import { useMemo } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useControls } from 'leva';
import { ParticleSystem } from './ParticleSystem';
import { BlackHole } from './BlackHole';

export function BlackHoleSimulation() {
  const blackHoleControls = useControls('Black Hole', {
    eventHorizonRadius: { value: 3.0, min: 0.5, max: 20, step: 0.5 },
  });

  const particleControls = useControls('Particles', {
    pointSize: { value: 1.0, min: 0.1, max: 20, step: 0.1 },
    brightness: { value: 1.5, min: 0.1, max: 5, step: 0.1 },
    alpha: { value: 0.8, min: 0.01, max: 1.0, step: 0.01 },
    innerColor: '#ff6600',
    outerColor: '#0066ff',
    maxDistance: { value: 60, min: 5, max: 150, step: 1 },
  });

  const physicsControls = useControls('Physics', {
    gravity: { value: 100000, min: 1000, max: 1000000, step: 10000 },
    timeScale: { value: 5.0, min: 0.1, max: 30, step: 0.1 },
    softening: { value: 1.0, min: 0.01, max: 10, step: 0.1 },
    orbitDecay: { value: 2.0, min: 0, max: 20.0, step: 0.5 },
  });

  const emitterControls = useControls('Emitters', {
    emitRadius: { value: 60, min: 5, max: 200, step: 1 },
    emitterCount: { value: 1, min: 1, max: 36, step: 1 },
    emitterAngle: { value: 0, min: 0, max: 6.28, step: 0.1 },
    emitterTilt: { value: 0, min: -30, max: 30, step: 1 },
    inwardAngle: { value: 0, min: -1, max: 1, step: 0.01 },
    spawnRate: { value: 1.0, min: 0.1, max: 10, step: 0.1 },
    showEmitters: { value: true },
  });

  const emitterPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < emitterControls.emitterCount; i++) {
      const baseAngle = (i * Math.PI * 2) / emitterControls.emitterCount;
      const angle = baseAngle + emitterControls.emitterAngle;
      const x = emitterControls.emitRadius * Math.cos(angle);
      const z = emitterControls.emitRadius * Math.sin(angle);
      const y = Math.sin(angle) * emitterControls.emitterTilt;
      positions.push([x, y, z]);
    }
    return positions;
  }, [emitterControls.emitRadius, emitterControls.emitterCount, emitterControls.emitterAngle, emitterControls.emitterTilt]);

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
        orbitDecay={physicsControls.orbitDecay}
        emissionRadius={emitterControls.emitRadius}
        emitterCount={emitterControls.emitterCount}
        emitterAngle={emitterControls.emitterAngle}
        emitterTilt={emitterControls.emitterTilt}
        spawnRate={emitterControls.spawnRate}
        inwardAngle={emitterControls.inwardAngle}
      />
      <BlackHole eventHorizonRadius={blackHoleControls.eventHorizonRadius} />

      {/* Emitter position indicators */}
      {emitterControls.showEmitters &&
        emitterPositions.map((pos, i) => (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial color="#00ff00" />
          </mesh>
        ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={500}
      />
    </>
  );
}
