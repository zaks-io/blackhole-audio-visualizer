"use client";

import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useGPUCompute } from "@/hooks/useGPUCompute";
import { DEFAULT_TEXTURE_SIZE } from "@/lib/gpu/verletPhysics";
import particleVertexShader from "@/shaders/particles/particleVertex.glsl";
import particleFragmentShader from "@/shaders/particles/particleFragment.glsl";
import particleDensityVertexShader from "@/shaders/particles/particleDensityVertex.glsl";
import particleDensityFragmentShader from "@/shaders/particles/particleDensityFragment.glsl";
import { getAllColors } from "@/components/ColorModeSystem";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import { runtimeState } from "@/lib/runtimeStateRegistry";
import { GpuTimerQuery } from "@/lib/perf/gpuTimerQuery";
import { useFPSStore } from "@/hooks/useFPSMonitor";

const DEFAULT_ALL_COLORS = getAllColors();

interface ParticleAudioData {
  bandEnergies: Float32Array;
  bandOnsets: Float32Array;
  bandCount: number;
  spectrum?: Float32Array;
  hfcBoost: number;
  spawnBurst: number;
  beatIntensity: number;
}

interface BlackHoleData {
  positions: THREE.Vector3[];
  masses: number[];
  radii: number[];
  count: number;
  prevPositions: THREE.Vector3[];
  history1Positions: THREE.Vector3[];
  history2Positions: THREE.Vector3[];
}

interface ParticleSystemProps {
  allColors?: string[];
  getAudioData: () => ParticleAudioData;
  audioEnabled: boolean;
  getBlackHoleData: () => BlackHoleData;
  enableHistory?: boolean;
  resolutionScale?: number;
  desktopAdvancedMode?: boolean;
  onGPUError?: () => void;
}

export function ParticleSystem({
  allColors = DEFAULT_ALL_COLORS,
  getAudioData,
  audioEnabled,
  getBlackHoleData,
  enableHistory = true,
  resolutionScale = 1,
  desktopAdvancedMode = false,
  onGPUError,
}: ParticleSystemProps) {
  // Debug: visualize position fractional components to detect quantization.
  // 0 = off, 1..3 = increasing scale. Toggle with 'd' key, or set URL param ?debugParticles=1
  const [debugMode, setDebugMode] = useState(0);

  // Read texture size only on mount - changing it requires full rebuild
  const textureSize = useVisualizationControls.getState().textureSize || DEFAULT_TEXTURE_SIZE;
  const particleCount = textureSize * textureSize;

  const {
    getPositionTexture,
    getPrevPositionTexture,
    getPositionHistory1Texture,
    getPositionHistory2Texture,
    getVelocityTexture,
    setGravitationalParameter,
    setTimeScale,
    setEventHorizon,
    setSoftening,
    setOrbitDecay,
    setFrameDragging,
    setEmissionRadius,
    setEmitterCount,
    setEmitterAngle,
    setEmitterTilt,
    setSpawnRate,
    setInwardAngle,
    setISCORadius,
    setISCOStrength,
    setEmitterSpread,
    setEmissionShape,
    setEmitterLineY,
    setEmitterLineWidth,
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
  } = useGPUCompute(textureSize, { enableHistory, onError: onGPUError });

  const { gl, size, camera } = useThree();
  const setParticleGpuMs = useFPSStore((s) => s.setParticleGpuMs);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const particleTimerRef = useRef<GpuTimerQuery | null>(null);
  const densitySceneRef = useRef<THREE.Scene | null>(null);
  const densityMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const densityRTRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const denseGuardActiveRef = useRef(false);
  const denseGuardValueRef = useRef(0);
  const denseGuardLowFramesRef = useRef(0);
  const denseGuardHighFramesRef = useRef(0);
  const prevFirstColorRef = useRef<string>(allColors[0]);
  const emptyOnsetsRef = useRef<Float32Array>(new Float32Array(36));
  const prevControlsRef = useRef<{
    paletteOffset: number;
    gravity: number;
    timeScale: number;
    eventHorizonRadius: number;
    softening: number;
    orbitDecay: number;
    frameDragging: number;
    emitRadius: number;
    emitterCount: number;
    emitterAngle: number;
    emitterTilt: number;
    spawnRate: number;
    inwardAngle: number;
    iscoStrength: number;
    emitterSpread: number;
    emissionShape: number;
    emitterLineY: number;
    emitterLineWidth: number;
    amplitude: number;
    beatRepulsion: number;
    beatPulse: number;
    lifetimeGracePeriod: number;
    lifetimeMax: number;
    lifetimeGravityMultiplier: number;
  } | null>(null);
  const prevAudioEnabledRef = useRef<boolean>(audioEnabled);
  const prevDisabledEmitterCountRef = useRef<number>(-1);
  const prevDisabledIscoRadiusRef = useRef<number | null>(null);
  const prevResolutionScaleRef = useRef<number>(resolutionScale);
  const prevDebugModeRef = useRef<number>(debugMode);

  useEffect(() => {
    // Initialize from URL param
    try {
      const params = new URLSearchParams(window.location.search);
      const enabled = params.get("debugParticles");
      if (enabled && enabled !== "0") setDebugMode(1);

      // Only enable 'd' shortcut when debug param is present
      if (!params.has("debug")) return;
    } catch {
      // Ignore (non-browser env)
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "d") return;
      setDebugMode((m) => (m + 1) % 4);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Threshold-based dirty checking for audio uniforms to reduce GPU updates
  const AUDIO_THRESHOLDS = {
    beatIntensity: 0.01,
    hfcBoost: 0.02,
    spawnBurst: 0.05,
    iscoRadius: 0.1,
  };
  const prevAudioValuesRef = useRef({
    beatIntensity: 0,
    hfcBoost: 0,
    spawnBurst: 1,
    iscoRadiusDerived: 0,
  });
  const prevRenderUniformsRef = useRef<{
    pointSize: number;
    motionBlurTaper: number;
    motionBlurFade: number;
    brightness: number;
    alpha: number;
    maxDistance: number;
    densityScale: number;
    centerBiasStrength: number;
    particleLensingStrength: number;
    iscoRadius: number;
  } | null>(null);

  const quadGeometry = useMemo(() => {
    // Cross-billboard trail: 2 perpendicular ribbons x 16 rows x 2 columns = 64 vertices
    // Row y positions map to Catmull-Rom spline parameter t: 0 (tail) to 1 (head)
    const rows = 16;
    const ribbons = 2;
    const verticesPerRibbon = rows * 2;
    const totalVertices = ribbons * verticesPerRibbon;

    const quadPositions = new Float32Array(totalVertices * 3);
    const quadUVs = new Float32Array(totalVertices * 2);
    const crossIndices = new Float32Array(totalVertices);

    for (let ribbon = 0; ribbon < ribbons; ribbon++) {
      const offset = ribbon * verticesPerRibbon;
      for (let r = 0; r < rows; r++) {
        const y = -0.6 + (r / (rows - 1)) * 1.2; // -0.6 to 0.6
        const v = r / (rows - 1); // 0 to 1 for UV
        const idx = offset + r * 2;

        // Left vertex
        quadPositions[(idx + 0) * 3 + 0] = -0.6;
        quadPositions[(idx + 0) * 3 + 1] = y;
        quadPositions[(idx + 0) * 3 + 2] = 0;
        quadUVs[(idx + 0) * 2 + 0] = 0;
        quadUVs[(idx + 0) * 2 + 1] = v;
        crossIndices[idx + 0] = ribbon;

        // Right vertex
        quadPositions[(idx + 1) * 3 + 0] = 0.6;
        quadPositions[(idx + 1) * 3 + 1] = y;
        quadPositions[(idx + 1) * 3 + 2] = 0;
        quadUVs[(idx + 1) * 2 + 0] = 1;
        quadUVs[(idx + 1) * 2 + 1] = v;
        crossIndices[idx + 1] = ribbon;
      }
    }

    // Generate indices for both ribbons
    const indicesPerRibbon = (rows - 1) * 6;
    const indices = new Uint16Array(ribbons * indicesPerRibbon);
    for (let ribbon = 0; ribbon < ribbons; ribbon++) {
      const vertexOffset = ribbon * verticesPerRibbon;
      const indexOffset = ribbon * indicesPerRibbon;
      for (let r = 0; r < rows - 1; r++) {
        const baseVertex = vertexOffset + r * 2;
        const baseIndex = indexOffset + r * 6;
        // First triangle
        indices[baseIndex + 0] = baseVertex;
        indices[baseIndex + 1] = baseVertex + 1;
        indices[baseIndex + 2] = baseVertex + 3;
        // Second triangle
        indices[baseIndex + 3] = baseVertex;
        indices[baseIndex + 4] = baseVertex + 3;
        indices[baseIndex + 5] = baseVertex + 2;
      }
    }

    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(quadPositions, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(quadUVs, 2));
    geo.setAttribute("crossIndex", new THREE.BufferAttribute(crossIndices, 1));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));

    // Instance attribute: texture lookup UVs (one per particle)
    const refs = new Float32Array(particleCount * 2);
    for (let i = 0; i < particleCount; i++) {
      refs[i * 2] = ((i % textureSize) + 0.5) / textureSize;
      refs[i * 2 + 1] = (Math.floor(i / textureSize) + 0.5) / textureSize;
    }
    geo.setAttribute("reference", new THREE.InstancedBufferAttribute(refs, 2));
    geo.instanceCount = particleCount;

    return geo;
  }, [particleCount, textureSize]);

  const densityGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const refs = new Float32Array(particleCount * 2);
    for (let i = 0; i < particleCount; i++) {
      refs[i * 2] = ((i % textureSize) + 0.5) / textureSize;
      refs[i * 2 + 1] = (Math.floor(i / textureSize) + 0.5) / textureSize;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("reference", new THREE.BufferAttribute(refs, 2));
    return geo;
  }, [particleCount, textureSize]);

  // Create color array for shader (all palettes)
  const colorLUT = useMemo(() => {
    // Keep this stable; update the underlying data when the palette changes.
    const size = allColors.length;
    // Use byte texture to reduce upload cost and avoid float-texture compatibility issues in the render path.
    const data = new Uint8Array(size * 4);
    const tmp = new THREE.Color();
    for (let i = 0; i < size; i++) {
      tmp.set(allColors[i]);
      data[i * 4 + 0] = Math.max(0, Math.min(255, Math.round(tmp.r * 255)));
      data[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(tmp.g * 255)));
      data[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(tmp.b * 255)));
      data[i * 4 + 3] = 255;
    }

    const tex = new THREE.DataTexture(data, size, 1, THREE.RGBAFormat, THREE.UnsignedByteType);
    tex.needsUpdate = true;
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;

    return { tex, data, size, tmp };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      colorLUT.tex.dispose();
      quadGeometry.dispose();
      densityGeometry.dispose();
    };
  }, [colorLUT, quadGeometry, densityGeometry]);

  useEffect(() => {
    const timer = new GpuTimerQuery();
    timer.init(gl.getContext());
    particleTimerRef.current = timer;

    const densityScene = new THREE.Scene();
    const densityMaterial = new THREE.ShaderMaterial({
      vertexShader: particleDensityVertexShader,
      fragmentShader: particleDensityFragmentShader,
      uniforms: {
        texturePosition: { value: null as THREE.Texture | null },
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      depthWrite: false,
    });
    const densityPoints = new THREE.Points(densityGeometry, densityMaterial);
    densityPoints.frustumCulled = false;
    densityScene.add(densityPoints);

    const densitySize = desktopAdvancedMode ? 256 : 192;
    const densityRT = new THREE.WebGLRenderTarget(densitySize, densitySize, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType,
      depthBuffer: false,
      stencilBuffer: false,
    });

    densitySceneRef.current = densityScene;
    densityMaterialRef.current = densityMaterial;
    densityRTRef.current = densityRT;

    return () => {
      particleTimerRef.current?.dispose(gl.getContext());
      particleTimerRef.current = null;
      densityRT.dispose();
      densityMaterial.dispose();
      densitySceneRef.current = null;
      densityMaterialRef.current = null;
      densityRTRef.current = null;
    };
  }, [densityGeometry, desktopAdvancedMode, gl]);

  // Get initial values for uniforms to prevent flicker
  const initialControls = useVisualizationControls.getState();

  const uniforms = useMemo(
    () => ({
      texturePosition: { value: null as THREE.Texture | null },
      texturePrevPosition: { value: null as THREE.Texture | null },
      textureHistory1: { value: null as THREE.Texture | null },
      textureHistory2: { value: null as THREE.Texture | null },
      textureVelocity: { value: null as THREE.Texture | null },
      uBaseSize: { value: initialControls.pointSize },
      uResolutionScale: { value: resolutionScale },
      uMotionBlurTaper: { value: initialControls.motionBlurTaper },
      uMotionBlurFade: { value: initialControls.motionBlurFade },
      uBrightness: { value: initialControls.brightness },
      uAlpha: { value: initialControls.alpha },
      uColorLUT: { value: colorLUT.tex },
      uColorLUTSize: { value: colorLUT.size },
      uMaxDistance: { value: initialControls.maxDistance },
      uDensityTexture: { value: null as THREE.Texture | null },
      uDensityTexel: { value: new THREE.Vector2(1 / 192, 1 / 192) },
      uDensityScale: { value: initialControls.densityScale ?? 2.5 },
      uDenseGuardStrength: { value: 0.0 },
      uCenterBiasStrength: { value: 0.35 },
      uDebugMode: { value: 0.0 },
      // Viewport in *device pixels* for screen-space stabilization / AA.
      uViewport: { value: new THREE.Vector2(1, 1) },
      uBlackHolePos: {
        value: [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0),
        ],
      },
      uBlackHolePrevPos: {
        value: [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0),
        ],
      },
      uBlackHoleHist1Pos: {
        value: [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0),
        ],
      },
      uBlackHoleHist2Pos: {
        value: [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(0, 0, 0),
        ],
      },
      uBlackHoleRadius: { value: [5, 5, 5, 5] },
      uBlackHoleCount: { value: 1 },
      uParticleLensingStrength: { value: initialControls.particleLensingStrength ?? 0.5 },
      uISCORadius: { value: initialControls.eventHorizonRadius * initialControls.iscoRatio },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [colorLUT, desktopAdvancedMode, resolutionScale]
  );

  useFrame(() => {
    // Read from runtimeState instead of store for performance during tweens
    const state = runtimeState;
    const iscoRadius = state.eventHorizonRadius * state.iscoRatio;
    const fps = useFPSStore.getState().fps;
    const enterFps = state.denseGuardEnterFps ?? 50;
    const exitFps = state.denseGuardExitFps ?? 56;
    const enterFrames = state.denseGuardEnterFrames ?? 12;
    const exitFrames = state.denseGuardExitFrames ?? 24;

    if (!denseGuardActiveRef.current) {
      if (fps < enterFps) {
        denseGuardLowFramesRef.current += 1;
      } else {
        denseGuardLowFramesRef.current = 0;
      }
      if (denseGuardLowFramesRef.current >= enterFrames) {
        denseGuardActiveRef.current = true;
        denseGuardLowFramesRef.current = 0;
      }
    } else {
      if (fps > exitFps) {
        denseGuardHighFramesRef.current += 1;
      } else {
        denseGuardHighFramesRef.current = 0;
      }
      if (denseGuardHighFramesRef.current >= exitFrames) {
        denseGuardActiveRef.current = false;
        denseGuardHighFramesRef.current = 0;
      }
    }

    const denseGuardTarget = denseGuardActiveRef.current ? 1 : 0;
    denseGuardValueRef.current += (denseGuardTarget - denseGuardValueRef.current) * 0.08;
    const denseGuardStrength = denseGuardValueRef.current * (state.denseGuardStrength ?? 1.0);
    const densityScale = state.densityScale;
    const centerBiasStrength = state.denseCenterBias;

    if (materialRef.current) {
      // Resolution scale is derived from Canvas DPR/resolution selection; update only if changed.
      if (prevResolutionScaleRef.current !== resolutionScale) {
        prevResolutionScaleRef.current = resolutionScale;
        materialRef.current.uniforms.uResolutionScale.value = resolutionScale;
      }
      // Keep viewport uniform in device pixels (includes DPR) so screen-space math is stable.
      const dpr = gl.getPixelRatio();
      materialRef.current.uniforms.uViewport.value.set(size.width * dpr, size.height * dpr);
      materialRef.current.uniforms.uDenseGuardStrength.value = THREE.MathUtils.clamp(
        denseGuardStrength,
        0,
        1
      );

      // Debug mode toggle (avoid redundant uniform writes)
      if (prevDebugModeRef.current !== debugMode) {
        prevDebugModeRef.current = debugMode;
        materialRef.current.uniforms.uDebugMode.value = debugMode;
      }

      const posTexture = getPositionTexture();
      const prevPosTexture = getPrevPositionTexture();
      const history1Texture = getPositionHistory1Texture();
      const history2Texture = getPositionHistory2Texture();
      const velTexture = getVelocityTexture();
      if (posTexture) {
        materialRef.current.uniforms.texturePosition.value = posTexture;

        const densityMaterial = densityMaterialRef.current;
        const densityScene = densitySceneRef.current;
        const densityRT = densityRTRef.current;
        if (densityMaterial && densityScene && densityRT) {
          densityMaterial.uniforms.texturePosition.value = posTexture;
          const prevTarget = gl.getRenderTarget();
          const prevClearAlpha = gl.getClearAlpha();
          const prevClearColor = gl.getClearColor(new THREE.Color());
          gl.setRenderTarget(densityRT);
          gl.setClearColor(0x000000, 0);
          gl.clear(true, false, false);
          gl.render(densityScene, camera);
          gl.setRenderTarget(prevTarget);
          gl.setClearColor(prevClearColor, prevClearAlpha);

          materialRef.current.uniforms.uDensityTexture.value = densityRT.texture;
          materialRef.current.uniforms.uDensityTexel.value.set(
            1 / densityRT.width,
            1 / densityRT.height
          );
        }
      }
      if (prevPosTexture) {
        materialRef.current.uniforms.texturePrevPosition.value = prevPosTexture;
      }
      if (history1Texture) {
        materialRef.current.uniforms.textureHistory1.value = history1Texture;
      }
      if (history2Texture) {
        materialRef.current.uniforms.textureHistory2.value = history2Texture;
      }
      if (velTexture) {
        materialRef.current.uniforms.textureVelocity.value = velTexture;
      }

      // Dirty updates for numeric uniforms (avoid redundant uniform writes)
      if (!prevRenderUniformsRef.current) {
        prevRenderUniformsRef.current = {
          pointSize: state.pointSize,
          motionBlurTaper: state.motionBlurTaper,
          motionBlurFade: state.motionBlurFade,
          brightness: state.brightness,
          alpha: state.alpha,
          maxDistance: state.maxDistance,
          densityScale,
          centerBiasStrength,
          particleLensingStrength: state.particleLensingStrength,
          iscoRadius,
        };
        materialRef.current.uniforms.uBaseSize.value = state.pointSize;
        materialRef.current.uniforms.uMotionBlurTaper.value = state.motionBlurTaper;
        materialRef.current.uniforms.uMotionBlurFade.value = state.motionBlurFade;
        materialRef.current.uniforms.uBrightness.value = state.brightness;
        materialRef.current.uniforms.uAlpha.value = state.alpha;
        materialRef.current.uniforms.uMaxDistance.value = state.maxDistance;
        materialRef.current.uniforms.uDensityScale.value = densityScale;
        materialRef.current.uniforms.uCenterBiasStrength.value = centerBiasStrength;
        materialRef.current.uniforms.uParticleLensingStrength.value = state.particleLensingStrength;
        materialRef.current.uniforms.uISCORadius.value = iscoRadius;
      } else {
        const prevR = prevRenderUniformsRef.current;
        if (prevR.pointSize !== state.pointSize) {
          prevR.pointSize = state.pointSize;
          materialRef.current.uniforms.uBaseSize.value = state.pointSize;
        }
        if (prevR.motionBlurTaper !== state.motionBlurTaper) {
          prevR.motionBlurTaper = state.motionBlurTaper;
          materialRef.current.uniforms.uMotionBlurTaper.value = state.motionBlurTaper;
        }
        if (prevR.motionBlurFade !== state.motionBlurFade) {
          prevR.motionBlurFade = state.motionBlurFade;
          materialRef.current.uniforms.uMotionBlurFade.value = state.motionBlurFade;
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
        if (prevR.densityScale !== densityScale) {
          prevR.densityScale = densityScale;
          materialRef.current.uniforms.uDensityScale.value = densityScale;
        }
        if (prevR.centerBiasStrength !== centerBiasStrength) {
          prevR.centerBiasStrength = centerBiasStrength;
          materialRef.current.uniforms.uCenterBiasStrength.value = centerBiasStrength;
        }
        if (prevR.particleLensingStrength !== state.particleLensingStrength) {
          prevR.particleLensingStrength = state.particleLensingStrength;
          materialRef.current.uniforms.uParticleLensingStrength.value =
            state.particleLensingStrength;
        }
        if (prevR.iscoRadius !== iscoRadius) {
          prevR.iscoRadius = iscoRadius;
          materialRef.current.uniforms.uISCORadius.value = iscoRadius;
        }
      }

      // Only update LUT if palette actually changed (check first color)
      const firstColor = allColors[0];
      if (prevFirstColorRef.current !== firstColor) {
        prevFirstColorRef.current = firstColor;

        // Update in-place to avoid reallocations / uniform array churn.
        const size = colorLUT.size;
        if (allColors.length === size) {
          for (let i = 0; i < size; i++) {
            colorLUT.tmp.set(allColors[i]);
            colorLUT.data[i * 4 + 0] = Math.max(0, Math.min(255, Math.round(colorLUT.tmp.r * 255)));
            colorLUT.data[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(colorLUT.tmp.g * 255)));
            colorLUT.data[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(colorLUT.tmp.b * 255)));
            colorLUT.data[i * 4 + 3] = 255;
          }
          colorLUT.tex.needsUpdate = true;
        }
      }
    }

    // Dirty updates: only touch GPU uniforms when values actually change
    if (!prevControlsRef.current) {
      prevControlsRef.current = {
        paletteOffset: state.colorPaletteOffset,
        gravity: state.gravity,
        timeScale: state.timeScale,
        eventHorizonRadius: state.eventHorizonRadius,
        softening: state.softening,
        orbitDecay: state.orbitDecay,
        frameDragging: state.frameDragging,
        emitRadius: state.emitRadius,
        emitterCount: state.emitterCount,
        emitterAngle: state.emitterAngle,
        emitterTilt: state.emitterTilt,
        spawnRate: state.spawnRate,
        inwardAngle: state.inwardAngle,
        iscoStrength: state.iscoStrength,
        emitterSpread: state.emitterSpread,
        emissionShape: state.emissionShape,
        emitterLineY: state.emitterLineY,
        emitterLineWidth: state.emitterLineWidth,
        amplitude: state.amplitude,
        beatRepulsion: state.beatRepulsion,
        beatPulse: state.beatPulse,
        lifetimeGracePeriod: state.lifetimeGracePeriod,
        lifetimeMax: state.lifetimeMax,
        lifetimeGravityMultiplier: state.lifetimeGravityMultiplier,
      };

      setPaletteOffset(state.colorPaletteOffset);
      setGravitationalParameter(state.gravity);
      setTimeScale(state.timeScale);
      setEventHorizon(state.eventHorizonRadius);
      setSoftening(state.softening);
      setOrbitDecay(state.orbitDecay);
      setFrameDragging(state.frameDragging);
      setEmissionRadius(state.emitRadius);
      setEmitterCount(state.emitterCount);
      setEmitterAngle(state.emitterAngle);
      setEmitterTilt(state.emitterTilt);
      setSpawnRate(state.spawnRate);
      setInwardAngle(state.inwardAngle);
      setISCOStrength(state.iscoStrength);
      setEmitterSpread(state.emitterSpread);
      setEmissionShape(state.emissionShape);
      setEmitterLineY(state.emitterLineY);
      setEmitterLineWidth(state.emitterLineWidth);
      setAudioAmplitude(state.amplitude);
      setBeatRepulsion(state.beatRepulsion);
      setPositionBeatPulse(state.beatPulse);
      setLifetimeGracePeriod(state.lifetimeGracePeriod);
      setLifetimeMax(state.lifetimeMax);
      setLifetimeGravityMultiplier(state.lifetimeGravityMultiplier);
    } else {
      const prev = prevControlsRef.current;
      if (prev.paletteOffset !== state.colorPaletteOffset) {
        prev.paletteOffset = state.colorPaletteOffset;
        setPaletteOffset(state.colorPaletteOffset);
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
      if (prev.frameDragging !== state.frameDragging) {
        prev.frameDragging = state.frameDragging;
        setFrameDragging(state.frameDragging);
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
      if (prev.emissionShape !== state.emissionShape) {
        prev.emissionShape = state.emissionShape;
        setEmissionShape(state.emissionShape);
      }
      if (prev.emitterLineY !== state.emitterLineY) {
        prev.emitterLineY = state.emitterLineY;
        setEmitterLineY(state.emitterLineY);
      }
      if (prev.emitterLineWidth !== state.emitterLineWidth) {
        prev.emitterLineWidth = state.emitterLineWidth;
        setEmitterLineWidth(state.emitterLineWidth);
      }
      if (prev.amplitude !== state.amplitude) {
        prev.amplitude = state.amplitude;
        setAudioAmplitude(state.amplitude);
      }
      if (prev.beatRepulsion !== state.beatRepulsion) {
        prev.beatRepulsion = state.beatRepulsion;
        setBeatRepulsion(state.beatRepulsion);
      }
      if (prev.beatPulse !== state.beatPulse) {
        prev.beatPulse = state.beatPulse;
        setPositionBeatPulse(state.beatPulse);
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

    // Update black hole positions, masses, and radii
    const blackHoleData = getBlackHoleData();
    setBlackHoles(
      blackHoleData.positions,
      blackHoleData.masses,
      blackHoleData.radii,
      blackHoleData.count
    );

    // Update render shader uniforms for black hole positions, history, and pulsed radii
    if (materialRef.current) {
      const u = materialRef.current.uniforms;
      for (let i = 0; i < 4; i++) {
        if (i < blackHoleData.count) {
          u.uBlackHolePos.value[i].copy(blackHoleData.positions[i]);
          u.uBlackHolePrevPos.value[i].copy(blackHoleData.prevPositions[i]);
          u.uBlackHoleHist1Pos.value[i].copy(blackHoleData.history1Positions[i]);
          u.uBlackHoleHist2Pos.value[i].copy(blackHoleData.history2Positions[i]);
          u.uBlackHoleRadius.value[i] = blackHoleData.radii[i];
        } else {
          u.uBlackHolePos.value[i].set(0, 0, 0);
          u.uBlackHolePrevPos.value[i].set(0, 0, 0);
          u.uBlackHoleHist1Pos.value[i].set(0, 0, 0);
          u.uBlackHoleHist2Pos.value[i].set(0, 0, 0);
          u.uBlackHoleRadius.value[i] = 0;
        }
      }
      u.uBlackHoleCount.value = blackHoleData.count;
    }

    const audioTransitioned = prevAudioEnabledRef.current !== audioEnabled;
    if (audioTransitioned) {
      prevAudioEnabledRef.current = audioEnabled;
      // Ensure we refresh the disabled-band write when toggling off.
      if (!audioEnabled) prevDisabledEmitterCountRef.current = -1;
    }

    if (audioEnabled) {
      const audioData = getAudioData();
      // Band onsets and spectrum already have internal dirty-checking in useGPUCompute
      setBandOnsets(audioData.bandOnsets, audioData.bandCount);
      setSpectrum(audioData.spectrum);

      // Threshold-based dirty checking for audio uniforms to reduce GPU updates
      const beat = audioData.beatIntensity ?? 0;
      const prev = prevAudioValuesRef.current;

      if (Math.abs(beat - prev.beatIntensity) > AUDIO_THRESHOLDS.beatIntensity) {
        prev.beatIntensity = beat;
        setBeatIntensity(beat);
        setPositionBeatIntensity(beat);
      }

      const derivedIsco = iscoRadius * (1 + beat * state.beatPulse);
      if (Math.abs(derivedIsco - prev.iscoRadiusDerived) > AUDIO_THRESHOLDS.iscoRadius) {
        prev.iscoRadiusDerived = derivedIsco;
        setISCORadius(derivedIsco);
      }

      if (Math.abs(audioData.hfcBoost - prev.hfcBoost) > AUDIO_THRESHOLDS.hfcBoost) {
        prev.hfcBoost = audioData.hfcBoost;
        setHFCBoost(audioData.hfcBoost);
      }

      if (Math.abs(audioData.spawnBurst - prev.spawnBurst) > AUDIO_THRESHOLDS.spawnBurst) {
        prev.spawnBurst = audioData.spawnBurst;
        setSpawnBurst(audioData.spawnBurst);
      }
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
        setPositionBeatIntensity(0);
        setHFCBoost(0);
        setSpawnBurst(1);
        // Clear spectrum so spawn-time audioEnergy doesn't keep oscillating after pause.
        setSpectrum(undefined);
      }
      // ISCO radius can change due to UI while disabled; update only when it changes.
      if (prevDisabledIscoRadiusRef.current !== iscoRadius) {
        prevDisabledIscoRadiusRef.current = iscoRadius;
        setISCORadius(iscoRadius);
      }
    }
  });

  const handleBeforeRender = useCallback((renderer: THREE.WebGLRenderer) => {
    const timer = particleTimerRef.current;
    if (!timer) return;
    timer.beginCpu();
    timer.begin(renderer.getContext());
  }, []);

  const handleAfterRender = useCallback(
    (renderer: THREE.WebGLRenderer) => {
      const timer = particleTimerRef.current;
      if (!timer) return;
      timer.end(renderer.getContext());
      timer.endCpu();
      setParticleGpuMs(timer.poll(renderer.getContext()));
    },
    [setParticleGpuMs]
  );

  return (
    <mesh
      frustumCulled={false}
      geometry={quadGeometry}
      onBeforeRender={handleBeforeRender}
      onAfterRender={handleAfterRender}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        uniforms={uniforms}
        transparent
        dithering
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
