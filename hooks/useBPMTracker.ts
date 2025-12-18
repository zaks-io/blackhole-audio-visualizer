"use client";

import { useRef, useCallback } from "react";

export interface BPMData {
  bpm: number;
  confidence: number;
  beatPhase: number;
  isOnBeat: boolean;
  timeSinceLastBeat: number;
  beatCount: number;
}

const DEFAULT_BPM_DATA: BPMData = {
  bpm: 0,
  confidence: 0,
  beatPhase: 0,
  isOnBeat: false,
  timeSinceLastBeat: 0,
  beatCount: 0,
};

// BPM range to consider (most music falls in 60-180 BPM)
const MIN_BPM = 60;
const MAX_BPM = 180;
const MIN_INTERVAL = 60000 / MAX_BPM; // ~333ms
const MAX_INTERVAL = 60000 / MIN_BPM; // 1000ms

// Number of recent onsets to track
const ONSET_BUFFER_SIZE = 32;

// Beat detection threshold
const ONSET_THRESHOLD = 0.15;
const BEAT_PHASE_THRESHOLD = 0.1;

export function useBPMTracker() {
  const onsetTimesRef = useRef<number[]>([]);
  const lastOnsetTimeRef = useRef<number>(0);
  const estimatedBPMRef = useRef<number>(0);
  const confidenceRef = useRef<number>(0);
  const beatCountRef = useRef<number>(0);
  const lastBeatTimeRef = useRef<number>(0);
  const bpmDataRef = useRef<BPMData>({ ...DEFAULT_BPM_DATA });
  const prevOnsetRef = useRef<number>(0);

  const processBeat = useCallback((onsetValue: number, timestamp: number): BPMData => {
    const data = bpmDataRef.current;

    // Detect onset (significant increase in beat signal)
    const isOnset = onsetValue > ONSET_THRESHOLD && prevOnsetRef.current <= ONSET_THRESHOLD;
    prevOnsetRef.current = onsetValue;

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

          // Cluster intervals to find dominant tempo
          const bpmEstimates = intervals.map((interval) => 60000 / interval);

          // Filter to valid BPM range
          const validEstimates = bpmEstimates.filter((bpm) => bpm >= MIN_BPM && bpm <= MAX_BPM);

          if (validEstimates.length > 0) {
            // Use median for robustness
            validEstimates.sort((a, b) => a - b);
            const medianBPM = validEstimates[Math.floor(validEstimates.length / 2)];

            // Smooth BPM estimate
            if (estimatedBPMRef.current === 0) {
              estimatedBPMRef.current = medianBPM;
            } else {
              estimatedBPMRef.current = estimatedBPMRef.current * 0.9 + medianBPM * 0.1;
            }

            // Calculate confidence based on interval consistency
            const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
            const variance =
              intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) /
              intervals.length;
            const stdDev = Math.sqrt(variance);
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

    return { ...data };
  }, []);

  const reset = useCallback(() => {
    onsetTimesRef.current = [];
    lastOnsetTimeRef.current = 0;
    estimatedBPMRef.current = 0;
    confidenceRef.current = 0;
    beatCountRef.current = 0;
    lastBeatTimeRef.current = 0;
    prevOnsetRef.current = 0;
    bpmDataRef.current = { ...DEFAULT_BPM_DATA };
  }, []);

  return { processBeat, reset };
}
