"use client";

import { useRef, useCallback } from "react";

export interface BPMData {
  bpm: number;
  confidence: number;
  beatPhase: number;
  isOnBeat: boolean;
  timeSinceLastBeat: number;
  beatCount: number;
  rawOnset: boolean;
  // Debug info
  threshold: number;
  avgEnergy: number;
}

const DEFAULT_BPM_DATA: BPMData = {
  bpm: 0,
  confidence: 0,
  beatPhase: 0,
  isOnBeat: false,
  timeSinceLastBeat: 0,
  beatCount: 0,
  rawOnset: false,
  threshold: 0,
  avgEnergy: 0,
};

// BPM range to consider (most music falls in 60-180 BPM)
const MIN_BPM = 60;
const MAX_BPM = 180;
const MIN_INTERVAL = 60000 / MAX_BPM; // ~333ms
const MAX_INTERVAL = 60000 / MIN_BPM; // 1000ms

// Number of recent onsets to track for BPM estimation
const ONSET_BUFFER_SIZE = 32;

// Energy history for adaptive threshold (~1 second at 60fps)
const ENERGY_HISTORY_SIZE = 43;

// Minimum time between beats (prevents double triggers)
const REFRACTORY_PERIOD = 100; // ms

// Beat phase detection
const BEAT_PHASE_THRESHOLD = 0.1;

/**
 * Adaptive threshold beat detection algorithm
 * Based on: https://www.parallelcube.com/2018/03/30/beat-detection-algorithm/
 *
 * Uses variance-based adaptive thresholding:
 * - High variance (noisy music) → lower threshold for easier detection
 * - Low variance (clean music) → higher threshold to avoid false positives
 */
export function useBPMTracker() {
  // Energy history for adaptive threshold
  const energyHistoryRef = useRef<number[]>([]);

  // Onset timing for BPM calculation
  const onsetTimesRef = useRef<number[]>([]);
  const lastOnsetTimeRef = useRef<number>(0);
  const lastBeatTimeRef = useRef<number>(0);

  // BPM estimation
  const estimatedBPMRef = useRef<number>(0);
  const confidenceRef = useRef<number>(0);
  const beatCountRef = useRef<number>(0);

  // Output data
  const bpmDataRef = useRef<BPMData>({ ...DEFAULT_BPM_DATA });

  const processBeat = useCallback((energy: number, timestamp: number): BPMData => {
    const data = bpmDataRef.current;
    const history = energyHistoryRef.current;

    // Add current energy to history
    history.push(energy);
    if (history.length > ENERGY_HISTORY_SIZE) {
      history.shift();
    }

    // Need enough history for reliable detection
    if (history.length < 10) {
      data.rawOnset = false;
      data.threshold = 0;
      data.avgEnergy = 0;
      return { ...data };
    }

    // Calculate average energy
    const avgEnergy = history.reduce((a, b) => a + b, 0) / history.length;

    // Calculate variance
    const variance =
      history.reduce((sum, e) => sum + Math.pow(e - avgEnergy, 2), 0) / history.length;

    // Adaptive threshold based on variance
    // Higher variance (noisy music) = lower multiplier = easier to trigger
    // Lower variance (clean music) = higher multiplier = needs bigger peaks
    // Formula: threshold_multiplier = -15 * variance + 1.55 (clamped to reasonable range)
    const varianceMultiplier = Math.max(1.1, Math.min(2.0, -15 * variance + 1.55));
    const adaptiveThreshold = avgEnergy * varianceMultiplier;

    // Check for beat: energy exceeds adaptive threshold
    const timeSinceLast = timestamp - lastBeatTimeRef.current;
    const isAboveThreshold = energy > adaptiveThreshold;
    const isPastRefractory = timeSinceLast > REFRACTORY_PERIOD;

    // Peak detection: we want the moment when we exceed threshold
    // Use a simple approach: trigger when above threshold and past refractory
    const isOnset = isAboveThreshold && isPastRefractory;

    if (isOnset) {
      const timeSinceLastOnset = timestamp - lastOnsetTimeRef.current;

      // Only record if interval is within reasonable BPM range
      if (timeSinceLastOnset >= MIN_INTERVAL && timeSinceLastOnset <= MAX_INTERVAL) {
        const onsetTimes = onsetTimesRef.current;
        onsetTimes.push(timestamp);

        // Keep buffer size limited
        if (onsetTimes.length > ONSET_BUFFER_SIZE) {
          onsetTimes.shift();
        }

        // Calculate BPM from inter-onset intervals
        if (onsetTimes.length >= 4) {
          const intervals: number[] = [];
          for (let i = 1; i < onsetTimes.length; i++) {
            intervals.push(onsetTimes[i] - onsetTimes[i - 1]);
          }

          // Convert to BPM estimates
          const bpmEstimates = intervals.map((interval) => 60000 / interval);

          // Filter to valid BPM range
          const validEstimates = bpmEstimates.filter((bpm) => bpm >= MIN_BPM && bpm <= MAX_BPM);

          if (validEstimates.length > 0) {
            // Use median for robustness against outliers
            validEstimates.sort((a, b) => a - b);
            const medianBPM = validEstimates[Math.floor(validEstimates.length / 2)];

            // Smooth BPM estimate (slower adaptation for stability)
            if (estimatedBPMRef.current === 0) {
              estimatedBPMRef.current = medianBPM;
            } else {
              estimatedBPMRef.current = estimatedBPMRef.current * 0.85 + medianBPM * 0.15;
            }

            // Calculate confidence based on interval consistency
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const intervalVariance =
              intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) /
              intervals.length;
            const stdDev = Math.sqrt(intervalVariance);
            const coefficientOfVariation = stdDev / avgInterval;

            // Lower variance = higher confidence
            confidenceRef.current = Math.max(0, Math.min(1, 1 - coefficientOfVariation * 2));
          }
        }
      }

      lastOnsetTimeRef.current = timestamp;
      beatCountRef.current++;
      lastBeatTimeRef.current = timestamp;
    }

    // Calculate beat phase (0-1, where 0 is on the beat)
    const bpm = estimatedBPMRef.current;
    const timeSinceLastBeat = timestamp - lastBeatTimeRef.current;

    if (bpm > 0) {
      const beatInterval = 60000 / bpm;
      const phase = (timeSinceLastBeat % beatInterval) / beatInterval;
      data.beatPhase = phase;
      data.isOnBeat = phase < BEAT_PHASE_THRESHOLD || phase > 1 - BEAT_PHASE_THRESHOLD;
    } else {
      data.beatPhase = 0;
      data.isOnBeat = false;
    }

    data.bpm = Math.round(estimatedBPMRef.current);
    data.confidence = confidenceRef.current;
    data.timeSinceLastBeat = timeSinceLastBeat;
    data.beatCount = beatCountRef.current;
    data.rawOnset = isOnset;
    data.threshold = adaptiveThreshold;
    data.avgEnergy = avgEnergy;

    return { ...data };
  }, []);

  const reset = useCallback(() => {
    energyHistoryRef.current = [];
    onsetTimesRef.current = [];
    lastOnsetTimeRef.current = 0;
    lastBeatTimeRef.current = 0;
    estimatedBPMRef.current = 0;
    confidenceRef.current = 0;
    beatCountRef.current = 0;
    bpmDataRef.current = { ...DEFAULT_BPM_DATA };
  }, []);

  return { processBeat, reset };
}
