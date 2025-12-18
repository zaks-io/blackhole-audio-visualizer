"use client";

import { useRef, useCallback } from "react";
import type { AudioData, SpectralFeatures } from "./useMicrophone";
import { useBPMTracker, type BPMData } from "./useBPMTracker";
import { useNoveltyDetection, type NoveltyData } from "./useNoveltyDetection";

export interface TriggerSettings {
  dropRmsThreshold: number;
  dropSubBassThreshold: number;
  buildupDuration: number;
  energyTrendThreshold: number;
}

export const DEFAULT_TRIGGER_SETTINGS: TriggerSettings = {
  dropRmsThreshold: 0.25,
  dropSubBassThreshold: 0.3,
  buildupDuration: 2,
  energyTrendThreshold: 0.08,
};

export interface AudioTriggers {
  // Beat-synced triggers
  onBeat: boolean;
  onDownbeat: boolean;

  // Section triggers
  dropDetected: boolean;
  buildupDetected: boolean;
  breakdownDetected: boolean;

  // Continuous values for interpolation
  intensity: number;
  brightness: number;
  density: number;

  // Song-level
  possibleSongChange: boolean;

  // Raw data for debugging
  bpm: BPMData;
  novelty: NoveltyData;
  spectral: SpectralFeatures;
}

const DEFAULT_TRIGGERS: AudioTriggers = {
  onBeat: false,
  onDownbeat: false,
  dropDetected: false,
  buildupDetected: false,
  breakdownDetected: false,
  intensity: 0,
  brightness: 0,
  density: 0,
  possibleSongChange: false,
  bpm: {
    bpm: 0,
    confidence: 0,
    beatPhase: 0,
    isOnBeat: false,
    timeSinceLastBeat: 0,
    beatCount: 0,
    rawOnset: false,
    threshold: 0,
    avgEnergy: 0,
  },
  novelty: {
    novelty: 0,
    noveltyPeak: false,
    energyTrend: "stable",
    sectionAge: 0,
    avgEnergy: 0,
    energyDelta: 0,
  },
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

// Fixed thresholds (not configurable via UI)
const BREAKDOWN_RMS_THRESHOLD = 0.05;
const BREAKDOWN_DENSITY_THRESHOLD = 0.02;
const SILENCE_THRESHOLD = 0.02;
const SILENCE_DURATION = 2000;
const BPM_CHANGE_THRESHOLD = 0.1;

export function useAudioTriggers(settings: TriggerSettings = DEFAULT_TRIGGER_SETTINGS) {
  const { processBeat, reset: resetBPM } = useBPMTracker();
  const { processFrame: processNovelty, reset: resetNovelty } = useNoveltyDetection(
    settings.energyTrendThreshold
  );

  const triggersRef = useRef<AudioTriggers>({ ...DEFAULT_TRIGGERS });
  const prevBPMRef = useRef<number>(0);
  const silenceStartRef = useRef<number | null>(null);
  const prevBeatCountRef = useRef<number>(0);
  const onsetDensityHistoryRef = useRef<number[]>([]);

  const processAudio = useCallback(
    (audioData: AudioData, timestamp: number): AudioTriggers => {
      const triggers = triggersRef.current;
      const { spectral } = audioData;

      // Use bass-weighted onset for better kick detection
      // Combines spectralFlux (general transients) with bassEnergy (low freq)
      const beatOnset = spectral.spectralFlux * 0.6 + spectral.bassEnergy * 0.4;

      // Process BPM tracking
      const bpmData = processBeat(beatOnset, timestamp);
      triggers.bpm = bpmData;

      // Process novelty detection
      const noveltyData = processNovelty(spectral, timestamp);
      triggers.novelty = noveltyData;

      // Copy spectral data
      triggers.spectral = { ...spectral };

      // Beat triggers - use rawOnset as fallback when BPM isn't established yet
      const beatCountChanged = bpmData.beatCount !== prevBeatCountRef.current;
      triggers.onBeat = (bpmData.isOnBeat || bpmData.rawOnset) && beatCountChanged;
      triggers.onDownbeat = triggers.onBeat && bpmData.beatCount % 4 === 0;
      prevBeatCountRef.current = bpmData.beatCount;

      // Calculate onset density from spectralFlux history
      onsetDensityHistoryRef.current.push(spectral.spectralFlux);
      if (onsetDensityHistoryRef.current.length > 60) {
        onsetDensityHistoryRef.current.shift();
      }
      const avgDensity =
        onsetDensityHistoryRef.current.reduce((a, b) => a + b, 0) /
        onsetDensityHistoryRef.current.length;
      triggers.density = Math.min(1, avgDensity * 3);

      // Continuous values
      triggers.intensity = spectral.rms;
      triggers.brightness = spectral.spectralCentroid;

      // Drop detection: novelty peak + RMS spike + sub-bass spike
      triggers.dropDetected =
        noveltyData.noveltyPeak &&
        spectral.rms > settings.dropRmsThreshold &&
        spectral.subBassRatio > settings.dropSubBassThreshold;

      // Buildup detection: energy trend building for configured duration
      triggers.buildupDetected =
        noveltyData.energyTrend === "building" && noveltyData.sectionAge > settings.buildupDuration;

      // Breakdown detection: low RMS + low density (only during near-silence)
      triggers.breakdownDetected =
        spectral.rms < BREAKDOWN_RMS_THRESHOLD && avgDensity < BREAKDOWN_DENSITY_THRESHOLD;

      // Song change detection: extended silence or significant BPM shift
      if (spectral.rms < SILENCE_THRESHOLD) {
        if (silenceStartRef.current === null) {
          silenceStartRef.current = timestamp;
        }
        const silenceDuration = timestamp - silenceStartRef.current;
        triggers.possibleSongChange = silenceDuration > SILENCE_DURATION;
      } else {
        silenceStartRef.current = null;

        // Also check for BPM shift
        if (bpmData.confidence > 0.5 && prevBPMRef.current > 0) {
          const bpmChange = Math.abs(bpmData.bpm - prevBPMRef.current) / prevBPMRef.current;
          triggers.possibleSongChange = bpmChange > BPM_CHANGE_THRESHOLD;
        } else {
          triggers.possibleSongChange = false;
        }
      }

      if (bpmData.confidence > 0.5) {
        prevBPMRef.current = bpmData.bpm;
      }

      return { ...triggers };
    },
    [processBeat, processNovelty, settings]
  );

  const reset = useCallback(() => {
    resetBPM();
    resetNovelty();
    triggersRef.current = { ...DEFAULT_TRIGGERS };
    prevBPMRef.current = 0;
    silenceStartRef.current = null;
    prevBeatCountRef.current = 0;
    onsetDensityHistoryRef.current = [];
  }, [resetBPM, resetNovelty]);

  return { processAudio, reset };
}
