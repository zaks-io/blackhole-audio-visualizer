"use client";

import { useMemo, useRef, useEffect } from "react";
import { Environment } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
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
}

export function BlackHoleSimulation({
  getAnalysis,
  isAudioConnected,
  setOnsetDecay,
  cameraMode,
  colorMode,
}: BlackHoleSimulationProps) {
  // Get controls from zustand store
  const controls = useVisualizationControls();

  // Sync color palette changes to colorMode
  useEffect(() => {
    colorMode.setPalette(controls.colorPalette);
  }, [controls.colorPalette, colorMode]);

  // Sync onset decay changes
  useEffect(() => {
    setOnsetDecay(controls.onsetDecay);
  }, [controls.onsetDecay, setOnsetDecay]);

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
      const analysis = getAnalysis();
      // Use bass peak detection for beat intensity, or fall back to band onsets
      const bassBeat = analysis.peaks.bass ? 1 : 0;
      const onsetBeat = Math.max(analysis.bandOnsets[0] ?? 0, analysis.bandOnsets[1] ?? 0);
      const beat = Math.max(bassBeat * 0.8, onsetBeat) * controls.audioGain;
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
        spawnBurstRef.current = controls.spawnBurstMultiplier;
      } else {
        // Decay back toward 1.0
        spawnBurstRef.current = 1.0 + (spawnBurstRef.current - 1.0) * spawnDecayCoef.current;
      }

      if (controls.autoColorChange) {
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
    const analysis = getAnalysis();
    // Apply gain to all band onsets (reuse buffer to avoid GC)
    const scaledOnsets = scaledOnsetsRef.current;
    for (let i = 0; i < analysis.bandOnsets.length; i++) {
      scaledOnsets[i] = analysis.bandOnsets[i] * controls.audioGain;
    }
    return {
      bandEnergies: analysis.bandEnergies,
      bandOnsets: scaledOnsets,
      bandCount: analysis.bandCount,
      hfcBoost: (hfcBoostRef.current * controls.hfcVelocityBoost) / 0.3, // Normalize to control range
      spawnBurst: spawnBurstRef.current,
    };
  };

  const emitterPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < controls.emitterCount; i++) {
      const baseAngle = (i * Math.PI * 2) / controls.emitterCount;
      const angle = baseAngle + controls.emitterAngle;
      const x = controls.emitRadius * Math.cos(angle);
      const z = controls.emitRadius * Math.sin(angle);
      const y = Math.sin(angle) * controls.emitterTilt;
      positions.push([x, y, z]);
    }
    return positions;
  }, [controls.emitRadius, controls.emitterCount, controls.emitterAngle, controls.emitterTilt]);

  const skyboxPath = SKYBOX_OPTIONS[controls.skybox] || "";

  const isProceduralStars = controls.skybox === "Procedural Stars";

  return (
    <>
      <color attach="background" args={["#000000"]} />
      {isProceduralStars ? (
        <StarField
          key={controls.starDensity}
          beatIntensityRef={beatIntensityRef}
          starCount={controls.starDensity}
          brightnessBoost={controls.starBrightness}
        />
      ) : (
        skyboxPath && <Environment files={skyboxPath} background />
      )}

      <ParticleSystem
        key={controls.textureSize}
        textureSize={controls.textureSize}
        pointSize={controls.pointSize}
        brightness={controls.brightness}
        alpha={controls.alpha}
        maxDistance={controls.maxDistance}
        allColors={colorMode.allColors}
        paletteOffset={colorMode.paletteOffset}
        gravitationalParameter={controls.gravity}
        timeScale={controls.timeScale}
        eventHorizonRadius={controls.eventHorizonRadius}
        softening={controls.softening}
        orbitDecay={controls.orbitDecay}
        emissionRadius={controls.emitRadius}
        emitterCount={controls.emitterCount}
        emitterAngle={controls.emitterAngle}
        emitterTilt={controls.emitterTilt}
        spawnRate={controls.spawnRate}
        inwardAngle={controls.inwardAngle}
        iscoRadius={controls.eventHorizonRadius * controls.iscoRatio}
        beatPulse={controls.beatPulse}
        iscoStrength={controls.iscoStrength}
        emitterSpread={controls.emitterSpread}
        audioAmplitude={controls.amplitude}
        beatRepulsion={controls.beatRepulsion}
        getAudioData={getAudioData}
        audioEnabled={isAudioConnected}
      />
      <BlackHole
        eventHorizonRadius={controls.eventHorizonRadius}
        beatIntensityRef={beatIntensityRef}
        beatPulse={controls.beatPulse}
      />

      {/* Emitter position indicators */}
      {controls.showEmitters &&
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
