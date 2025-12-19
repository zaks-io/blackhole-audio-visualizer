"use client";

import { useRef, useCallback } from "react";
import type { AudioData, SpectralFeatures } from "./useMicrophone";

export interface AudioAnalysis {
  intensity: number;
  brightness: number;
  density: number;
  spectral: SpectralFeatures;
}

const DEFAULT_ANALYSIS: AudioAnalysis = {
  intensity: 0,
  brightness: 0,
  density: 0,
  spectral: {
    rms: 0,
    spectralCentroid: 0,
    spectralFlatness: 0,
    spectralFlux: 0,
    spectralRolloff: 0,
    zcr: 0,
    subBassRatio: 0,
    bassEnergy: 0,
    perceptualSharpness: 0,
  },
};

export function useAudioAnalysis() {
  const analysisRef = useRef<AudioAnalysis>({ ...DEFAULT_ANALYSIS });
  const onsetDensityHistoryRef = useRef<number[]>([]);

  const processAudio = useCallback((audioData: AudioData): AudioAnalysis => {
    const analysis = analysisRef.current;
    const { spectral } = audioData;

    analysis.spectral = { ...spectral };

    // Calculate onset density from spectralFlux history
    onsetDensityHistoryRef.current.push(spectral.spectralFlux);
    if (onsetDensityHistoryRef.current.length > 60) {
      onsetDensityHistoryRef.current.shift();
    }
    const avgDensity =
      onsetDensityHistoryRef.current.reduce((a, b) => a + b, 0) /
      onsetDensityHistoryRef.current.length;
    analysis.density = Math.min(1, avgDensity * 3);

    // Continuous values
    analysis.intensity = spectral.rms;
    analysis.brightness = spectral.spectralCentroid;

    return { ...analysis };
  }, []);

  const reset = useCallback(() => {
    analysisRef.current = { ...DEFAULT_ANALYSIS };
    onsetDensityHistoryRef.current = [];
  }, []);

  return { processAudio, reset };
}
