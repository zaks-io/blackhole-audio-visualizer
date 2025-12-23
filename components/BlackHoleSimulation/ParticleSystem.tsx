"use client";

import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGPUCompute } from "@/hooks/useGPUCompute";
import { DEFAULT_TEXTURE_SIZE } from "@/lib/gpu/verletPhysics";
import particleVertexShader from "@/shaders/particles/particleVertex.glsl";
import particleFragmentShader from "@/shaders/particles/particleFragment.glsl";
import { getAllColors } from "@/components/ColorModeSystem";
import { useVisualizationControls, getAnimatedState } from "@/hooks/useVisualizationControls";

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
    getPrevPositionTexture,
    getPositionHistory1Texture,
    getPositionHistory2Texture,
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
    setSpectrum,
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
    motionBlurTaper: number;
    motionBlurFade: number;
    brightness: number;
    alpha: number;
    maxDistance: number;
    eventHorizonRadius: number;
    iscoRadius: number;
  } | null>(null);

  const quadGeometry = useMemo(() => {
    // Multi-segment trail: 8 rows x 2 columns = 16 vertices, 7 segments
    // Row y positions map to Catmull-Rom spline parameter t: 0 (tail) to 1 (head)
    const rows = 8;
    const quadPositions = new Float32Array(rows * 2 * 3);
    const quadUVs = new Float32Array(rows * 2 * 2);

    for (let r = 0; r < rows; r++) {
      const y = -0.5 + r / (rows - 1); // -0.5 to 0.5
      const v = r / (rows - 1); // 0 to 1 for UV
      // Left vertex
      quadPositions[r * 6 + 0] = -0.5;
      quadPositions[r * 6 + 1] = y;
      quadPositions[r * 6 + 2] = 0;
      quadUVs[r * 4 + 0] = 0;
      quadUVs[r * 4 + 1] = v;
      // Right vertex
      quadPositions[r * 6 + 3] = 0.5;
      quadPositions[r * 6 + 4] = y;
      quadPositions[r * 6 + 5] = 0;
      quadUVs[r * 4 + 2] = 1;
      quadUVs[r * 4 + 3] = v;
    }

    // Generate indices for 7 segments (14 triangles)
    const indices = new Uint16Array((rows - 1) * 6);
    for (let r = 0; r < rows - 1; r++) {
      const baseVertex = r * 2;
      const baseIndex = r * 6;
      // First triangle
      indices[baseIndex + 0] = baseVertex;
      indices[baseIndex + 1] = baseVertex + 1;
      indices[baseIndex + 2] = baseVertex + 3;
      // Second triangle
      indices[baseIndex + 3] = baseVertex;
      indices[baseIndex + 4] = baseVertex + 3;
      indices[baseIndex + 5] = baseVertex + 2;
    }

    const geo = new THREE.InstancedBufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(quadPositions, 3));
    geo.setAttribute("uv", new THREE.BufferAttribute(quadUVs, 2));
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
    };
  }, [colorLUT, quadGeometry]);

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
      uMotionBlurTaper: { value: initialControls.motionBlurTaper },
      uMotionBlurFade: { value: initialControls.motionBlurFade },
      uBrightness: { value: initialControls.brightness },
      uAlpha: { value: initialControls.alpha },
      uColorLUT: { value: colorLUT.tex },
      uColorLUTSize: { value: colorLUT.size },
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
    [colorLUT]
  );

  useFrame(() => {
    const state = getAnimatedState();
    const iscoRadius = state.eventHorizonRadius * state.iscoRatio;

    if (materialRef.current) {
      const posTexture = getPositionTexture();
      const prevPosTexture = getPrevPositionTexture();
      const history1Texture = getPositionHistory1Texture();
      const history2Texture = getPositionHistory2Texture();
      const velTexture = getVelocityTexture();
      if (posTexture) {
        materialRef.current.uniforms.texturePosition.value = posTexture;
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
          eventHorizonRadius: state.eventHorizonRadius,
          iscoRadius,
        };
        materialRef.current.uniforms.uBaseSize.value = state.pointSize;
        materialRef.current.uniforms.uMotionBlurTaper.value = state.motionBlurTaper;
        materialRef.current.uniforms.uMotionBlurFade.value = state.motionBlurFade;
        materialRef.current.uniforms.uBrightness.value = state.brightness;
        materialRef.current.uniforms.uAlpha.value = state.alpha;
        materialRef.current.uniforms.uMaxDistance.value = state.maxDistance;
        materialRef.current.uniforms.uEventHorizon.value = state.eventHorizonRadius;
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
        if (prevR.eventHorizonRadius !== state.eventHorizonRadius) {
          prevR.eventHorizonRadius = state.eventHorizonRadius;
          materialRef.current.uniforms.uEventHorizon.value = state.eventHorizonRadius;
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
      setSpectrum(audioData.spectrum);
      // Use synchronized beat from BlackHoleSimulation (already clamped)
      const beat = audioData.beatIntensity ?? 0;
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
    <mesh frustumCulled={false} geometry={quadGeometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
