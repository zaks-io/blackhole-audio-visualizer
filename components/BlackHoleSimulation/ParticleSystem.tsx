'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGPUCompute } from '@/hooks/useGPUCompute';
import { TEXTURE_SIZE, PARTICLE_COUNT } from '@/lib/gpu/keplerianPhysics';
import particleVertexShader from '@/shaders/particles/particleVertex.glsl';
import particleFragmentShader from '@/shaders/particles/particleFragment.glsl';

interface ParticleSystemProps {
  pointSize: number;
  brightness: number;
  alpha: number;
  innerColor: string;
  outerColor: string;
  maxDistance: number;
  gravitationalParameter: number;
  timeScale: number;
  eventHorizonRadius: number;
  decayRate: number;
  emissionRadius: number;
  spawnDuration: number;
  emitterCount: number;
  eccentricity: number;
  inclination: number;
  omega: number;
}

export function ParticleSystem({
  pointSize,
  brightness,
  alpha,
  innerColor,
  outerColor,
  maxDistance,
  gravitationalParameter,
  timeScale,
  eventHorizonRadius,
  decayRate,
  emissionRadius,
  spawnDuration,
  emitterCount,
  eccentricity,
  inclination,
  omega,
}: ParticleSystemProps) {
  const {
    getPositionTexture,
    setGravitationalParameter,
    setTimeScale,
    setEventHorizon,
    setDecayRate,
    setEmissionRadius,
    setSpawnDuration,
    setEmitterCount,
    setEccentricity,
    setInclination,
    setOmega,
  } = useGPUCompute();
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, references } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const refs = new Float32Array(PARTICLE_COUNT * 2);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;

      const x = (i % TEXTURE_SIZE) / TEXTURE_SIZE;
      const y = Math.floor(i / TEXTURE_SIZE) / TEXTURE_SIZE;
      refs[i * 2] = x;
      refs[i * 2 + 1] = y;
    }

    return { positions: pos, references: refs };
  }, []);

  const uniforms = useMemo(
    () => ({
      texturePosition: { value: null as THREE.Texture | null },
      uPointSize: { value: pointSize },
      uBrightness: { value: brightness },
      uAlpha: { value: alpha },
      uColorInner: { value: new THREE.Color(innerColor) },
      uColorOuter: { value: new THREE.Color(outerColor) },
      uMaxDistance: { value: maxDistance },
      uEventHorizon: { value: eventHorizonRadius },
    }),
    []
  );

  useFrame(() => {
    if (materialRef.current) {
      const texture = getPositionTexture();
      if (texture) {
        materialRef.current.uniforms.texturePosition.value = texture;
      }
      materialRef.current.uniforms.uPointSize.value = pointSize;
      materialRef.current.uniforms.uBrightness.value = brightness;
      materialRef.current.uniforms.uAlpha.value = alpha;
      materialRef.current.uniforms.uColorInner.value.set(innerColor);
      materialRef.current.uniforms.uColorOuter.value.set(outerColor);
      materialRef.current.uniforms.uMaxDistance.value = maxDistance;
      materialRef.current.uniforms.uEventHorizon.value = eventHorizonRadius;
    }
    setGravitationalParameter(gravitationalParameter);
    setTimeScale(timeScale);
    setEventHorizon(eventHorizonRadius);
    setDecayRate(decayRate);
    setEmissionRadius(emissionRadius);
    setSpawnDuration(spawnDuration);
    setEmitterCount(emitterCount);
    setEccentricity(eccentricity);
    setInclination(inclination);
    setOmega(omega);
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={PARTICLE_COUNT}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-reference"
          count={PARTICLE_COUNT}
          array={references}
          itemSize={2}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
