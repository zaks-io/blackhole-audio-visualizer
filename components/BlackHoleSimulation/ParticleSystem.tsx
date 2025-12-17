'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGPUCompute } from '@/hooks/useGPUCompute';
import { TEXTURE_SIZE, PARTICLE_COUNT } from '@/lib/gpu/verletPhysics';
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
  softening: number;
  orbitDecay: number;
  emissionRadius: number;
  emitterCount: number;
  emitterAngle: number;
  emitterTilt: number;
  spawnRate: number;
  inwardAngle: number;
  iscoRadius: number;
  iscoStrength: number;
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
  softening,
  orbitDecay,
  emissionRadius,
  emitterCount,
  emitterAngle,
  emitterTilt,
  spawnRate,
  inwardAngle,
  iscoRadius,
  iscoStrength,
}: ParticleSystemProps) {
  const {
    getPositionTexture,
    getVelocityTexture,
    setGravitationalParameter,
    setTimeScale,
    setEventHorizon,
    setSoftening,
    setOrbitDecay,
    setEmissionRadius,
    setEmitterCount,
    setEmitterAngle,
    setEmitterTilt,
    setSpawnRate,
    setInwardAngle,
    setISCORadius,
    setISCOStrength,
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
      textureVelocity: { value: null as THREE.Texture | null },
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
      const posTexture = getPositionTexture();
      const velTexture = getVelocityTexture();
      if (posTexture) {
        materialRef.current.uniforms.texturePosition.value = posTexture;
      }
      if (velTexture) {
        materialRef.current.uniforms.textureVelocity.value = velTexture;
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
    setSoftening(softening);
    setOrbitDecay(orbitDecay);
    setEmissionRadius(emissionRadius);
    setEmitterCount(emitterCount);
    setEmitterAngle(emitterAngle);
    setEmitterTilt(emitterTilt);
    setSpawnRate(spawnRate);
    setInwardAngle(inwardAngle);
    setISCORadius(iscoRadius);
    setISCOStrength(iscoStrength);
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
