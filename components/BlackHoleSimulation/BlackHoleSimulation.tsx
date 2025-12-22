"use client";

import { useRef, useEffect } from "react";
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
        key={textureSize}
        allColors={colorMode.allColors}
        paletteOffset={colorMode.paletteOffset}
        getAudioData={getAudioData}
        audioEnabled={isAudioConnected}
      />
      <BlackHole beatIntensityRef={beatIntensityRef} />

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
