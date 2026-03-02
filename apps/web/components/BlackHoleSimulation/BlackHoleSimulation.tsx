"use client";

import { Suspense, useRef, useEffect, useMemo, useCallback } from "react";
import { Environment } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useShallow } from "zustand/shallow";
import * as THREE from "three";
import { ParticleSystem } from "./ParticleSystem";
import { BlackHole } from "./BlackHole";
import { CameraSystem } from "@/components/CameraSystem";
import { StarField } from "@/components/StarField";
import { StarFieldWithLensing } from "@/components/StarFieldWithLensing";
import { updateBlackHoleScreenData } from "@/components/GravitationalLensing";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import { usePresetSelector } from "@/components/playlist/usePresetSelector";
import { runtimeState } from "@/lib/runtimeStateRegistry";
import type { ColorPaletteId } from "@/components/ColorModeSystem";
import type { AnalyzedAudio } from "@/hooks/useAudioAnalyzer";
import type { CameraMode } from "@/components/CameraSystem";

// Pre-allocated scratch arrays for layout calculations (avoids per-frame GC)
const _layoutPositions = [
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
];
const _layoutMasses = [0, 0, 0, 0];
const _layoutBaseRadii = [0, 0, 0, 0];

/**
 * Compute orbital positions, masses, and base radii for `count` black holes.
 * Writes into the provided output arrays (caller-owned) to avoid allocations.
 */
// Schwarzschild-like scaling: r = GM / k
// Calibrated so GM=100,000 (default gravity) gives r≈5 (previous default eventHorizonRadius)
const EVENT_HORIZON_SCALE = 20000;

function massToRadius(mass: number): number {
  return mass / EVENT_HORIZON_SCALE;
}

function calculateOrbitalLayout(
  count: number,
  elapsed: number,
  orbitSpeed: number,
  orbitRadius: number,
  gravity: number,
  blackHoleMassMin: number,
  blackHoleMassMax: number,
  outPositions: THREE.Vector3[],
  outMasses: number[],
  outBaseRadii: number[]
) {
  const maxMass = gravity * blackHoleMassMax;

  if (count === 1) {
    outPositions[0].set(0, 0, 0);
    outMasses[0] = maxMass;
    outBaseRadii[0] = massToRadius(maxMass);
    return;
  }

  const angleStep = (2 * Math.PI) / count;
  const totalMass = gravity;

  let totalMassRatio = 0;
  for (let i = 0; i < count; i++) {
    const ti = i / (count - 1);
    totalMassRatio += blackHoleMassMax - ti * (blackHoleMassMax - blackHoleMassMin);
  }
  const avgMassRatio = totalMassRatio / count;

  const maxRadius = massToRadius(maxMass);
  const spacingFactor = 2.5 / Math.sin(Math.PI / count);
  const minOrbitRadius = maxRadius * spacingFactor;
  const effectiveOrbitRadius = Math.max(orbitRadius, minOrbitRadius);

  for (let i = 0; i < count; i++) {
    const angle = elapsed * orbitSpeed + i * angleStep;
    const t = i / (count - 1);
    const massRatio = blackHoleMassMax - t * (blackHoleMassMax - blackHoleMassMin);
    const mass = totalMass * massRatio;
    const r = effectiveOrbitRadius * (avgMassRatio / massRatio);

    outPositions[i].set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
    outMasses[i] = mass;
    outBaseRadii[i] = massToRadius(mass);
  }
}

// Second set of scratch arrays for the "to" layout during transitions
const _toPositions = [
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
];
const _toMasses = [0, 0, 0, 0];
const _toBaseRadii = [0, 0, 0, 0];

const SKYBOX_OPTIONS: Record<string, string> = {
  None: "",
  "Procedural Stars": "__procedural__",
  Starmap: "./starmap_2020_4k.exr",
  "Hazy Nebulae": "./HDR_hazy_nebulae_4k.exr",
  "Blue Nebulae": "./HDR_rich_blue_nebulae_1_4k.exr",
  "Multi Nebulae": "./HDR_rich_multi_nebulae_2_4k.exr",
};

interface CameraModeProps {
  mode: CameraMode;
  isTransitioning: boolean;
  onTransitionComplete: () => void;
  timelineRef: React.MutableRefObject<gsap.core.Timeline | null>;
}

interface ColorModeProps {
  paletteId: ColorPaletteId;
  paletteOffset: number;
  allColors: string[];
  setPalette: (id: ColorPaletteId) => void;
  processBeat: (intensity: number, time: number) => void;
}

interface BlackHoleSimulationProps {
  getAnalysis: (bandCount?: number) => AnalyzedAudio;
  isAudioConnected: boolean;
  setOnsetDecay: (value: number) => void;
  cameraMode: CameraModeProps;
  colorMode: ColorModeProps;
  resolutionScale?: number;
  perfFlags?: {
    noStars?: boolean;
    noHistory?: boolean;
    desktopAdvancedParticles?: boolean;
  };
  onGPUError?: () => void;
}

export function BlackHoleSimulation({
  getAnalysis,
  isAudioConnected,
  setOnsetDecay,
  cameraMode,
  colorMode,
  resolutionScale = 1,
  perfFlags,
  onGPUError,
}: BlackHoleSimulationProps) {
  // Use grouped selectors with shallow comparison to avoid unnecessary re-renders
  // Only subscribe to values that affect the render output
  const emitterControls = useVisualizationControls(
    useShallow((s) => ({
      // Only need values for helper geometry or conditional rendering
      emitRadius: s.emitRadius,
      emitterCount: s.emitterCount,
      emitterAngle: s.emitterAngle,
      emitterTilt: s.emitterTilt,
      showEmitters: s.showEmitters,
      emissionShape: s.emissionShape,
      emitterLineY: s.emitterLineY,
      emitterLineWidth: s.emitterLineWidth,
    }))
  );

  // Used for keys to force re-mount on major changes
  const textureSize = useVisualizationControls((s) => s.textureSize);

  const skyboxControls = useVisualizationControls(
    useShallow((s) => ({
      skybox: s.skybox,
      starDensity: s.starDensity,
      starBrightness: s.starBrightness,
      starLensingEnabled: s.starLensingEnabled,
    }))
  );

  // These values only affect useEffects, use individual selectors
  const onsetDecay = useVisualizationControls((s) => s.onsetDecay);

  // Sync onset decay changes
  useEffect(() => {
    setOnsetDecay(onsetDecay);
  }, [onsetDecay, setOnsetDecay]);

  const beatIntensityRef = useRef(0);
  const { camera } = useThree();

  // Black hole positions and masses for N-body system (for GPU compute)
  // Keep stable arrays/Vector3s and mutate in-place to avoid per-frame allocations / GC hiccups.
  const blackHoleDataRef = useRef<{
    positions: THREE.Vector3[];
    masses: number[];
    radii: number[];
    baseRadii: number[]; // Un-pulsed radii for lensing (no audio reactivity)
    count: number;
    // Position history for redshift alignment (matches particle trail history depth)
    prevPositions: THREE.Vector3[]; // 1 frame ago
    history1Positions: THREE.Vector3[]; // 2 frames ago
    history2Positions: THREE.Vector3[]; // 3 frames ago (oldest, matches trail tail)
  } | null>(null);

  // Initialize immediately from current store so the compute pipeline never sees a 0-mass frame.
  if (!blackHoleDataRef.current) {
    const initial = useVisualizationControls.getState();
    const initialCount = Math.max(1, Math.min(Math.ceil(initial.blackHoleCount), 4));
    const positions = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ];
    const masses = [0, 0, 0, 0];
    const radii = [0, 0, 0, 0];
    const baseRadii = [0, 0, 0, 0];

    calculateOrbitalLayout(
      initialCount,
      0,
      initial.orbitSpeed,
      initial.orbitRadius,
      initial.gravity,
      initial.blackHoleMassMin,
      initial.blackHoleMassMax,
      positions,
      masses,
      baseRadii
    );
    for (let i = 0; i < initialCount; i++) radii[i] = baseRadii[i];
    for (let i = initialCount; i < 4; i++) {
      positions[i].set(0, 0, 0);
      masses[i] = 0;
      radii[i] = 0;
      baseRadii[i] = 0;
    }
    if (initial.blackHoleOffsetY !== 0) {
      for (let i = 0; i < initialCount; i++) positions[i].y += initial.blackHoleOffsetY;
    }

    // Initialize all history to current positions (no stale-origin artifact on first frames)
    const prevPositions = positions.map((p) => p.clone());
    const history1Positions = positions.map((p) => p.clone());
    const history2Positions = positions.map((p) => p.clone());

    blackHoleDataRef.current = {
      positions,
      masses,
      radii,
      baseRadii,
      count: initialCount,
      prevPositions,
      history1Positions,
      history2Positions,
    };
  }

  // Envelope followers for particle system audio signals
  // HFC boost: 50ms attack, 150ms decay (for velocity boost)
  // Spawn burst: instant attack, 100ms decay (for bass-triggered spawn bursts)
  const hfcBoostRef = useRef(0);
  const spawnBurstRef = useRef(1);
  const hfcDecayCoef = useRef(Math.exp(-1 / (0.15 * 60))); // 150ms decay at 60fps
  const spawnDecayCoef = useRef(Math.exp(-1 / (0.1 * 60))); // 100ms decay at 60fps
  const beatHistoryRef = useRef<number[]>([0, 0, 0, 0]); // 4-frame rolling average for beat smoothing

  // Cached audio data object - updated in-place to avoid per-frame allocations
  const scaledOnsetsRef = useRef(new Float32Array(36));
  const audioDataRef = useRef<{
    bandEnergies: Float32Array;
    bandOnsets: Float32Array;
    bandCount: number;
    spectrum?: Float32Array;
    hfcBoost: number;
    spawnBurst: number;
    beatIntensity: number;
  }>({
    bandEnergies: new Float32Array(36),
    bandOnsets: scaledOnsetsRef.current,
    bandCount: 0,
    spectrum: new Float32Array(128),
    hfcBoost: 0,
    spawnBurst: 1,
    beatIntensity: 0,
  });

  useFrame((state) => {
    // Read from runtimeState instead of store for performance during tweens
    // Calculate black hole positions based on orbit parameters
    const {
      blackHoleCount: bhCount,
      orbitRadius,
      orbitSpeed,
      gravity,
      blackHoleMassMin,
      blackHoleMassMax,
      audioGain,
      spawnBurstMultiplier,
      hfcVelocityBoost,
      beatPulse,
      blackHoleOffsetY,
    } = runtimeState;
    // Compute pulsed radius once - this is the single source of truth
    const pulse = 1 + (beatIntensityRef.current ?? 0) * beatPulse;
    // autoColorChange is a boolean from the store, not runtime state
    const { autoColorChange } = useVisualizationControls.getState();
    const { isLuckyPlaying } = usePresetSelector.getState();
    const elapsed = state.clock.elapsedTime;

    const bh = blackHoleDataRef.current!;
    const positions = bh.positions;
    const masses = bh.masses;
    const radii = bh.radii;
    const baseRadii = bh.baseRadii;

    // Shift BH position history before computing new positions
    // Mirrors particle history shift in useGPUCompute.useFrame
    for (let i = 0; i < 4; i++) {
      bh.history2Positions[i].copy(bh.history1Positions[i]);
      bh.history1Positions[i].copy(bh.prevPositions[i]);
      bh.prevPositions[i].copy(positions[i]);
    }

    // Transition logic: use fractional bhCount for smooth split/merge
    const stableCount = Math.max(1, Math.min(Math.floor(bhCount), 4));
    const targetCount = Math.max(1, Math.min(Math.ceil(bhCount), 4));
    const progress = bhCount - Math.floor(bhCount);

    const layoutArgs = [
      elapsed,
      orbitSpeed,
      orbitRadius,
      gravity,
      blackHoleMassMin,
      blackHoleMassMax,
    ] as const;

    if (progress < 0.001 || stableCount === targetCount) {
      // Integer count — no transition, identical to previous behavior
      calculateOrbitalLayout(stableCount, ...layoutArgs, positions, masses, baseRadii);
      for (let i = 0; i < stableCount; i++) radii[i] = baseRadii[i] * pulse;
      for (let i = stableCount; i < 4; i++) {
        positions[i].set(0, 0, 0);
        masses[i] = 0;
        radii[i] = 0;
        baseRadii[i] = 0;
      }
      bh.count = stableCount;
    } else {
      // Mid-transition: compute both layouts and blend
      calculateOrbitalLayout(
        stableCount,
        ...layoutArgs,
        _layoutPositions,
        _layoutMasses,
        _layoutBaseRadii
      );
      calculateOrbitalLayout(targetCount, ...layoutArgs, _toPositions, _toMasses, _toBaseRadii);

      // Stable BHs: lerp between from→to layouts
      for (let i = 0; i < stableCount; i++) {
        positions[i].lerpVectors(_layoutPositions[i], _toPositions[i], progress);
        masses[i] = _layoutMasses[i] + (_toMasses[i] - _layoutMasses[i]) * progress;
        const br = _layoutBaseRadii[i] + (_toBaseRadii[i] - _layoutBaseRadii[i]) * progress;
        baseRadii[i] = br;
        radii[i] = br * pulse;
      }

      // Transitioning BH: emerges from parent's current blended position
      const transIdx = stableCount; // the new BH being born
      const parentIdx = Math.max(0, stableCount - 1);
      positions[transIdx].lerpVectors(positions[parentIdx], _toPositions[transIdx], progress);
      masses[transIdx] = _toMasses[transIdx] * progress;
      const transBr = _toBaseRadii[transIdx] * progress;
      baseRadii[transIdx] = transBr;
      radii[transIdx] = transBr * pulse;

      // Zero unused slots
      for (let i = targetCount; i < 4; i++) {
        positions[i].set(0, 0, 0);
        masses[i] = 0;
        radii[i] = 0;
        baseRadii[i] = 0;
      }
      bh.count = targetCount;
    }

    // Apply Y offset to all active black hole positions
    if (blackHoleOffsetY !== 0) {
      for (let i = 0; i < bh.count; i++) positions[i].y += blackHoleOffsetY;
    }

    // Backfill history for newly-activated BH slots to avoid stale-origin redshift artifacts
    for (let i = 0; i < bh.count; i++) {
      if (bh.history2Positions[i].lengthSq() < 0.01 && positions[i].lengthSq() > 0.01) {
        bh.prevPositions[i].copy(positions[i]);
        bh.history1Positions[i].copy(positions[i]);
        bh.history2Positions[i].copy(positions[i]);
      }
    }

    if (isAudioConnected) {
      const analysis = getAnalysis();
      const now = performance.now();
      const MAX_STALE_MS = 33; // 2 frames at 60fps

      // Protect against stale data during GC pauses - decay instead of using stale high values
      const isStale = analysis.timestamp > 0 && now - analysis.timestamp > MAX_STALE_MS;

      if (isStale) {
        beatIntensityRef.current *= 0.85;
        hfcBoostRef.current *= 0.85;
        spawnBurstRef.current = 1 + (spawnBurstRef.current - 1) * 0.85;
        beatHistoryRef.current = beatHistoryRef.current.map((v) => v * 0.85);
      } else {
        // Use bass peak detection for beat intensity, or fall back to band onsets
        // Clamp onsets to prevent audio glitch spikes before gain multiplication
        const bassBeat = analysis.peaks.bass ? 1 : 0;
        const onsetBeat = Math.min(
          Math.max(analysis.bandOnsets[0] ?? 0, analysis.bandOnsets[1] ?? 0),
          1.0
        );
        const beat = Math.max(bassBeat * 0.8, onsetBeat) * (audioGain ?? 1);
        const clampedBeat = Math.min(beat, 0.75);
        const history = beatHistoryRef.current;
        history.push(clampedBeat);
        history.shift();
        beatIntensityRef.current = history.reduce((a, b) => a + b, 0) / history.length;

        // HFC boost - envelope follow the raw HFC with attack/decay
        const hfcTarget = analysis.raw.hfc;
        if (hfcTarget > hfcBoostRef.current) {
          // Fast attack (50ms)
          hfcBoostRef.current = 0.8 * hfcBoostRef.current + 0.2 * hfcTarget;
        } else {
          // Slower decay (150ms)
          hfcBoostRef.current = hfcDecayCoef.current * hfcBoostRef.current;
        }

        // Spawn burst - trigger on bass peaks, decay back to 1
        if (analysis.peaks.bass) {
          spawnBurstRef.current = spawnBurstMultiplier;
        } else {
          // Decay back toward 1.0
          spawnBurstRef.current = 1.0 + (spawnBurstRef.current - 1.0) * spawnDecayCoef.current;
        }

        if (autoColorChange && isLuckyPlaying) {
          colorMode.processBeat(beat, state.clock.elapsedTime);
        }
      }

      // Update cached audio data in-place (avoid per-frame object allocation)
      const scaledOnsets = scaledOnsetsRef.current;
      for (let i = 0; i < analysis.bandOnsets.length; i++) {
        scaledOnsets[i] = Math.min(analysis.bandOnsets[i], 1.0) * audioGain;
      }
      const audioData = audioDataRef.current;
      audioData.bandEnergies = analysis.bandEnergies;
      audioData.bandOnsets = scaledOnsets;
      audioData.bandCount = analysis.bandCount;
      audioData.spectrum = analysis.spectrum;
      audioData.hfcBoost = (hfcBoostRef.current * hfcVelocityBoost) / 0.3;
      audioData.spawnBurst = spawnBurstRef.current;
      audioData.beatIntensity = beatIntensityRef.current;
    } else {
      beatIntensityRef.current = 0;
      hfcBoostRef.current = 0;
      spawnBurstRef.current = 1;

      // Update cached audio data for disabled state
      const audioData = audioDataRef.current;
      audioData.hfcBoost = 0;
      audioData.spawnBurst = 1;
      audioData.beatIntensity = 0;
    }
  });

  // Update screen-space BH lensing data after camera controllers have run.
  // Priority 1 keeps this aligned with the frame's final camera transform.
  useFrame(() => {
    const bhData = blackHoleDataRef.current;
    if (!bhData) return;

    updateBlackHoleScreenData(
      bhData.positions,
      bhData.radii,
      bhData.masses,
      runtimeState.gravity * runtimeState.blackHoleMassMax,
      bhData.count,
      camera
    );
  }, 1);

  // Memoized callbacks to avoid per-render allocations
  const getAudioData = useCallback(() => audioDataRef.current, []);
  const getBlackHoleData = useCallback(() => blackHoleDataRef.current!, []);

  const skyboxPath = SKYBOX_OPTIONS[skyboxControls.skybox] || "";

  const isProceduralStars = skyboxControls.skybox === "Procedural Stars";

  return (
    <>
      <color attach="background" args={["#000000"]} />
      {isProceduralStars ? (
        perfFlags?.noStars ? null : skyboxControls.starLensingEnabled ? (
          <StarFieldWithLensing
            key={skyboxControls.starDensity}
            beatIntensityRef={beatIntensityRef}
            starCount={skyboxControls.starDensity}
            brightnessBoost={skyboxControls.starBrightness}
            resolutionScale={resolutionScale}
          />
        ) : (
          <StarField
            key={skyboxControls.starDensity}
            beatIntensityRef={beatIntensityRef}
            starCount={skyboxControls.starDensity}
            brightnessBoost={skyboxControls.starBrightness}
            resolutionScale={resolutionScale}
          />
        )
      ) : (
        skyboxPath && (
          <Suspense fallback={null}>
            <Environment
              files={skyboxPath}
              background
              backgroundIntensity={0.15}
              environmentIntensity={0}
            />
          </Suspense>
        )
      )}

      <ParticleSystem
        key={textureSize}
        allColors={colorMode.allColors}
        getAudioData={getAudioData}
        audioEnabled={isAudioConnected}
        getBlackHoleData={getBlackHoleData}
        enableHistory={!perfFlags?.noHistory}
        resolutionScale={resolutionScale}
        desktopAdvancedMode={!!perfFlags?.desktopAdvancedParticles}
        onGPUError={onGPUError}
      />
      {[0, 1, 2, 3].map((i) => (
        <BlackHole key={i} blackHoleDataRef={blackHoleDataRef} index={i} />
      ))}

      {/* Emitter position indicators - only calculated when shown */}
      {emitterControls.showEmitters && (
        <EmitterHelpers
          count={emitterControls.emitterCount}
          radius={emitterControls.emitRadius}
          angle={emitterControls.emitterAngle}
          tilt={emitterControls.emitterTilt}
          emissionShape={emitterControls.emissionShape}
          emitterLineY={emitterControls.emitterLineY}
          emitterLineWidth={emitterControls.emitterLineWidth}
        />
      )}

      <CameraSystem
        mode={cameraMode.mode}
        isTransitioning={cameraMode.isTransitioning}
        onTransitionComplete={cameraMode.onTransitionComplete}
        timelineRef={cameraMode.timelineRef}
      />
    </>
  );
}

// Separate component for helpers to avoid re-calculating positions in main component
function EmitterHelpers({
  count,
  radius,
  angle,
  tilt,
  emissionShape,
  emitterLineY,
  emitterLineWidth,
}: {
  count: number;
  radius: number;
  angle: number;
  tilt: number;
  emissionShape: number;
  emitterLineY: number;
  emitterLineWidth: number;
}) {
  const positions = useMemo(() => {
    const pos: [number, number, number][] = [];
    const angleRad = (angle * Math.PI) / 180;
    const tiltRad = (tilt * Math.PI) / 180;
    const ct = Math.cos(tiltRad);
    const st = Math.sin(tiltRad);
    const doTilt = tiltRad > 0.001;

    if (emissionShape >= 1) {
      // Line mode - tilt only the line offset around radial axis
      const basePx = radius * Math.cos(angleRad);
      const basePz = radius * Math.sin(angleRad);
      const tiltAxis = [Math.cos(angleRad), 0, Math.sin(angleRad)];
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const lineOffset = (t - 0.5) * 2 * emitterLineWidth;
        let ox = 0,
          oy = lineOffset,
          oz = 0;
        if (doTilt) {
          const d = tiltAxis[0] * ox + tiltAxis[1] * oy + tiltAxis[2] * oz;
          const cx = tiltAxis[1] * oz - tiltAxis[2] * oy;
          const cy = tiltAxis[2] * ox - tiltAxis[0] * oz;
          const cz = tiltAxis[0] * oy - tiltAxis[1] * ox;
          ox = ox * ct + cx * st + tiltAxis[0] * d * (1 - ct);
          oy = oy * ct + cy * st + tiltAxis[1] * d * (1 - ct);
          oz = oz * ct + cz * st + tiltAxis[2] * d * (1 - ct);
        }
        pos.push([basePx + ox, emitterLineY + oy, basePz + oz]);
      }
    } else {
      // Circle mode - tilt around tangent axis (tilts the ring)
      const circleTiltAxis = [-Math.sin(angleRad), 0, Math.cos(angleRad)];
      for (let i = 0; i < count; i++) {
        const baseAngle = (i * Math.PI * 2) / count;
        const a = baseAngle + angleRad;
        const x = radius * Math.cos(a);
        const z = radius * Math.sin(a);
        let px = x,
          py = 0,
          pz = z;
        if (doTilt) {
          const d = circleTiltAxis[0] * px + circleTiltAxis[1] * py + circleTiltAxis[2] * pz;
          const cx = circleTiltAxis[1] * pz - circleTiltAxis[2] * py;
          const cy = circleTiltAxis[2] * px - circleTiltAxis[0] * pz;
          const cz = circleTiltAxis[0] * py - circleTiltAxis[1] * px;
          px = px * ct + cx * st + circleTiltAxis[0] * d * (1 - ct);
          py = py * ct + cy * st + circleTiltAxis[1] * d * (1 - ct);
          pz = pz * ct + cz * st + circleTiltAxis[2] * d * (1 - ct);
        }
        pos.push([px, py, pz]);
      }
    }
    return pos;
  }, [count, radius, angle, tilt, emissionShape, emitterLineY, emitterLineWidth]);

  return (
    <>
      {positions.map((pos, i) => (
        <mesh key={i} position={pos}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshBasicMaterial color="#00ff00" />
        </mesh>
      ))}
    </>
  );
}
