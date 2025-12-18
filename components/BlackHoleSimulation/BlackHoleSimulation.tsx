'use client';

import { useMemo, useState } from 'react';
import { Environment } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import { useControls } from 'leva';
import { ParticleSystem } from './ParticleSystem';
import { BlackHole } from './BlackHole';
import { CameraSystem } from '@/components/CameraSystem';
import { PALETTE_IDS, type ColorPaletteId } from '@/components/ColorModeSystem';
import type { AudioData } from '@/hooks/useMicrophone';
import type { CameraMode } from '@/components/CameraSystem';

const SKYBOX_OPTIONS = {
  'None': '',
  'Starmap': '/starmap_2020_4k.exr',
  'Hazy Nebulae': '/HDR_hazy_nebulae_4k.exr',
  'Blue Nebulae': '/HDR_rich_blue_nebulae_1_4k.exr',
  'Multi Nebulae': '/HDR_rich_multi_nebulae_2_4k.exr',
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

export function BlackHoleSimulation({ getFrequencyData, isAudioConnected, setOnsetDecay, cameraMode, colorMode }: BlackHoleSimulationProps) {
  const blackHoleControls = useControls('Black Hole', {
    eventHorizonRadius: { value: 5, min: 0.5, max: 20, step: 0.5 },
    beatPulse: { value: 2, min: 0, max: 2, step: 0.1 },
  });

  const particleControls = useControls('Particles', {
    pointSize: { value: 1.0, min: 0.1, max: 20, step: 0.1 },
    brightness: { value: 1.5, min: 0.1, max: 5, step: 0.1 },
    alpha: { value: 0.8, min: 0.01, max: 1.0, step: 0.01 },
    maxDistance: { value: 60, min: 5, max: 150, step: 1 },
    colorPalette: {
      value: colorMode.paletteId,
      options: PALETTE_IDS,
      onChange: (v: ColorPaletteId) => colorMode.setPalette(v),
    },
  });

  const physicsControls = useControls('Physics', {
    gravity: { value: 100000, min: 1000, max: 1000000, step: 10000 },
    timeScale: { value: 5.0, min: 0.1, max: 30, step: 0.1 },
    softening: { value: 1.0, min: 0.01, max: 10, step: 0.1 },
    orbitDecay: { value: 2.0, min: 0, max: 20.0, step: 0.5 },
    iscoStrength: { value: 0.5, min: 0, max: 1.0, step: 0.05 },
    iscoRatio: { value: 3.0, min: 2.0, max: 20.0, step: 1.0 },
  });

  const emitterControls = useControls('Emitters', {
    emitRadius: { value: 60, min: 5, max: 200, step: 1 },
    emitterCount: { value: 3, min: 1, max: 36, step: 1 },
    emitterAngle: { value: 0, min: 0, max: 6.28, step: 0.1 },
    emitterTilt: { value: 0, min: -30, max: 30, step: 1 },
    inwardAngle: { value: 0, min: -1, max: 1, step: 0.01 },
    spawnRate: { value: 1.0, min: 0.1, max: 10, step: 0.1 },
    emitterSpread: { value: 0.05, min: 0, max: 1.0, step: 0.01 },
    showEmitters: { value: false },
  });

  const skyboxControls = useControls('Skybox', {
    skybox: { value: 'Hazy Nebulae', options: Object.keys(SKYBOX_OPTIONS) },
  });

  const audioControls = useControls('Audio', {
    amplitude: { value: 5.0, min: 0, max: 20, step: 0.5 },
    onsetDecay: {
      value: 0.92,
      min: 0.8,
      max: 0.99,
      step: 0.01,
      onChange: (v: number) => setOnsetDecay(v),
    },
    audioGain: { value: 1.0, min: 0, max: 3, step: 0.1 },
    beatRepulsion: { value: 100, min: 0, max: 100, step: 1 },
    autoColorChange: { value: true },
  });

  const [beatIntensity, setBeatIntensity] = useState(0);

  useFrame((state) => {
    if (isAudioConnected) {
      const data = getFrequencyData(2);
      const beat = Math.max(data.bandOnsets[0] ?? 0, data.bandOnsets[1] ?? 0) * audioControls.audioGain;
      setBeatIntensity(beat);
      if (audioControls.autoColorChange) {
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
      scaledOnsets[i] = data.bandOnsets[i] * audioControls.audioGain;
    }
    return {
      bandEnergies: data.bandEnergies,
      bandOnsets: scaledOnsets,
      bandCount: data.bandCount,
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
  }, [emitterControls.emitRadius, emitterControls.emitterCount, emitterControls.emitterAngle, emitterControls.emitterTilt]);

  const skyboxPath = SKYBOX_OPTIONS[skyboxControls.skybox as keyof typeof SKYBOX_OPTIONS];

  return (
    <>
      <color attach="background" args={['#000000']} />
      {skyboxPath && <Environment files={skyboxPath} background />}

      <ParticleSystem
        pointSize={particleControls.pointSize}
        brightness={particleControls.brightness}
        alpha={particleControls.alpha}
        maxDistance={particleControls.maxDistance}
        allColors={colorMode.allColors}
        paletteOffset={colorMode.paletteOffset}
        gravitationalParameter={physicsControls.gravity}
        timeScale={physicsControls.timeScale}
        eventHorizonRadius={blackHoleControls.eventHorizonRadius}
        softening={physicsControls.softening}
        orbitDecay={physicsControls.orbitDecay}
        emissionRadius={emitterControls.emitRadius}
        emitterCount={emitterControls.emitterCount}
        emitterAngle={emitterControls.emitterAngle}
        emitterTilt={emitterControls.emitterTilt}
        spawnRate={emitterControls.spawnRate}
        inwardAngle={emitterControls.inwardAngle}
        iscoRadius={blackHoleControls.eventHorizonRadius * physicsControls.iscoRatio}
        iscoStrength={physicsControls.iscoStrength}
        emitterSpread={emitterControls.emitterSpread}
        audioAmplitude={audioControls.amplitude}
        beatRepulsion={audioControls.beatRepulsion}
        getAudioData={getAudioData}
        audioEnabled={isAudioConnected}
      />
      <BlackHole eventHorizonRadius={blackHoleControls.eventHorizonRadius} beatIntensity={beatIntensity} beatPulse={blackHoleControls.beatPulse} />

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
