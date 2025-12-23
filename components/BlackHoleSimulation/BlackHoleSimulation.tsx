"use client";

import { useRef, useEffect, useMemo, useCallback } from "react";
import { Environment } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useShallow } from "zustand/shallow";
import * as THREE from "three";
import { ParticleSystem } from "./ParticleSystem";
import { BlackHole } from "./BlackHole";
import { CameraSystem } from "@/components/CameraSystem";
import { StarField } from "@/components/StarField";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import type { ColorPaletteId } from "@/components/ColorModeSystem";
import type { AnalyzedAudio } from "@/hooks/useAudioAnalyzer";
import type { CameraMode } from "@/components/CameraSystem";

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
  };
}

export function BlackHoleSimulation({
  getAnalysis,
  isAudioConnected,
  setOnsetDecay,
  cameraMode,
  colorMode,
  resolutionScale = 1,
  perfFlags,
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
    }))
  );

  // Used for keys to force re-mount on major changes
  const textureSize = useVisualizationControls((s) => s.textureSize);

  const skyboxControls = useVisualizationControls(
    useShallow((s) => ({
      skybox: s.skybox,
      starDensity: s.starDensity,
      starBrightness: s.starBrightness,
    }))
  );

  // These values only affect useEffects, use individual selectors
  const colorPalette = useVisualizationControls((s) => s.colorPalette);
  const onsetDecay = useVisualizationControls((s) => s.onsetDecay);

  // Sync color palette changes to colorMode
  useEffect(() => {
    colorMode.setPalette(colorPalette);
  }, [colorPalette, colorMode]);

  // Sync onset decay changes
  useEffect(() => {
    setOnsetDecay(onsetDecay);
  }, [onsetDecay, setOnsetDecay]);

  const beatIntensityRef = useRef(0);

  // Black hole positions and masses for N-body system (for GPU compute)
  // Keep stable arrays/Vector3s and mutate in-place to avoid per-frame allocations / GC hiccups.
  const blackHoleDataRef = useRef<{
    positions: THREE.Vector3[];
    masses: number[];
    count: number;
  } | null>(null);

  // Initialize immediately from current store so the compute pipeline never sees a 0-mass frame.
  if (!blackHoleDataRef.current) {
    const initial = useVisualizationControls.getState();
    const initialCount = Math.max(1, Math.min(Math.floor(initial.blackHoleCount), 4));
    const positions = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 0),
    ];
    const masses = [0, 0, 0, 0];

    if (initialCount === 1) {
      positions[0].set(0, 0, 0);
      masses[0] = initial.gravity * initial.blackHoleMassMax;
    } else {
      const angleStep = (2 * Math.PI) / initialCount;
      const totalMass = initial.gravity;
      let totalMassRatio = 0;
      for (let i = 0; i < initialCount; i++) {
        const ti = i / (initialCount - 1);
        totalMassRatio +=
          initial.blackHoleMassMax - ti * (initial.blackHoleMassMax - initial.blackHoleMassMin);
      }
      const avgMassRatio = totalMassRatio / initialCount;

      // Ensure minimum orbit radius to prevent black hole overlap
      const spacingFactor = 2.5 / Math.sin(Math.PI / initialCount);
      const minOrbitRadius = initial.eventHorizonRadius * spacingFactor;
      const effectiveOrbitRadius = Math.max(initial.orbitRadius, minOrbitRadius);

      for (let i = 0; i < initialCount; i++) {
        const angle = i * angleStep;
        const t = i / (initialCount - 1);
        const massRatio =
          initial.blackHoleMassMax - t * (initial.blackHoleMassMax - initial.blackHoleMassMin);
        const mass = totalMass * massRatio;
        const r = effectiveOrbitRadius * (avgMassRatio / massRatio);
        positions[i].set(Math.cos(angle) * r, 0, Math.sin(angle) * r);
        masses[i] = mass;
      }
    }

    for (let i = initialCount; i < 4; i++) {
      positions[i].set(0, 0, 0);
      masses[i] = 0;
    }

    blackHoleDataRef.current = { positions, masses, count: initialCount };
  }

  // Subscribe to blackHoleCount for reactive rendering of BlackHole components
  const blackHoleCount = useVisualizationControls((s) => s.blackHoleCount);

  // Envelope followers for particle system audio signals
  // HFC boost: 50ms attack, 150ms decay (for velocity boost)
  // Spawn burst: instant attack, 100ms decay (for bass-triggered spawn bursts)
  const hfcBoostRef = useRef(0);
  const spawnBurstRef = useRef(1);
  const hfcDecayCoef = useRef(Math.exp(-1 / (0.15 * 60))); // 150ms decay at 60fps
  const spawnDecayCoef = useRef(Math.exp(-1 / (0.1 * 60))); // 100ms decay at 60fps

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
    // Use getState() to avoid subscriptions for runtime-only values
    const store = useVisualizationControls.getState();

    // Calculate black hole positions based on orbit parameters
    const {
      blackHoleCount: bhCount,
      orbitRadius,
      orbitSpeed,
      gravity,
      blackHoleMassMin,
      blackHoleMassMax,
      eventHorizonRadius,
    } = store;
    const elapsed = state.clock.elapsedTime;

    const bh = blackHoleDataRef.current!;
    const positions = bh.positions;
    const masses = bh.masses;
    // Hard cap to shader/compute limit
    const count = Math.max(1, Math.min(Math.floor(bhCount), 4));

    if (count === 1) {
      // Single black hole at origin
      positions[0].set(0, 0, 0);
      masses[0] = gravity * blackHoleMassMax;
    } else {
      // Multi-body: distribute around center of mass in circular orbit
      const angleStep = (2 * Math.PI) / count;
      const totalMass = gravity;

      // Calculate average mass ratio for barycenter adjustment
      let totalMassRatio = 0;
      for (let i = 0; i < count; i++) {
        const ti = i / (count - 1);
        totalMassRatio += blackHoleMassMax - ti * (blackHoleMassMax - blackHoleMassMin);
      }
      const avgMassRatio = totalMassRatio / count;

      // Ensure minimum orbit radius to prevent black hole overlap
      const spacingFactor = 2.5 / Math.sin(Math.PI / count);
      const minOrbitRadius = eventHorizonRadius * spacingFactor;
      const effectiveOrbitRadius = Math.max(orbitRadius, minOrbitRadius);

      for (let i = 0; i < count; i++) {
        const angle = elapsed * orbitSpeed + i * angleStep;
        // Interpolate mass from max to min based on index
        const t = i / (count - 1);
        const massRatio = blackHoleMassMax - t * (blackHoleMassMax - blackHoleMassMin);
        const mass = totalMass * massRatio;
        // Orbit radius inversely proportional to mass (heavier = closer to center)
        const r = effectiveOrbitRadius * (avgMassRatio / massRatio);

        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;

        positions[i].set(x, 0, z);
        masses[i] = mass;
      }
    }

    // Zero out unused slots to keep data stable and predictable
    for (let i = count; i < 4; i++) {
      positions[i].set(0, 0, 0);
      masses[i] = 0;
    }
    bh.count = count;

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
      } else {
        // Use bass peak detection for beat intensity, or fall back to band onsets
        // Clamp onsets to prevent audio glitch spikes before gain multiplication
        const bassBeat = analysis.peaks.bass ? 1 : 0;
        const onsetBeat = Math.min(
          Math.max(analysis.bandOnsets[0] ?? 0, analysis.bandOnsets[1] ?? 0),
          1.0
        );
        const beat = Math.max(bassBeat * 0.8, onsetBeat) * (store.audioGain ?? 1);
        beatIntensityRef.current = Math.min(beat, 0.75);

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
          spawnBurstRef.current = store.spawnBurstMultiplier;
        } else {
          // Decay back toward 1.0
          spawnBurstRef.current = 1.0 + (spawnBurstRef.current - 1.0) * spawnDecayCoef.current;
        }

        if (store.autoColorChange) {
          colorMode.processBeat(beat, state.clock.elapsedTime);
        }
      }

      // Update cached audio data in-place (avoid per-frame object allocation)
      const scaledOnsets = scaledOnsetsRef.current;
      for (let i = 0; i < analysis.bandOnsets.length; i++) {
        scaledOnsets[i] = Math.min(analysis.bandOnsets[i], 1.0) * store.audioGain;
      }
      const audioData = audioDataRef.current;
      audioData.bandEnergies = analysis.bandEnergies;
      audioData.bandOnsets = scaledOnsets;
      audioData.bandCount = analysis.bandCount;
      audioData.spectrum = analysis.spectrum;
      audioData.hfcBoost = (hfcBoostRef.current * store.hfcVelocityBoost) / 0.3;
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

  // Memoized callbacks to avoid per-render allocations
  const getAudioData = useCallback(() => audioDataRef.current, []);
  const getBlackHoleData = useCallback(() => blackHoleDataRef.current!, []);

  const skyboxPath = SKYBOX_OPTIONS[skyboxControls.skybox] || "";

  const isProceduralStars = skyboxControls.skybox === "Procedural Stars";

  return (
    <>
      <color attach="background" args={["#000000"]} />
      {isProceduralStars ? (
        perfFlags?.noStars ? null : (
          <StarField
            key={skyboxControls.starDensity}
            beatIntensityRef={beatIntensityRef}
            starCount={skyboxControls.starDensity}
            brightnessBoost={skyboxControls.starBrightness}
            resolutionScale={resolutionScale}
          />
        )
      ) : (
        skyboxPath && <Environment files={skyboxPath} background />
      )}

      <ParticleSystem
        key={textureSize}
        allColors={colorMode.allColors}
        paletteOffset={colorMode.paletteOffset}
        getAudioData={getAudioData}
        audioEnabled={isAudioConnected}
        getBlackHoleData={getBlackHoleData}
        enableHistory={!perfFlags?.noHistory}
      />
      {Array.from({ length: blackHoleCount }, (_, i) => (
        <BlackHole
          key={i}
          beatIntensityRef={beatIntensityRef}
          blackHoleDataRef={blackHoleDataRef}
          index={i}
        />
      ))}

      {/* Emitter position indicators - only calculated when shown */}
      {emitterControls.showEmitters && (
        <EmitterHelpers
          count={emitterControls.emitterCount}
          radius={emitterControls.emitRadius}
          angle={emitterControls.emitterAngle}
          tilt={emitterControls.emitterTilt}
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
}: {
  count: number;
  radius: number;
  angle: number;
  tilt: number;
}) {
  const positions = useMemo(() => {
    const pos: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const baseAngle = (i * Math.PI * 2) / count;
      const a = baseAngle + angle;
      const x = radius * Math.cos(a);
      const z = radius * Math.sin(a);
      const y = Math.sin(a) * tilt;
      pos.push([x, y, z]);
    }
    return pos;
  }, [count, radius, angle, tilt]);

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
