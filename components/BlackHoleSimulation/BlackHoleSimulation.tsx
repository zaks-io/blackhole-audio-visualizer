"use client";

import { useMemo, useState, useEffect } from "react";
import { Environment } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { ParticleSystem } from "./ParticleSystem";
import { BlackHole } from "./BlackHole";
import { CameraSystem } from "@/components/CameraSystem";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import type { ColorPaletteId } from "@/components/ColorModeSystem";
import type { AudioData } from "@/hooks/useMicrophone";
import type { CameraMode } from "@/components/CameraSystem";

const SKYBOX_OPTIONS: Record<string, string> = {
  None: "",
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
  getFrequencyData: (bandCount: number) => AudioData;
  isAudioConnected: boolean;
  setOnsetDecay: (value: number) => void;
  cameraMode: CameraModeProps;
  colorMode: ColorModeProps;
}

export function BlackHoleSimulation({
  getFrequencyData,
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

  const [beatIntensity, setBeatIntensity] = useState(0);

  useFrame((state) => {
    if (isAudioConnected) {
      const data = getFrequencyData(2);
      const beat = Math.max(data.bandOnsets[0] ?? 0, data.bandOnsets[1] ?? 0) * controls.audioGain;
      setBeatIntensity(beat);
      if (controls.autoColorChange) {
        colorMode.processBeat(beat, state.clock.elapsedTime);
      }
    } else {
      setBeatIntensity(0);
    }
  });

  const getAudioData = (bandCount: number): AudioData => {
    const data = getFrequencyData(bandCount);
    // Apply gain to all band onsets
    const scaledOnsets = new Float32Array(data.bandOnsets.length);
    for (let i = 0; i < data.bandOnsets.length; i++) {
      scaledOnsets[i] = data.bandOnsets[i] * controls.audioGain;
    }
    return {
      bandEnergies: data.bandEnergies,
      bandOnsets: scaledOnsets,
      bandCount: data.bandCount,
      spectral: data.spectral,
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

  return (
    <>
      <color attach="background" args={["#000000"]} />
      {skyboxPath && <Environment files={skyboxPath} background />}

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
        iscoRadius={
          controls.eventHorizonRadius *
          controls.iscoRatio *
          (1 + beatIntensity * controls.beatPulse)
        }
        iscoStrength={controls.iscoStrength}
        emitterSpread={controls.emitterSpread}
        audioAmplitude={controls.amplitude}
        beatRepulsion={controls.beatRepulsion}
        getAudioData={getAudioData}
        audioEnabled={isAudioConnected}
      />
      <BlackHole
        eventHorizonRadius={controls.eventHorizonRadius}
        beatIntensity={beatIntensity}
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
