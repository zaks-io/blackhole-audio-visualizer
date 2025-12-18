"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGPUCompute } from "@/hooks/useGPUCompute";
import { DEFAULT_TEXTURE_SIZE } from "@/lib/gpu/verletPhysics";
import type { AudioData } from "@/hooks/useMicrophone";
import particleVertexShader from "@/shaders/particles/particleVertex.glsl";
import particleFragmentShader from "@/shaders/particles/particleFragment.glsl";
import { getAllColors } from "@/components/ColorModeSystem";

const DEFAULT_ALL_COLORS = getAllColors();

interface ParticleSystemProps {
  textureSize?: number;
  pointSize: number;
  brightness: number;
  alpha: number;
  allColors?: string[];
  paletteOffset?: number;
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
  beatPulse: number;
  iscoStrength: number;
  emitterSpread: number;
  audioAmplitude: number;
  beatRepulsion: number;
  getAudioData: (bandCount: number) => AudioData;
  audioEnabled: boolean;
}

export function ParticleSystem({
  textureSize = DEFAULT_TEXTURE_SIZE,
  pointSize,
  brightness,
  alpha,
  allColors = DEFAULT_ALL_COLORS,
  paletteOffset = 0,
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
  beatPulse,
  iscoStrength,
  emitterSpread,
  audioAmplitude,
  beatRepulsion,
  getAudioData,
  audioEnabled,
}: ParticleSystemProps) {
  const particleCount = textureSize * textureSize;

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
    setBeatIntensity,
    setBeatRepulsion,
    setBandOnsets,
    setAudioAmplitude,
    setPaletteOffset,
  } = useGPUCompute(textureSize);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, references } = useMemo(() => {
    const pos = new Float32Array(particleCount * 3);
    const refs = new Float32Array(particleCount * 2);

    for (let i = 0; i < particleCount; i++) {
      pos[i * 3] = 0;
      pos[i * 3 + 1] = 0;
      pos[i * 3 + 2] = 0;

      const x = ((i % textureSize) + 0.5) / textureSize;
      const y = (Math.floor(i / textureSize) + 0.5) / textureSize;
      refs[i * 2] = x;
      refs[i * 2 + 1] = y;
    }

    return { positions: pos, references: refs };
  }, [particleCount, textureSize]);

  // Create color array for shader (56 colors - all palettes)
  const colorArray = useMemo(() => {
    const colors: THREE.Color[] = [];
    for (let i = 0; i < 56; i++) {
      const colorHex = allColors[i % allColors.length];
      colors.push(new THREE.Color(colorHex));
    }
    return colors;
  }, [allColors]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Initial values only, updated in useFrame
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
      for (let i = 0; i < 56; i++) {
        const colorHex = allColors[i % allColors.length];
        materialRef.current.uniforms.uEmitterColors.value[i].set(colorHex);
      }
    }
    setPaletteOffset(paletteOffset);
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
    setISCOStrength(iscoStrength);
    setEmitterSpread(emitterSpread);
    setAudioAmplitude(audioAmplitude);
    setBeatRepulsion(beatRepulsion);

    if (audioEnabled) {
      const audioData = getAudioData(emitterCount);
      setBandOnsets(audioData.bandOnsets, audioData.bandCount);
      const beat = Math.max(audioData.bandOnsets[0] ?? 0, audioData.bandOnsets[1] ?? 0);
      setBeatIntensity(beat);
      setISCORadius(iscoRadius * (1 + beat * beatPulse));
    } else {
      const emptyOnsets = new Float32Array(36);
      setBandOnsets(emptyOnsets, emitterCount);
      setBeatIntensity(0);
      setISCORadius(iscoRadius);
    }
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-reference" args={[references, 2]} />
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
