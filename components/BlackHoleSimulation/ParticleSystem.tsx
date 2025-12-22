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
  const emptyOnsetsRef = useRef<Float32Array>(new Float32Array(36));
  const prevControlsRef = useRef<{
    paletteOffset: number;
    gravity: number;
    timeScale: number;
    eventHorizonRadius: number;
    softening: number;
    orbitDecay: number;
    emitRadius: number;
    emitterCount: number;
    emitterAngle: number;
    emitterTilt: number;
    spawnRate: number;
    inwardAngle: number;
    iscoStrength: number;
    emitterSpread: number;
    amplitude: number;
    beatRepulsion: number;
    lifetimeGracePeriod: number;
    lifetimeMax: number;
    lifetimeGravityMultiplier: number;
  } | null>(null);
  const prevAudioEnabledRef = useRef<boolean>(audioEnabled);
  const prevDisabledEmitterCountRef = useRef<number>(-1);
  const prevDisabledIscoRadiusRef = useRef<number | null>(null);
  const prevRenderUniformsRef = useRef<{
    pointSize: number;
    brightness: number;
    alpha: number;
    maxDistance: number;
    eventHorizonRadius: number;
    iscoRadius: number;
  } | null>(null);

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

      // Dirty updates for numeric uniforms (avoid redundant uniform writes)
      if (!prevRenderUniformsRef.current) {
        prevRenderUniformsRef.current = {
          pointSize: state.pointSize,
          brightness: state.brightness,
          alpha: state.alpha,
          maxDistance: state.maxDistance,
          eventHorizonRadius: state.eventHorizonRadius,
          iscoRadius,
        };
        materialRef.current.uniforms.uPointSize.value = state.pointSize;
        materialRef.current.uniforms.uBrightness.value = state.brightness;
        materialRef.current.uniforms.uAlpha.value = state.alpha;
        materialRef.current.uniforms.uMaxDistance.value = state.maxDistance;
        materialRef.current.uniforms.uEventHorizon.value = state.eventHorizonRadius;
        materialRef.current.uniforms.uISCORadius.value = iscoRadius;
      } else {
        const prevR = prevRenderUniformsRef.current;
        if (prevR.pointSize !== state.pointSize) {
          prevR.pointSize = state.pointSize;
          materialRef.current.uniforms.uPointSize.value = state.pointSize;
        }
        if (prevR.brightness !== state.brightness) {
          prevR.brightness = state.brightness;
          materialRef.current.uniforms.uBrightness.value = state.brightness;
        }
        if (prevR.alpha !== state.alpha) {
          prevR.alpha = state.alpha;
          materialRef.current.uniforms.uAlpha.value = state.alpha;
        }
        if (prevR.maxDistance !== state.maxDistance) {
          prevR.maxDistance = state.maxDistance;
          materialRef.current.uniforms.uMaxDistance.value = state.maxDistance;
        }
        if (prevR.eventHorizonRadius !== state.eventHorizonRadius) {
          prevR.eventHorizonRadius = state.eventHorizonRadius;
          materialRef.current.uniforms.uEventHorizon.value = state.eventHorizonRadius;
        }
        if (prevR.iscoRadius !== iscoRadius) {
          prevR.iscoRadius = iscoRadius;
          materialRef.current.uniforms.uISCORadius.value = iscoRadius;
        }
      }

      // Only update colors if palette actually changed (check first color)
      const firstColor = allColors[0];
      if (prevFirstColorRef.current !== firstColor) {
        prevFirstColorRef.current = firstColor;
        for (let i = 0; i < allColors.length; i++) {
          materialRef.current.uniforms.uEmitterColors.value[i].set(allColors[i]);
        }
      }
    }

    // Dirty updates: only touch GPU uniforms when values actually change
    if (!prevControlsRef.current) {
      prevControlsRef.current = {
        paletteOffset,
        gravity: state.gravity,
        timeScale: state.timeScale,
        eventHorizonRadius: state.eventHorizonRadius,
        softening: state.softening,
        orbitDecay: state.orbitDecay,
        emitRadius: state.emitRadius,
        emitterCount: state.emitterCount,
        emitterAngle: state.emitterAngle,
        emitterTilt: state.emitterTilt,
        spawnRate: state.spawnRate,
        inwardAngle: state.inwardAngle,
        iscoStrength: state.iscoStrength,
        emitterSpread: state.emitterSpread,
        amplitude: state.amplitude,
        beatRepulsion: state.beatRepulsion,
        lifetimeGracePeriod: state.lifetimeGracePeriod,
        lifetimeMax: state.lifetimeMax,
        lifetimeGravityMultiplier: state.lifetimeGravityMultiplier,
      };

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
    } else {
      const prev = prevControlsRef.current;
      if (prev.paletteOffset !== paletteOffset) {
        prev.paletteOffset = paletteOffset;
        setPaletteOffset(paletteOffset);
      }
      if (prev.gravity !== state.gravity) {
        prev.gravity = state.gravity;
        setGravitationalParameter(state.gravity);
      }
      if (prev.timeScale !== state.timeScale) {
        prev.timeScale = state.timeScale;
        setTimeScale(state.timeScale);
      }
      if (prev.eventHorizonRadius !== state.eventHorizonRadius) {
        prev.eventHorizonRadius = state.eventHorizonRadius;
        setEventHorizon(state.eventHorizonRadius);
      }
      if (prev.softening !== state.softening) {
        prev.softening = state.softening;
        setSoftening(state.softening);
      }
      if (prev.orbitDecay !== state.orbitDecay) {
        prev.orbitDecay = state.orbitDecay;
        setOrbitDecay(state.orbitDecay);
      }
      if (prev.emitRadius !== state.emitRadius) {
        prev.emitRadius = state.emitRadius;
        setEmissionRadius(state.emitRadius);
      }
      if (prev.emitterCount !== state.emitterCount) {
        prev.emitterCount = state.emitterCount;
        setEmitterCount(state.emitterCount);
      }
      if (prev.emitterAngle !== state.emitterAngle) {
        prev.emitterAngle = state.emitterAngle;
        setEmitterAngle(state.emitterAngle);
      }
      if (prev.emitterTilt !== state.emitterTilt) {
        prev.emitterTilt = state.emitterTilt;
        setEmitterTilt(state.emitterTilt);
      }
      if (prev.spawnRate !== state.spawnRate) {
        prev.spawnRate = state.spawnRate;
        setSpawnRate(state.spawnRate);
      }
      if (prev.inwardAngle !== state.inwardAngle) {
        prev.inwardAngle = state.inwardAngle;
        setInwardAngle(state.inwardAngle);
      }
      if (prev.iscoStrength !== state.iscoStrength) {
        prev.iscoStrength = state.iscoStrength;
        setISCOStrength(state.iscoStrength);
      }
      if (prev.emitterSpread !== state.emitterSpread) {
        prev.emitterSpread = state.emitterSpread;
        setEmitterSpread(state.emitterSpread);
      }
      if (prev.amplitude !== state.amplitude) {
        prev.amplitude = state.amplitude;
        setAudioAmplitude(state.amplitude);
      }
      if (prev.beatRepulsion !== state.beatRepulsion) {
        prev.beatRepulsion = state.beatRepulsion;
        setBeatRepulsion(state.beatRepulsion);
      }
      if (prev.lifetimeGracePeriod !== state.lifetimeGracePeriod) {
        prev.lifetimeGracePeriod = state.lifetimeGracePeriod;
        setLifetimeGracePeriod(state.lifetimeGracePeriod);
      }
      if (prev.lifetimeMax !== state.lifetimeMax) {
        prev.lifetimeMax = state.lifetimeMax;
        setLifetimeMax(state.lifetimeMax);
      }
      if (prev.lifetimeGravityMultiplier !== state.lifetimeGravityMultiplier) {
        prev.lifetimeGravityMultiplier = state.lifetimeGravityMultiplier;
        setLifetimeGravityMultiplier(state.lifetimeGravityMultiplier);
      }
    }

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

    const audioTransitioned = prevAudioEnabledRef.current !== audioEnabled;
    if (audioTransitioned) {
      prevAudioEnabledRef.current = audioEnabled;
      // Ensure we refresh the disabled-band write when toggling off.
      if (!audioEnabled) prevDisabledEmitterCountRef.current = -1;
    }

    if (audioEnabled) {
      const audioData = getAudioData();
      setBandOnsets(audioData.bandOnsets, audioData.bandCount);
      const beat = Math.max(audioData.bandOnsets[0] ?? 0, audioData.bandOnsets[1] ?? 0);
      setBeatIntensity(beat);
      // Only re-send beatPulse-driven ISCO radius if the pulse changes or beat changes.
      // Beat changes every frame, so this is still per-frame when audio is enabled.
      setISCORadius(iscoRadius * (1 + beat * state.beatPulse));
      setHFCBoost(audioData.hfcBoost);
      setSpawnBurst(audioData.spawnBurst);
    } else {
      // When audio is disabled, avoid spamming identical updates each frame.
      // Only refresh when emitterCount changes (it affects how many bands are read).
      if (prevDisabledEmitterCountRef.current !== state.emitterCount) {
        prevDisabledEmitterCountRef.current = state.emitterCount;
        setBandOnsets(emptyOnsetsRef.current, state.emitterCount);
      }
      // These are constant in disabled mode; only force on transition.
      if (audioTransitioned) {
        setBeatIntensity(0);
        setHFCBoost(0);
        setSpawnBurst(1);
      }
      // ISCO radius can change due to UI while disabled; update only when it changes.
      if (prevDisabledIscoRadiusRef.current !== iscoRadius) {
        prevDisabledIscoRadiusRef.current = iscoRadius;
        setISCORadius(iscoRadius);
      }
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
