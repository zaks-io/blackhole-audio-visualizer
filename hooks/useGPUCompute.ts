"use client";

import { useRef, useMemo, useEffect, useCallback } from "react";
import { useThree, useFrame } from "@react-three/fiber";
import { GPUComputationRenderer } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import type { Variable } from "three/examples/jsm/misc/GPUComputationRenderer.js";
import * as THREE from "three";
import {
  DEFAULT_TEXTURE_SIZE,
  EMISSION_RADIUS,
  DEFAULT_GM,
  DEFAULT_SOFTENING,
  createInitialPositionTexture,
  createInitialVelocityTexture,
} from "@/lib/gpu/verletPhysics";
import positionFragmentShader from "@/shaders/simulation/positionFragment.glsl";
import velocityFragmentShader from "@/shaders/simulation/velocityFragment.glsl";

const MAX_BANDS = 36;

export function useGPUCompute(textureSize: number = DEFAULT_TEXTURE_SIZE) {
  const { gl } = useThree();
  const gpuComputeRef = useRef<GPUComputationRenderer | null>(null);
  const positionVariableRef = useRef<Variable | null>(null);
  const velocityVariableRef = useRef<Variable | null>(null);
  const timeScaleRef = useRef(0.5);
  const bandOnsetsTextureRef = useRef<THREE.DataTexture | null>(null);

  const textures = useMemo(() => {
    const initialPosition = createInitialPositionTexture(textureSize, EMISSION_RADIUS);
    const initialVelocity = createInitialVelocityTexture(textureSize, initialPosition, DEFAULT_GM);

    // Create band onsets texture (1 x MAX_BANDS, RGBA float, only R channel used)
    const bandOnsetsData = new Float32Array(MAX_BANDS * 4);
    const bandOnsetsTexture = new THREE.DataTexture(
      bandOnsetsData,
      MAX_BANDS,
      1,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    bandOnsetsTexture.needsUpdate = true;

    return { initialPosition, initialVelocity, bandOnsetsTexture };
  }, [textureSize]);

  useEffect(() => {
    const gpuCompute = new GPUComputationRenderer(textureSize, textureSize, gl);

    if (!gl.capabilities.isWebGL2) {
      const ext = gl.extensions.get("OES_texture_float");
      if (!ext) {
        console.error("Float textures not supported");
        return;
      }
    }

    // Create position texture
    const positionTexture = gpuCompute.createTexture();
    const posData = positionTexture.image.data as Float32Array;
    const initPosData = textures.initialPosition.image.data as Float32Array;
    for (let i = 0; i < initPosData.length; i++) {
      posData[i] = initPosData[i];
    }

    // Create velocity texture
    const velocityTexture = gpuCompute.createTexture();
    const velData = velocityTexture.image.data as Float32Array;
    const initVelData = textures.initialVelocity.image.data as Float32Array;
    for (let i = 0; i < initVelData.length; i++) {
      velData[i] = initVelData[i];
    }

    // Add velocity variable FIRST so it runs before position
    // Both shaders need to see the same state to detect spawn condition
    const velocityVariable = gpuCompute.addVariable(
      "textureVelocity",
      velocityFragmentShader,
      velocityTexture
    );

    // Add position variable second
    const positionVariable = gpuCompute.addVariable(
      "texturePosition",
      positionFragmentShader,
      positionTexture
    );

    // Set up uniforms for position shader
    positionVariable.material.uniforms.uTime = { value: 0 };
    positionVariable.material.uniforms.uDeltaTime = { value: 0.016 };
    positionVariable.material.uniforms.uGM = { value: DEFAULT_GM };
    positionVariable.material.uniforms.uSoftening = { value: DEFAULT_SOFTENING };
    positionVariable.material.uniforms.uEventHorizon = { value: 3.0 };
    positionVariable.material.uniforms.uEmissionRadius = { value: EMISSION_RADIUS };
    positionVariable.material.uniforms.uEmitterCount = { value: 2.0 };
    positionVariable.material.uniforms.uEmitterAngle = { value: 0.0 };
    positionVariable.material.uniforms.uEmitterTilt = { value: 0.0 };
    positionVariable.material.uniforms.uSpawnRate = { value: 1.0 };
    positionVariable.material.uniforms.uOrbitDecay = { value: 2.0 };
    positionVariable.material.uniforms.uDoDrift = { value: false };
    positionVariable.material.uniforms.uBandOnsetsTexture = { value: textures.bandOnsetsTexture };
    positionVariable.material.uniforms.uBandCount = { value: 2.0 };
    positionVariable.material.uniforms.uAudioAmplitude = { value: 1.0 };
    positionVariable.material.uniforms.uSpawnBurst = { value: 1.0 };

    // Store ref to band onsets texture for updates
    bandOnsetsTextureRef.current = textures.bandOnsetsTexture;

    // Set up uniforms for velocity shader
    velocityVariable.material.uniforms.uTime = { value: 0 };
    velocityVariable.material.uniforms.uDeltaTime = { value: 0.016 };
    velocityVariable.material.uniforms.uGM = { value: DEFAULT_GM };
    velocityVariable.material.uniforms.uSoftening = { value: DEFAULT_SOFTENING };
    velocityVariable.material.uniforms.uEventHorizon = { value: 3.0 };
    velocityVariable.material.uniforms.uEmissionRadius = { value: EMISSION_RADIUS };
    velocityVariable.material.uniforms.uEmitterCount = { value: 2.0 };
    velocityVariable.material.uniforms.uInwardAngle = { value: 0.0 };
    velocityVariable.material.uniforms.uISCORadius = { value: 9.0 };
    velocityVariable.material.uniforms.uISCOStrength = { value: 0.5 };
    velocityVariable.material.uniforms.uEmitterSpread = { value: 0.1 };
    velocityVariable.material.uniforms.uBeatIntensity = { value: 0.0 };
    velocityVariable.material.uniforms.uBeatRepulsion = { value: 0.0 };
    velocityVariable.material.uniforms.uPaletteOffset = { value: 0.0 };
    velocityVariable.material.uniforms.uDoKick = { value: false };
    velocityVariable.material.uniforms.uHFCBoost = { value: 0.0 };

    // Set dependencies: position and velocity both depend on each other
    gpuCompute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);
    gpuCompute.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable]);

    const error = gpuCompute.init();
    if (error !== null) {
      console.error("GPUComputationRenderer error:", error);
      return;
    }

    gpuComputeRef.current = gpuCompute;
    positionVariableRef.current = positionVariable;
    velocityVariableRef.current = velocityVariable;

    return () => {
      // Dispose GPUComputationRenderer and its internal render targets
      gpuComputeRef.current?.dispose();
      gpuComputeRef.current = null;
      positionVariableRef.current = null;
      velocityVariableRef.current = null;

      textures.initialPosition.dispose();
      textures.initialVelocity.dispose();
      textures.bandOnsetsTexture.dispose();
      bandOnsetsTextureRef.current = null;
    };
  }, [gl, textures]);

  useFrame((state, delta) => {
    if (!gpuComputeRef.current || !positionVariableRef.current || !velocityVariableRef.current) {
      return;
    }

    const scaledTime = state.clock.elapsedTime * timeScaleRef.current;
    const scaledDelta = Math.min(delta * timeScaleRef.current, 0.05); // Cap at 50ms

    // Update time uniforms
    positionVariableRef.current.material.uniforms.uTime.value = scaledTime;
    positionVariableRef.current.material.uniforms.uDeltaTime.value = scaledDelta;
    velocityVariableRef.current.material.uniforms.uTime.value = scaledTime;
    velocityVariableRef.current.material.uniforms.uDeltaTime.value = scaledDelta;

    // KICK-DRIFT-KICK (Leapfrog) Integration:

    // Pass 1: First KICK (half-step velocity update)
    velocityVariableRef.current.material.uniforms.uDoKick.value = true;
    positionVariableRef.current.material.uniforms.uDoDrift.value = false;
    gpuComputeRef.current.compute();

    // Pass 2: DRIFT (position update) + Second KICK (half-step velocity update)
    velocityVariableRef.current.material.uniforms.uDoKick.value = true;
    positionVariableRef.current.material.uniforms.uDoDrift.value = true;
    gpuComputeRef.current.compute();
  });

  const getPositionTexture = useCallback((): THREE.Texture | null => {
    if (!gpuComputeRef.current || !positionVariableRef.current) return null;
    return gpuComputeRef.current.getCurrentRenderTarget(positionVariableRef.current).texture;
  }, []);

  const getVelocityTexture = useCallback((): THREE.Texture | null => {
    if (!gpuComputeRef.current || !velocityVariableRef.current) return null;
    return gpuComputeRef.current.getCurrentRenderTarget(velocityVariableRef.current).texture;
  }, []);

  const setGravitationalParameter = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uGM.value = value;
    }
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uGM.value = value;
    }
  }, []);

  const setTimeScale = useCallback((value: number) => {
    timeScaleRef.current = value;
  }, []);

  const setEventHorizon = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uEventHorizon.value = value;
    }
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uEventHorizon.value = value;
    }
  }, []);

  const setSoftening = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uSoftening.value = value;
    }
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uSoftening.value = value;
    }
  }, []);

  const setEmissionRadius = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uEmissionRadius.value = value;
    }
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uEmissionRadius.value = value;
    }
  }, []);

  const setEmitterCount = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uEmitterCount.value = value;
      positionVariableRef.current.material.uniforms.uBandCount.value = value;
    }
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uEmitterCount.value = value;
    }
  }, []);

  const setOrbitDecay = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uOrbitDecay.value = value;
    }
  }, []);

  const setEmitterAngle = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uEmitterAngle.value = value;
    }
  }, []);

  const setEmitterTilt = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uEmitterTilt.value = value;
    }
  }, []);

  const setSpawnRate = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uSpawnRate.value = value;
    }
  }, []);

  const setInwardAngle = useCallback((value: number) => {
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uInwardAngle.value = value;
    }
  }, []);

  const setISCORadius = useCallback((value: number) => {
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uISCORadius.value = value;
    }
  }, []);

  const setISCOStrength = useCallback((value: number) => {
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uISCOStrength.value = value;
    }
  }, []);

  const setEmitterSpread = useCallback((value: number) => {
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uEmitterSpread.value = value;
    }
  }, []);

  const setBeatIntensity = useCallback((value: number) => {
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uBeatIntensity.value = value;
    }
  }, []);

  const setBeatRepulsion = useCallback((value: number) => {
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uBeatRepulsion.value = value;
    }
  }, []);

  const setBandOnsets = useCallback((onsets: Float32Array, count: number) => {
    if (!bandOnsetsTextureRef.current) return;
    const data = bandOnsetsTextureRef.current.image.data as Float32Array;
    for (let i = 0; i < count && i < MAX_BANDS; i++) {
      data[i * 4] = onsets[i]; // R channel = onset value
    }
    bandOnsetsTextureRef.current.needsUpdate = true;
  }, []);

  const setAudioAmplitude = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uAudioAmplitude.value = value;
    }
  }, []);

  const setPaletteOffset = useCallback((value: number) => {
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uPaletteOffset.value = value;
    }
  }, []);

  const setHFCBoost = useCallback((value: number) => {
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uHFCBoost.value = value;
    }
  }, []);

  const setSpawnBurst = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uSpawnBurst.value = value;
    }
  }, []);

  return {
    getPositionTexture,
    getVelocityTexture,
    setGravitationalParameter,
    setTimeScale,
    setEventHorizon,
    setSoftening,
    setEmissionRadius,
    setEmitterCount,
    setOrbitDecay,
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
  };
}
