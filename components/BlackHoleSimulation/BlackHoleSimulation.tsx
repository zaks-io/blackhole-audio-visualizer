"use client";

import { useMemo, useRef, useEffect } from "react";
import { Environment } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useShallow } from "zustand/shallow";
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
}

export function BlackHoleSimulation({
  getAnalysis,
  isAudioConnected,
  setOnsetDecay,
  cameraMode,
  colorMode,
  resolutionScale = 1,
}: BlackHoleSimulationProps) {
  // Use grouped selectors with shallow comparison to avoid unnecessary re-renders
  // Only subscribe to values that affect the render output
  const emitterControls = useVisualizationControls(
    useShallow((s) => ({
      emitRadius: s.emitRadius,
      emitterCount: s.emitterCount,
      emitterAngle: s.emitterAngle,
      emitterTilt: s.emitterTilt,
      showEmitters: s.showEmitters,
    }))
  );

  const particleControls = useVisualizationControls(
    useShallow((s) => ({
      textureSize: s.textureSize,
      pointSize: s.pointSize,
      brightness: s.brightness,
      alpha: s.alpha,
      maxDistance: s.maxDistance,
      gravity: s.gravity,
      timeScale: s.timeScale,
      eventHorizonRadius: s.eventHorizonRadius,
      softening: s.softening,
      orbitDecay: s.orbitDecay,
      spawnRate: s.spawnRate,
      inwardAngle: s.inwardAngle,
      iscoRatio: s.iscoRatio,
      beatPulse: s.beatPulse,
      iscoStrength: s.iscoStrength,
      emitterSpread: s.emitterSpread,
      amplitude: s.amplitude,
      beatRepulsion: s.beatRepulsion,
    }))
  );

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

  // Envelope followers for particle system audio signals
  // HFC boost: 50ms attack, 150ms decay (for velocity boost)
  // Spawn burst: instant attack, 100ms decay (for bass-triggered spawn bursts)
  const hfcBoostRef = useRef(0);
  const spawnBurstRef = useRef(1);
  const hfcDecayCoef = useRef(Math.exp(-1 / (0.15 * 60))); // 150ms decay at 60fps
  const spawnDecayCoef = useRef(Math.exp(-1 / (0.1 * 60))); // 100ms decay at 60fps

  useFrame((state) => {
    if (isAudioConnected) {
      // Use getState() to avoid subscriptions for runtime-only values
      const store = useVisualizationControls.getState();
      const analysis = getAnalysis();
      // Use bass peak detection for beat intensity, or fall back to band onsets
      const bassBeat = analysis.peaks.bass ? 1 : 0;
      const onsetBeat = Math.max(analysis.bandOnsets[0] ?? 0, analysis.bandOnsets[1] ?? 0);
      const beat = Math.max(bassBeat * 0.8, onsetBeat) * store.audioGain;
      beatIntensityRef.current = Math.min(beat, 1.5);

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
    } else {
      beatIntensityRef.current = 0;
      hfcBoostRef.current = 0;
      spawnBurstRef.current = 1;
    }
  });

  const scaledOnsetsRef = useRef(new Float32Array(36));

  const getAudioData = () => {
    // Use getState() to avoid subscriptions for runtime-only values
    const store = useVisualizationControls.getState();
    const analysis = getAnalysis();
    // Apply gain to all band onsets (reuse buffer to avoid GC)
    const scaledOnsets = scaledOnsetsRef.current;
    for (let i = 0; i < analysis.bandOnsets.length; i++) {
      scaledOnsets[i] = analysis.bandOnsets[i] * store.audioGain;
    }
    return {
      bandEnergies: analysis.bandEnergies,
      bandOnsets: scaledOnsets,
      bandCount: analysis.bandCount,
      hfcBoost: (hfcBoostRef.current * store.hfcVelocityBoost) / 0.3, // Normalize to control range
      spawnBurst: spawnBurstRef.current,
    };
  };

  const emitterPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < emitterControls.emitterCount; i++) {
      const baseAngle = (i * Math.PI * 2) / emitterControls.emitterCount;
      const angle = baseAngle + emitterControls.emitterAngle;
      const x = emitterControls.emitRadius * Math.cos(angle);
      const z = emitterControls.emitRadius * Math.sin(angle);
      const y = Math.sin(angle) * emitterControls.emitterTilt;
      positions.push([x, y, z]);
    }
    return positions;
  }, [
    emitterControls.emitRadius,
    emitterControls.emitterCount,
    emitterControls.emitterAngle,
    emitterControls.emitterTilt,
  ]);

  const skyboxPath = SKYBOX_OPTIONS[skyboxControls.skybox] || "";

  const isProceduralStars = skyboxControls.skybox === "Procedural Stars";

  return (
    <>
      <color attach="background" args={["#000000"]} />
      {isProceduralStars ? (
        <StarField
          key={skyboxControls.starDensity}
          beatIntensityRef={beatIntensityRef}
          starCount={skyboxControls.starDensity}
          brightnessBoost={skyboxControls.starBrightness}
          resolutionScale={resolutionScale}
        />
      ) : (
        skyboxPath && <Environment files={skyboxPath} background />
      )}

      <ParticleSystem
        key={particleControls.textureSize}
        textureSize={particleControls.textureSize}
        pointSize={particleControls.pointSize}
        brightness={particleControls.brightness}
        alpha={particleControls.alpha}
        maxDistance={particleControls.maxDistance}
        allColors={colorMode.allColors}
        paletteOffset={colorMode.paletteOffset}
        gravitationalParameter={particleControls.gravity}
        timeScale={particleControls.timeScale}
        eventHorizonRadius={particleControls.eventHorizonRadius}
        softening={particleControls.softening}
        orbitDecay={particleControls.orbitDecay}
        emissionRadius={emitterControls.emitRadius}
        emitterCount={emitterControls.emitterCount}
        emitterAngle={emitterControls.emitterAngle}
        emitterTilt={emitterControls.emitterTilt}
        spawnRate={particleControls.spawnRate}
        inwardAngle={particleControls.inwardAngle}
        iscoRadius={particleControls.eventHorizonRadius * particleControls.iscoRatio}
        beatPulse={particleControls.beatPulse}
        iscoStrength={particleControls.iscoStrength}
        emitterSpread={particleControls.emitterSpread}
        audioAmplitude={particleControls.amplitude}
        beatRepulsion={particleControls.beatRepulsion}
        getAudioData={getAudioData}
        audioEnabled={isAudioConnected}
      />
      <BlackHole
        eventHorizonRadius={particleControls.eventHorizonRadius}
        beatIntensityRef={beatIntensityRef}
        beatPulse={particleControls.beatPulse}
      />

      {/* Emitter position indicators */}
      {emitterControls.showEmitters &&
        emitterPositions.map((pos, i) => (
          <mesh key={i} position={pos}>
            <sphereGeometry args={[0.5, 16, 16]} />
            <meshBasicMaterial color="#00ff00" />
          </mesh>
        ))}

      <CameraSystem
        mode={cameraMode.mode}
        isTransitioning={cameraMode.isTransitioning}
        onTransitionComplete={cameraMode.onTransitionComplete}
        timelineRef={cameraMode.timelineRef}
      />
    </>
  );
}
