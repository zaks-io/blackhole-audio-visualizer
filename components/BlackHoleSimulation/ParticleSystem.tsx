"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGPUCompute } from "@/hooks/useGPUCompute";
import { DEFAULT_TEXTURE_SIZE } from "@/lib/gpu/verletPhysics";
import particleVertexShader from "@/shaders/particles/particleVertex.glsl";
import particleFragmentShader from "@/shaders/particles/particleFragment.glsl";
import { getAllColors } from "@/components/ColorModeSystem";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";

const DEFAULT_ALL_COLORS = getAllColors();

interface ParticleAudioData {
  bandEnergies: Float32Array;
  bandOnsets: Float32Array;
  bandCount: number;
  hfcBoost: number;
  spawnBurst: number;
}

interface BlackHoleData {
  positions: THREE.Vector3[];
  masses: number[];
  count: number;
}

interface ParticleSystemProps {
  allColors?: string[];
  paletteOffset?: number;
  getAudioData: () => ParticleAudioData;
  audioEnabled: boolean;
  getBlackHoleData: () => BlackHoleData;
}

export function ParticleSystem({
  allColors = DEFAULT_ALL_COLORS,
  paletteOffset = 0,
  getAudioData,
  audioEnabled,
  getBlackHoleData,
}: ParticleSystemProps) {
  // Read texture size only on mount - changing it requires full rebuild
  const textureSize = useVisualizationControls.getState().textureSize || DEFAULT_TEXTURE_SIZE;
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
    setHFCBoost,
    setSpawnBurst,
    setLifetimeGracePeriod,
    setLifetimeMax,
    setLifetimeGravityMultiplier,
    setBlackHoles,
  } = useGPUCompute(textureSize);

  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const prevFirstColorRef = useRef<string>(allColors[0]);

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

  // Create color array for shader (all palettes)
  const colorArray = useMemo(() => {
    const colors: THREE.Color[] = [];
    for (let i = 0; i < allColors.length; i++) {
      colors.push(new THREE.Color(allColors[i]));
    }
    return colors;
  }, [allColors]);

  // Get initial values for uniforms to prevent flicker
  const initialControls = useVisualizationControls.getState();

  const uniforms = useMemo(
    () => ({
      texturePosition: { value: null as THREE.Texture | null },
      textureVelocity: { value: null as THREE.Texture | null },
      uPointSize: { value: initialControls.pointSize },
      uBrightness: { value: initialControls.brightness },
      uAlpha: { value: initialControls.alpha },
      uEmitterColors: { value: colorArray },
      uMaxDistance: { value: initialControls.maxDistance },
      uEventHorizon: { value: initialControls.eventHorizonRadius },
      uISCORadius: { value: initialControls.eventHorizonRadius * initialControls.iscoRatio },
      uBlackHolePos: {
        value: [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0),
        ],
      },
      uBlackHoleCount: { value: 1 },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colorArray]
  );

  useFrame(() => {
    const state = useVisualizationControls.getState();
    const iscoRadius = state.eventHorizonRadius * state.iscoRatio;

    if (materialRef.current) {
      const posTexture = getPositionTexture();
      const velTexture = getVelocityTexture();
      if (posTexture) {
        materialRef.current.uniforms.texturePosition.value = posTexture;
      }
      if (velTexture) {
        materialRef.current.uniforms.textureVelocity.value = velTexture;
      }
      materialRef.current.uniforms.uPointSize.value = state.pointSize;
      materialRef.current.uniforms.uBrightness.value = state.brightness;
      materialRef.current.uniforms.uAlpha.value = state.alpha;
      materialRef.current.uniforms.uMaxDistance.value = state.maxDistance;
      materialRef.current.uniforms.uEventHorizon.value = state.eventHorizonRadius;
      materialRef.current.uniforms.uISCORadius.value = iscoRadius;

      // Only update colors if palette actually changed (check first color)
      const firstColor = allColors[0];
      if (prevFirstColorRef.current !== firstColor) {
        prevFirstColorRef.current = firstColor;
        for (let i = 0; i < allColors.length; i++) {
          materialRef.current.uniforms.uEmitterColors.value[i].set(allColors[i]);
        }
      }
    }

    setPaletteOffset(paletteOffset);
    setGravitationalParameter(state.gravity);
    setTimeScale(state.timeScale);
    setEventHorizon(state.eventHorizonRadius);
    setSoftening(state.softening);
    setOrbitDecay(state.orbitDecay);
    setEmissionRadius(state.emitRadius);
    setEmitterCount(state.emitterCount);
    setEmitterAngle(state.emitterAngle);
    setEmitterTilt(state.emitterTilt);
    setSpawnRate(state.spawnRate);
    setInwardAngle(state.inwardAngle);
    setISCOStrength(state.iscoStrength);
    setEmitterSpread(state.emitterSpread);
    setAudioAmplitude(state.amplitude);
    setBeatRepulsion(state.beatRepulsion);
    setLifetimeGracePeriod(state.lifetimeGracePeriod);
    setLifetimeMax(state.lifetimeMax);
    setLifetimeGravityMultiplier(state.lifetimeGravityMultiplier);

    // Update black hole positions and masses
    const blackHoleData = getBlackHoleData();
    setBlackHoles(blackHoleData.positions, blackHoleData.masses, blackHoleData.count);

    // Update render shader uniforms for black hole positions
    if (materialRef.current) {
      for (let i = 0; i < 4; i++) {
        if (i < blackHoleData.count) {
          materialRef.current.uniforms.uBlackHolePos.value[i].copy(blackHoleData.positions[i]);
        } else {
          materialRef.current.uniforms.uBlackHolePos.value[i].set(0, 0, 0);
        }
      }
      materialRef.current.uniforms.uBlackHoleCount.value = blackHoleData.count;
    }

    if (audioEnabled) {
      const audioData = getAudioData();
      setBandOnsets(audioData.bandOnsets, audioData.bandCount);
      const beat = Math.max(audioData.bandOnsets[0] ?? 0, audioData.bandOnsets[1] ?? 0);
      setBeatIntensity(beat);
      setISCORadius(iscoRadius * (1 + beat * state.beatPulse));
      setHFCBoost(audioData.hfcBoost);
      setSpawnBurst(audioData.spawnBurst);
    } else {
      const emptyOnsets = new Float32Array(36);
      setBandOnsets(emptyOnsets, state.emitterCount);
      setBeatIntensity(0);
      setISCORadius(iscoRadius);
      setHFCBoost(0);
      setSpawnBurst(1);
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
