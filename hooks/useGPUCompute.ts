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
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import { registerGPUSetter, clearGPUSetters } from "@/lib/gpuSetterRegistry";
import { PALETTE_OFFSETS } from "@/components/ColorModeSystem";
import { useParticleStatsStore } from "@/hooks/useFPSMonitor";
import positionFragmentShader from "@/shaders/simulation/positionFragment.glsl";
import velocityFragmentShader from "@/shaders/simulation/velocityFragment.glsl";
import copyTextureShader from "@/shaders/simulation/copyTexture.glsl";

const MAX_BANDS = 36;
const SPECTRUM_SIZE = 128; // FFT bins to send to GPU

export function useGPUCompute(
  textureSize: number = DEFAULT_TEXTURE_SIZE,
  options?: { enableHistory?: boolean; onError?: () => void }
) {
  const enableHistory = options?.enableHistory ?? true;
  const onError = options?.onError;
  const { gl } = useThree();
  const gpuComputeRef = useRef<GPUComputationRenderer | null>(null);
  const positionVariableRef = useRef<Variable | null>(null);
  const velocityVariableRef = useRef<Variable | null>(null);
  const timeScaleRef = useRef(0.5);
  const bandOnsetsTextureRef = useRef<THREE.DataTexture | null>(null);
  const bandOnsetsDirtyRef = useRef(false);
  const spectrumTextureRef = useRef<THREE.DataTexture | null>(null);
  const spectrumDirtyRef = useRef(false);
  // Stable buffers for black hole uniforms (avoid per-frame allocations).
  const blackHolePosRef = useRef<THREE.Vector3[] | null>(null);
  const blackHoleMassRef = useRef<number[] | null>(null);
  const blackHoleRadiusRef = useRef<number[] | null>(null);
  // Position history for motion blur trails (ring buffer: history2 <- history1 <- prev <- current)
  const positionHistory1RTRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const positionHistory2RTRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const copyMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const copySceneRef = useRef<THREE.Scene | null>(null);
  const copyCameraRef = useRef<THREE.Camera | null>(null);
  // Particle stats sampling
  const lastParticleSampleRef = useRef(0);
  const particleReadBufferRef = useRef<Float32Array | null>(null);
  const updateParticleStats = useParticleStatsStore((s) => s.updateStats);
  const loggedCapsRef = useRef(false);

  const textures = useMemo(() => {
    const initialPosition = createInitialPositionTexture(textureSize, EMISSION_RADIUS);
    const initialVelocity = createInitialVelocityTexture(textureSize, initialPosition, DEFAULT_GM);

    // Create band onsets texture (1 x MAX_BANDS, RGBA u8, only R channel used).
    // Using bytes reduces upload cost and avoids float-texture quirks in the render loop.
    const bandOnsetsData = new Uint8Array(MAX_BANDS * 4);
    for (let i = 0; i < MAX_BANDS; i++) {
      bandOnsetsData[i * 4 + 0] = 0;
      bandOnsetsData[i * 4 + 1] = 0;
      bandOnsetsData[i * 4 + 2] = 0;
      bandOnsetsData[i * 4 + 3] = 255;
    }
    const bandOnsetsTexture = new THREE.DataTexture(
      bandOnsetsData,
      MAX_BANDS,
      1,
      THREE.RGBAFormat,
      THREE.UnsignedByteType
    );
    bandOnsetsTexture.needsUpdate = true;

    // Create spectrum texture for raw FFT data (per-particle frequency sampling)
    // IMPORTANT: This must be float to avoid visible banding/lanes caused by 8-bit quantization.
    // The simulation uses spectrum values to set spawn-time vertical energy; bytes create discrete steps.
    const spectrumData = new Float32Array(SPECTRUM_SIZE * 4);
    for (let i = 0; i < SPECTRUM_SIZE; i++) {
      spectrumData[i * 4 + 0] = 0;
      spectrumData[i * 4 + 1] = 0;
      spectrumData[i * 4 + 2] = 0;
      spectrumData[i * 4 + 3] = 1;
    }
    const spectrumTexture = new THREE.DataTexture(
      spectrumData,
      SPECTRUM_SIZE,
      1,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    spectrumTexture.magFilter = THREE.NearestFilter;
    spectrumTexture.minFilter = THREE.NearestFilter;
    spectrumTexture.wrapS = THREE.ClampToEdgeWrapping;
    spectrumTexture.wrapT = THREE.ClampToEdgeWrapping;
    spectrumTexture.needsUpdate = true;

    return { initialPosition, initialVelocity, bandOnsetsTexture, spectrumTexture };
  }, [textureSize]);

  useEffect(() => {
    const gpuCompute = new GPUComputationRenderer(textureSize, textureSize, gl);

    // Make compute RT type explicit and log float RT support once (helps diagnose lattice/quantization artifacts).
    // WebGL2 float render targets require EXT_color_buffer_float. If unavailable, we deliberately fall back.
    const isWebGL2 = gl.capabilities.isWebGL2;
    const ctx = gl.getContext();
    const extColorBufferFloat = isWebGL2 ? ctx.getExtension("EXT_color_buffer_float") : null;
    const extOesFloatTex = !isWebGL2 ? gl.extensions.get("OES_texture_float") : null;

    const canRenderFloat = (isWebGL2 && !!extColorBufferFloat) || (!isWebGL2 && !!extOesFloatTex);

    if (canRenderFloat) {
      gpuCompute.setDataType(THREE.FloatType);
    } else {
      gpuCompute.setDataType(THREE.HalfFloatType);
      console.warn(
        "[GPUCompute] Float render targets not supported; falling back to HalfFloat. This can introduce visible quantization/banding artifacts."
      );
    }

    if (!loggedCapsRef.current && process.env.NODE_ENV !== "production") {
      loggedCapsRef.current = true;
      const precision = gl.capabilities.precision;
      console.log("[GPUCompute] WebGL2:", isWebGL2);
      console.log("[GPUCompute] precision:", precision);
      console.log("[GPUCompute] EXT_color_buffer_float:", !!extColorBufferFloat);
      console.log("[GPUCompute] OES_texture_float:", !!extOesFloatTex);
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
    positionVariable.material.uniforms.uParticlesPerSecond = { value: 5000 };
    positionVariable.material.uniforms.uTotalParticles = { value: textureSize * textureSize };
    positionVariable.material.uniforms.uLifetimeMax = { value: 60.0 };
    positionVariable.material.uniforms.uDoDrift = { value: false };
    positionVariable.material.uniforms.uBandOnsetsTexture = { value: textures.bandOnsetsTexture };
    // Byte texture returns normalized [0..1] in shader; rescale to original onset range.
    positionVariable.material.uniforms.uBandOnsetMax = { value: 10.0 };
    positionVariable.material.uniforms.uBandCount = { value: 2.0 };
    positionVariable.material.uniforms.uSpectrumTexture = { value: textures.spectrumTexture };
    positionVariable.material.uniforms.uSpectrumSize = { value: SPECTRUM_SIZE };
    positionVariable.material.uniforms.uAudioAmplitude = { value: 1.0 };
    positionVariable.material.uniforms.uSpawnBurst = { value: 1.0 };
    positionVariable.material.uniforms.uEmitterSpread = { value: 0.0 };
    positionVariable.material.uniforms.uBeatIntensity = { value: 0.0 };
    positionVariable.material.uniforms.uBeatPulse = { value: 2.0 };
    // Very small drift dither to break residual lattice lock without changing the overall aesthetic.
    positionVariable.material.uniforms.uDither = { value: 0.006 };

    // Multi-black hole uniforms for position shader
    const bhPos = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ];
    const bhMass = [DEFAULT_GM, DEFAULT_GM * 0.5, DEFAULT_GM * 0.3, DEFAULT_GM * 0.2];
    const bhRadius = [5, 5, 5, 5];
    blackHolePosRef.current = bhPos;
    blackHoleMassRef.current = bhMass;
    blackHoleRadiusRef.current = bhRadius;
    positionVariable.material.uniforms.uBlackHolePos = { value: bhPos };
    positionVariable.material.uniforms.uBlackHoleMass = { value: bhMass };
    positionVariable.material.uniforms.uBlackHoleRadius = { value: bhRadius };
    positionVariable.material.uniforms.uBlackHoleCount = { value: 1 };

    // Store refs to textures for updates
    bandOnsetsTextureRef.current = textures.bandOnsetsTexture;
    spectrumTextureRef.current = textures.spectrumTexture;

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
    velocityVariable.material.uniforms.uEmitterSpread = { value: 0.0 };
    velocityVariable.material.uniforms.uBeatIntensity = { value: 0.0 };
    velocityVariable.material.uniforms.uBeatRepulsion = { value: 0.0 };
    velocityVariable.material.uniforms.uPaletteOffset = { value: 0.0 };
    velocityVariable.material.uniforms.uDoKick = { value: false };
    velocityVariable.material.uniforms.uHFCBoost = { value: 0.0 };
    velocityVariable.material.uniforms.uLifetimeGracePeriod = { value: 30.0 };
    velocityVariable.material.uniforms.uLifetimeMax = { value: 60.0 };
    velocityVariable.material.uniforms.uLifetimeGravityMultiplier = { value: 3.0 };
    velocityVariable.material.uniforms.uOrbitDecay = { value: 2.0 };

    // Multi-black hole uniforms for velocity shader
    velocityVariable.material.uniforms.uBlackHolePos = { value: bhPos };
    velocityVariable.material.uniforms.uBlackHoleMass = { value: bhMass };
    velocityVariable.material.uniforms.uBlackHoleRadius = { value: bhRadius };
    velocityVariable.material.uniforms.uBlackHoleCount = { value: 1 };

    // IMPORTANT: Initialize uniforms from the visualization store immediately.
    // `useGPUCompute`'s `useFrame` runs before `ParticleSystem`'s `useFrame` (hook order),
    // so defaults here can permanently affect spawn velocities/colors in the first compute tick.
    const initial = useVisualizationControls.getState();
    timeScaleRef.current = initial.timeScale;

    // Core simulation params
    positionVariable.material.uniforms.uGM.value = initial.gravity;
    velocityVariable.material.uniforms.uGM.value = initial.gravity;
    positionVariable.material.uniforms.uSoftening.value = initial.softening;
    velocityVariable.material.uniforms.uSoftening.value = initial.softening;
    positionVariable.material.uniforms.uEventHorizon.value = initial.eventHorizonRadius;
    velocityVariable.material.uniforms.uEventHorizon.value = initial.eventHorizonRadius;

    positionVariable.material.uniforms.uEmissionRadius.value = initial.emitRadius;
    velocityVariable.material.uniforms.uEmissionRadius.value = initial.emitRadius;
    positionVariable.material.uniforms.uEmitterCount.value = initial.emitterCount;
    positionVariable.material.uniforms.uBandCount.value = initial.emitterCount;
    velocityVariable.material.uniforms.uEmitterCount.value = initial.emitterCount;
    positionVariable.material.uniforms.uEmitterAngle.value = initial.emitterAngle;
    positionVariable.material.uniforms.uEmitterTilt.value = initial.emitterTilt;
    velocityVariable.material.uniforms.uInwardAngle.value = initial.inwardAngle;
    positionVariable.material.uniforms.uParticlesPerSecond.value = initial.spawnRate;
    positionVariable.material.uniforms.uLifetimeMax.value = initial.lifetimeMax;

    velocityVariable.material.uniforms.uLifetimeGracePeriod.value = initial.lifetimeGracePeriod;
    velocityVariable.material.uniforms.uLifetimeMax.value = initial.lifetimeMax;
    velocityVariable.material.uniforms.uLifetimeGravityMultiplier.value =
      initial.lifetimeGravityMultiplier;
    velocityVariable.material.uniforms.uOrbitDecay.value = initial.orbitDecay;

    velocityVariable.material.uniforms.uISCORadius.value =
      initial.eventHorizonRadius * initial.iscoRatio;
    velocityVariable.material.uniforms.uISCOStrength.value = initial.iscoStrength;
    velocityVariable.material.uniforms.uEmitterSpread.value = initial.emitterSpread;
    positionVariable.material.uniforms.uEmitterSpread.value = initial.emitterSpread;
    velocityVariable.material.uniforms.uBeatRepulsion.value = initial.beatRepulsion;
    positionVariable.material.uniforms.uAudioAmplitude.value = initial.amplitude;

    // Palette offset must match the store's initial palette so colorIndex is correct on first spawn
    velocityVariable.material.uniforms.uPaletteOffset.value = PALETTE_OFFSETS[initial.colorPalette];

    // Initialize black holes consistently with `BlackHoleSimulation` at t=0
    const bhCount = Math.max(1, Math.min(Math.floor(initial.blackHoleCount), 4));
    const maxMass = initial.gravity * initial.blackHoleMassMax;
    if (bhCount === 1) {
      bhPos[0].set(0, 0, 0);
      bhMass[0] = maxMass;
      bhRadius[0] = initial.eventHorizonRadius;
    } else {
      const angleStep = (2 * Math.PI) / bhCount;
      const totalMass = initial.gravity;
      let totalMassRatio = 0;
      for (let i = 0; i < bhCount; i++) {
        const ti = i / (bhCount - 1);
        totalMassRatio +=
          initial.blackHoleMassMax - ti * (initial.blackHoleMassMax - initial.blackHoleMassMin);
      }
      const avgMassRatio = totalMassRatio / bhCount;
      for (let i = 0; i < bhCount; i++) {
        const angle = i * angleStep;
        const t = i / (bhCount - 1);
        const massRatio =
          initial.blackHoleMassMax - t * (initial.blackHoleMassMax - initial.blackHoleMassMin);
        const mass = totalMass * massRatio;
        const r = initial.orbitRadius * (avgMassRatio / massRatio);
        bhPos[i].set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
        bhMass[i] = mass;
        bhRadius[i] = initial.eventHorizonRadius * (mass / maxMass);
      }
    }
    for (let i = bhCount; i < 4; i++) {
      bhPos[i].set(0, 0, 0);
      bhMass[i] = 0;
      bhRadius[i] = 0;
    }
    positionVariable.material.uniforms.uBlackHoleCount.value = bhCount;
    velocityVariable.material.uniforms.uBlackHoleCount.value = bhCount;

    // Set dependencies: position and velocity both depend on each other
    gpuCompute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);
    gpuCompute.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable]);

    const error = gpuCompute.init();
    if (error !== null) {
      console.error("GPUComputationRenderer error:", error);
      return;
    }

    if (process.env.NODE_ENV !== "production") {
      try {
        const posRT = gpuCompute.getCurrentRenderTarget(positionVariable);
        const velRT = gpuCompute.getCurrentRenderTarget(velocityVariable);
        console.log(
          "[GPUCompute] positionRT.type:",
          posRT.texture.type,
          "format:",
          posRT.texture.format
        );
        console.log("[GPUCompute] positionRT.internalFormat:", posRT.texture.internalFormat);
        console.log(
          "[GPUCompute] velocityRT.type:",
          velRT.texture.type,
          "format:",
          velRT.texture.format
        );
        console.log("[GPUCompute] velocityRT.internalFormat:", velRT.texture.internalFormat);
      } catch {
        // best-effort logging only
      }
    }

    gpuComputeRef.current = gpuCompute;
    positionVariableRef.current = positionVariable;
    velocityVariableRef.current = velocityVariable;

    if (enableHistory) {
      // Create position history render targets for motion blur trails
      const rtOptions: THREE.RenderTargetOptions = {
        wrapS: THREE.ClampToEdgeWrapping,
        wrapT: THREE.ClampToEdgeWrapping,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
        type: THREE.FloatType,
        depthBuffer: false,
      };
      const history1RT = new THREE.WebGLRenderTarget(textureSize, textureSize, rtOptions);
      const history2RT = new THREE.WebGLRenderTarget(textureSize, textureSize, rtOptions);
      positionHistory1RTRef.current = history1RT;
      positionHistory2RTRef.current = history2RT;

      // Create copy material and scene for shifting history textures
      const copyMaterial = new THREE.ShaderMaterial({
        uniforms: {
          tSource: { value: null },
          resolution: { value: new THREE.Vector2(textureSize, textureSize) },
        },
        vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
        fragmentShader: copyTextureShader,
        depthTest: false,
        depthWrite: false,
      });
      copyMaterialRef.current = copyMaterial;

      const copyScene = new THREE.Scene();
      const copyPlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), copyMaterial);
      copyScene.add(copyPlane);
      copySceneRef.current = copyScene;

      const copyCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      copyCameraRef.current = copyCamera;
    } else {
      positionHistory1RTRef.current = null;
      positionHistory2RTRef.current = null;
      copyMaterialRef.current = null;
      copySceneRef.current = null;
      copyCameraRef.current = null;
    }

    return () => {
      // Dispose GPUComputationRenderer and its internal render targets
      gpuComputeRef.current?.dispose();
      gpuComputeRef.current = null;
      positionVariableRef.current = null;
      velocityVariableRef.current = null;

      textures.initialPosition.dispose();
      textures.initialVelocity.dispose();
      textures.bandOnsetsTexture.dispose();
      textures.spectrumTexture.dispose();
      bandOnsetsTextureRef.current = null;
      spectrumTextureRef.current = null;
      blackHolePosRef.current = null;
      blackHoleMassRef.current = null;
      blackHoleRadiusRef.current = null;

      // Dispose history resources
      positionHistory1RTRef.current?.dispose();
      positionHistory2RTRef.current?.dispose();
      copyMaterialRef.current?.dispose();
      positionHistory1RTRef.current = null;
      positionHistory2RTRef.current = null;
      copyMaterialRef.current = null;
      copySceneRef.current = null;
      copyCameraRef.current = null;
    };
  }, [gl, textures, enableHistory, textureSize]);

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

    // If audio data changed, upload textures once per frame at most.
    if (bandOnsetsDirtyRef.current && bandOnsetsTextureRef.current) {
      bandOnsetsTextureRef.current.needsUpdate = true;
      bandOnsetsDirtyRef.current = false;
    }
    if (spectrumDirtyRef.current && spectrumTextureRef.current) {
      spectrumTextureRef.current.needsUpdate = true;
      spectrumDirtyRef.current = false;
    }

    if (enableHistory) {
      // Shift position history ring buffer BEFORE physics compute
      // Order: history2 <- history1, history1 <- prevPosition
      const copyMaterial = copyMaterialRef.current;
      const copyScene = copySceneRef.current;
      const copyCamera = copyCameraRef.current;
      const history1RT = positionHistory1RTRef.current;
      const history2RT = positionHistory2RTRef.current;

      if (copyMaterial && copyScene && copyCamera && history1RT && history2RT) {
        // Copy history1 -> history2
        copyMaterial.uniforms.tSource.value = history1RT.texture;
        gl.setRenderTarget(history2RT);
        gl.render(copyScene, copyCamera);

        // Copy prevPosition (alternate RT) -> history1
        const prevPosTexture = gpuComputeRef.current.getAlternateRenderTarget(
          positionVariableRef.current
        ).texture;
        copyMaterial.uniforms.tSource.value = prevPosTexture;
        gl.setRenderTarget(history1RT);
        gl.render(copyScene, copyCamera);

        // Reset render target
        gl.setRenderTarget(null);
      }
    }

    // KICK-DRIFT-KICK (Leapfrog) Integration:
    try {
      // Pass 1: First KICK (half-step velocity update)
      velocityVariableRef.current.material.uniforms.uDoKick.value = true;
      positionVariableRef.current.material.uniforms.uDoDrift.value = false;
      gpuComputeRef.current.compute();

      // Pass 2: DRIFT (position update) + Second KICK (half-step velocity update)
      velocityVariableRef.current.material.uniforms.uDoKick.value = true;
      positionVariableRef.current.material.uniforms.uDoDrift.value = true;
      gpuComputeRef.current.compute();
    } catch (e) {
      console.error("GPU compute failed, triggering recovery:", e);
      onError?.();
    }

    // Sample particle stats periodically (every 500ms)
    const now = performance.now();
    if (now - lastParticleSampleRef.current > 500) {
      lastParticleSampleRef.current = now;
      const posRT = gpuComputeRef.current.getCurrentRenderTarget(positionVariableRef.current);
      const totalCount = textureSize * textureSize;

      // Lazy-init read buffer
      if (
        !particleReadBufferRef.current ||
        particleReadBufferRef.current.length !== totalCount * 4
      ) {
        particleReadBufferRef.current = new Float32Array(totalCount * 4);
      }

      gl.readRenderTargetPixels(
        posRT,
        0,
        0,
        textureSize,
        textureSize,
        particleReadBufferRef.current
      );

      // Count active particles (lifetime > 0, stored in .w component)
      let activeCount = 0;
      const data = particleReadBufferRef.current;
      for (let i = 0; i < totalCount; i++) {
        if (data[i * 4 + 3] > 0) activeCount++;
      }
      updateParticleStats(activeCount, totalCount);
    }
  });

  const getPositionTexture = useCallback((): THREE.Texture | null => {
    if (!gpuComputeRef.current || !positionVariableRef.current) return null;
    return gpuComputeRef.current.getCurrentRenderTarget(positionVariableRef.current).texture;
  }, []);

  const getPrevPositionTexture = useCallback((): THREE.Texture | null => {
    if (!gpuComputeRef.current || !positionVariableRef.current) return null;
    return gpuComputeRef.current.getAlternateRenderTarget(positionVariableRef.current).texture;
  }, []);

  const getVelocityTexture = useCallback((): THREE.Texture | null => {
    if (!gpuComputeRef.current || !velocityVariableRef.current) return null;
    return gpuComputeRef.current.getCurrentRenderTarget(velocityVariableRef.current).texture;
  }, []);

  const getPositionHistory1Texture = useCallback((): THREE.Texture | null => {
    return positionHistory1RTRef.current?.texture ?? null;
  }, []);

  const getPositionHistory2Texture = useCallback((): THREE.Texture | null => {
    return positionHistory2RTRef.current?.texture ?? null;
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
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uOrbitDecay.value = value;
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
      positionVariableRef.current.material.uniforms.uParticlesPerSecond.value = value;
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
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uEmitterSpread.value = value;
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
    const data = bandOnsetsTextureRef.current.image.data as Uint8Array;
    // Floor count to handle fractional values from GSAP tweens
    // Fractional indices corrupt texture by writing to wrong channel offsets
    const intCount = Math.floor(count);

    // Quantize onsets to bytes to reduce upload churn.
    // Expected onset range is ~[0..10] (clamped) -> [0..255].
    const maxOnset = 10;

    let changed = false;
    // Update active bands with onset values, sanitizing to prevent NaN/Infinity
    for (let i = 0; i < intCount && i < MAX_BANDS; i++) {
      const val = onsets[i];
      const clamped = Number.isFinite(val) ? Math.max(0, Math.min(val, maxOnset)) : 0;
      const next = Math.round((clamped / maxOnset) * 255);
      const idx = i * 4;
      if (data[idx] !== next) {
        data[idx] = next;
        changed = true;
      }
      if (data[idx + 3] !== 255) {
        data[idx + 3] = 255;
        changed = true;
      }
    }
    // Zero out unused bands to prevent stale values from persisting
    for (let i = intCount; i < MAX_BANDS; i++) {
      const idx = i * 4;
      if (data[idx] !== 0) {
        data[idx] = 0;
        changed = true;
      }
      if (data[idx + 3] !== 255) {
        data[idx + 3] = 255;
        changed = true;
      }
    }

    if (changed) {
      // Defer the actual GPU upload to the next compute tick so repeated calls in one frame coalesce.
      bandOnsetsDirtyRef.current = true;
    }
  }, []);

  const setSpectrum = useCallback((spectrum: Float32Array | undefined) => {
    if (!spectrumTextureRef.current) return;
    const data = spectrumTextureRef.current.image.data as Float32Array;

    let changed = false;

    // Allow clearing when audio is paused/disabled to avoid stale spectrum driving visuals.
    if (!spectrum) {
      for (let i = 0; i < SPECTRUM_SIZE; i++) {
        const idx = i * 4;
        if (data[idx] !== 0) {
          data[idx] = 0;
          changed = true;
        }
      }
      if (changed) {
        spectrumDirtyRef.current = true;
      }
      return;
    }

    const len = Math.min(spectrum.length, SPECTRUM_SIZE);
    for (let i = 0; i < len; i++) {
      // Spectrum values are 0-1 normalized
      const val = spectrum[i];
      const clamped = Number.isFinite(val) ? Math.max(0, Math.min(val, 1)) : 0;
      const idx = i * 4;
      if (data[idx] !== clamped) {
        data[idx] = clamped;
        changed = true;
      }
    }

    // Zero out unused bins to avoid stale values persisting when spectrum length shrinks.
    for (let i = len; i < SPECTRUM_SIZE; i++) {
      const idx = i * 4;
      if (data[idx] !== 0) {
        data[idx] = 0;
        changed = true;
      }
    }

    if (changed) {
      spectrumDirtyRef.current = true;
    }
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

  const setPositionBeatIntensity = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uBeatIntensity.value = value;
    }
  }, []);

  const setPositionBeatPulse = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uBeatPulse.value = value;
    }
  }, []);

  const setLifetimeGracePeriod = useCallback((value: number) => {
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uLifetimeGracePeriod.value = value;
    }
  }, []);

  const setLifetimeMax = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uLifetimeMax.value = value;
    }
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uLifetimeMax.value = value;
    }
  }, []);

  const setLifetimeGravityMultiplier = useCallback((value: number) => {
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uLifetimeGravityMultiplier.value = value;
    }
  }, []);

  const setBlackHoles = useCallback(
    (positions: THREE.Vector3[], masses: number[], radii: number[], count: number) => {
      const targetPos = blackHolePosRef.current;
      const targetMass = blackHoleMassRef.current;
      const targetRadius = blackHoleRadiusRef.current;
      if (!targetPos || !targetMass || !targetRadius) return;

      const clampedCount = Math.max(1, Math.min(Math.floor(count), 4));
      for (let i = 0; i < 4; i++) {
        if (i < clampedCount) {
          const p = positions[i];
          if (p) {
            targetPos[i].copy(p);
          } else {
            targetPos[i].set(0, 0, 0);
          }
          targetMass[i] = masses[i] ?? 0;
          targetRadius[i] = radii[i] ?? 0;
        } else {
          targetPos[i].set(0, 0, 0);
          targetMass[i] = 0;
          targetRadius[i] = 0;
        }
      }

      // Explicitly reassign all uniform values to trigger GPU upload
      // (vec3 array setters in Three.js have no mutation detection)
      if (positionVariableRef.current) {
        positionVariableRef.current.material.uniforms.uBlackHolePos.value = targetPos;
        positionVariableRef.current.material.uniforms.uBlackHoleMass.value = targetMass;
        positionVariableRef.current.material.uniforms.uBlackHoleRadius.value = targetRadius;
        positionVariableRef.current.material.uniforms.uBlackHoleCount.value = clampedCount;
      }
      if (velocityVariableRef.current) {
        velocityVariableRef.current.material.uniforms.uBlackHolePos.value = targetPos;
        velocityVariableRef.current.material.uniforms.uBlackHoleMass.value = targetMass;
        velocityVariableRef.current.material.uniforms.uBlackHoleRadius.value = targetRadius;
        velocityVariableRef.current.material.uniforms.uBlackHoleCount.value = clampedCount;
      }
    },
    []
  );

  // Register GPU setters for direct GSAP → GPU communication during tweens
  useEffect(() => {
    // Map preset paths to GPU setter functions
    registerGPUSetter("Black Hole.eventHorizonRadius", setEventHorizon);
    registerGPUSetter("Physics.gravity", setGravitationalParameter);
    registerGPUSetter("Physics.timeScale", setTimeScale);
    registerGPUSetter("Physics.softening", setSoftening);
    registerGPUSetter("Physics.orbitDecay", setOrbitDecay);
    registerGPUSetter("Physics.iscoStrength", setISCOStrength);
    registerGPUSetter("Physics.lifetimeGracePeriod", setLifetimeGracePeriod);
    registerGPUSetter("Physics.lifetimeMax", setLifetimeMax);
    registerGPUSetter("Physics.lifetimeGravityMultiplier", setLifetimeGravityMultiplier);
    registerGPUSetter("Emitters.emitRadius", setEmissionRadius);
    registerGPUSetter("Emitters.emitterCount", setEmitterCount);
    registerGPUSetter("Emitters.emitterAngle", setEmitterAngle);
    registerGPUSetter("Emitters.emitterTilt", setEmitterTilt);
    registerGPUSetter("Emitters.inwardAngle", setInwardAngle);
    registerGPUSetter("Emitters.spawnRate", setSpawnRate);
    registerGPUSetter("Emitters.emitterSpread", setEmitterSpread);
    registerGPUSetter("Audio.amplitude", setAudioAmplitude);
    registerGPUSetter("Audio.beatRepulsion", setBeatRepulsion);

    return () => clearGPUSetters();
  }, [
    setEventHorizon,
    setGravitationalParameter,
    setTimeScale,
    setSoftening,
    setOrbitDecay,
    setISCOStrength,
    setLifetimeGracePeriod,
    setLifetimeMax,
    setLifetimeGravityMultiplier,
    setEmissionRadius,
    setEmitterCount,
    setEmitterAngle,
    setEmitterTilt,
    setInwardAngle,
    setSpawnRate,
    setEmitterSpread,
    setAudioAmplitude,
    setBeatRepulsion,
  ]);

  return {
    getPositionTexture,
    getPrevPositionTexture,
    getPositionHistory1Texture,
    getPositionHistory2Texture,
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
    setSpectrum,
    setAudioAmplitude,
    setPaletteOffset,
    setHFCBoost,
    setSpawnBurst,
    setPositionBeatIntensity,
    setPositionBeatPulse,
    setLifetimeGracePeriod,
    setLifetimeMax,
    setLifetimeGravityMultiplier,
    setBlackHoles,
  };
}
