'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGPUCompute } from '@/hooks/useGPUCompute';
import { TEXTURE_SIZE, PARTICLE_COUNT } from '@/lib/gpu/verletPhysics';
import type { AudioData } from '@/hooks/useMicrophone';
import particleVertexShader from '@/shaders/particles/particleVertex.glsl';
import particleFragmentShader from '@/shaders/particles/particleFragment.glsl';

// 8 distinct primary design colors
const DEFAULT_EMITTER_COLORS = [
  '#ff6b35', // Orange
  '#f7c948', // Yellow
  '#7ed321', // Green
  '#00d4aa', // Teal
  '#4a90d9', // Blue
  '#7b68ee', // Purple
  '#ff69b4', // Pink
  '#ff4757', // Red
];

interface ParticleSystemProps {
  pointSize: number;
  brightness: number;
  alpha: number;
  emitterColors?: string[];
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
  emitterSpread: number;
  audioAmplitude: number;
  getAudioData: (bandCount: number) => AudioData;
  audioEnabled: boolean;
}

export function ParticleSystem({
  pointSize,
  brightness,
  alpha,
  emitterColors = DEFAULT_EMITTER_COLORS,
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
  emitterSpread,
  audioAmplitude,
  getAudioData,
  audioEnabled,
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
    setEmitterSpread,
    setBandOnsets,
    setAudioAmplitude,
  } = useGPUCompute();
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, references } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const refs = new Float32Array(PARTICLE_COUNT * 2);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;

      const x = (i % TEXTURE_SIZE + 0.5) / TEXTURE_SIZE;
      const y = (Math.floor(i / TEXTURE_SIZE) + 0.5) / TEXTURE_SIZE;
      refs[i * 2] = x;
      refs[i * 2 + 1] = y;
    }

    return { positions: pos, references: refs };
  }, []);

  // Create color array for shader (8 colors)
  const colorArray = useMemo(() => {
    const colors: THREE.Color[] = [];
    for (let i = 0; i < 8; i++) {
      const colorHex = emitterColors[i % emitterColors.length];
      colors.push(new THREE.Color(colorHex));
    }
    return colors;
  }, []);

  const uniforms = useMemo(
    () => ({
      texturePosition: { value: null as THREE.Texture | null },
      textureVelocity: { value: null as THREE.Texture | null },
      uPointSize: { value: pointSize },
      uBrightness: { value: brightness },
      uAlpha: { value: alpha },
      uEmitterColors: { value: colorArray },
      uMaxDistance: { value: maxDistance },
      uEventHorizon: { value: eventHorizonRadius },
      uISCORadius: { value: iscoRadius },
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
      materialRef.current.uniforms.uMaxDistance.value = maxDistance;
      materialRef.current.uniforms.uEventHorizon.value = eventHorizonRadius;
      materialRef.current.uniforms.uISCORadius.value = iscoRadius;

      // Update colors if they changed
      for (let i = 0; i < 8; i++) {
        const colorHex = emitterColors[i % emitterColors.length];
        materialRef.current.uniforms.uEmitterColors.value[i].set(colorHex);
      }
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
    setEmitterSpread(emitterSpread);
    setAudioAmplitude(audioAmplitude);

    if (audioEnabled) {
      const audioData = getAudioData(emitterCount);
      setBandOnsets(audioData.bandOnsets, audioData.bandCount);
    } else {
      const emptyOnsets = new Float32Array(36);
      setBandOnsets(emptyOnsets, emitterCount);
    }
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-reference"
          args={[references, 2]}
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
