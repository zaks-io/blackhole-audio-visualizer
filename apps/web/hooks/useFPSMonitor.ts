import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { create } from "zustand";

const HISTORY_SIZE = 60;
const SPIKE_THRESHOLD_MS = 30;
// FPSTracker updates its sample ~15fps (every ~66ms), so 60s ~= 900 samples.
const WINDOW_SAMPLES = 900;

interface FPSState {
  fps: number;
  history: Float32Array;
  historyIndex: number;
  historyVersion: number;
  lastDeltaMs: number;
  spikeCount: number; // rolling window spikes (last ~60s), deltaMs > SPIKE_THRESHOLD_MS
  maxDeltaMs: number; // rolling window max frame delta (last ~60s)
  windowSpikes: Uint16Array;
  windowMaxDelta: Float32Array;
  windowIndex: number;
  windowFilled: boolean;
  windowSpikeSum: number;
  updateSample: (
    fps: number,
    deltaMs: number,
    spikesSinceLast: number,
    maxDeltaSinceLast: number
  ) => void;
  resetSpikes: () => void;
  getLow1Percent: () => number;
}

export const useFPSStore = create<FPSState>((set, get) => ({
  fps: 60,
  history: (() => {
    const arr = new Float32Array(HISTORY_SIZE);
    arr.fill(60);
    return arr;
  })(),
  historyIndex: 0,
  historyVersion: 0,
  lastDeltaMs: 16.7,
  spikeCount: 0,
  maxDeltaMs: 0,
  windowSpikes: (() => new Uint16Array(WINDOW_SAMPLES))(),
  windowMaxDelta: (() => new Float32Array(WINDOW_SAMPLES))(),
  windowIndex: 0,
  windowFilled: false,
  windowSpikeSum: 0,
  updateSample: (
    fps: number,
    deltaMs: number,
    spikesSinceLast: number,
    maxDeltaSinceLast: number
  ) =>
    set((state) => {
      // Ring buffer write (no allocations)
      state.history[state.historyIndex] = fps;
      const nextIndex = (state.historyIndex + 1) % HISTORY_SIZE;

      // Rolling window update (no allocations)
      const wi = state.windowIndex;
      const oldSpikes = state.windowSpikes[wi];
      state.windowSpikes[wi] = spikesSinceLast;
      state.windowMaxDelta[wi] = maxDeltaSinceLast;

      const nextWindowIndex = (wi + 1) % WINDOW_SAMPLES;
      const filled = state.windowFilled || nextWindowIndex === 0;
      const spikeSum = state.windowSpikeSum - oldSpikes + spikesSinceLast;

      // Maintain rolling max of the last ~60s of spike deltas.
      // Once the window is filled, we recompute each update for correctness/stability.
      // (WINDOW_SAMPLES=900 @ ~15Hz => ~13.5k float compares/sec, negligible.)
      let rollingMax = 0;
      if (!filled) {
        rollingMax = Math.max(state.maxDeltaMs, maxDeltaSinceLast);
      } else {
        for (let i = 0; i < WINDOW_SAMPLES; i++) {
          const v = state.windowMaxDelta[i];
          if (v > rollingMax) rollingMax = v;
        }
      }

      return {
        fps,
        history: state.history,
        historyIndex: nextIndex,
        historyVersion: state.historyVersion + 1,
        lastDeltaMs: deltaMs,
        windowIndex: nextWindowIndex,
        windowFilled: filled,
        windowSpikeSum: spikeSum,
        spikeCount: spikeSum,
        maxDeltaMs: rollingMax,
      };
    }),
  resetSpikes: () =>
    set((state) => {
      state.windowSpikes.fill(0);
      state.windowMaxDelta.fill(0);
      return {
        spikeCount: 0,
        maxDeltaMs: 0,
        windowIndex: 0,
        windowFilled: false,
        windowSpikeSum: 0,
      };
    }),
  getLow1Percent: () => {
    const state = get();
    // Copy active window values to sort
    const count = state.windowFilled ? WINDOW_SAMPLES : state.windowIndex;
    if (count === 0) return 0;

    // Create a temp array of the valid samples
    const samples = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      samples[i] = state.windowMaxDelta[i];
    }

    // Sort descending to find high latency frames
    samples.sort((a, b) => b - a);

    // 99th percentile (top 1% worst frames)
    // Index 0 is the worst. Index N * 0.01 is the 99th percentile.
    const index = Math.floor(count * 0.01);
    return samples[index] || 0;
  },
}));

export function FPSTracker() {
  const lastUpdateRef = useRef(0);
  const updateSample = useFPSStore((s) => s.updateSample);
  const spikesSinceLastRef = useRef(0);
  const maxDeltaSinceLastRef = useRef(0);

  useFrame((_, delta) => {
    const now = performance.now();
    const deltaMs = delta * 1000;

    // Track max frame delta in the current ~66ms bucket (always updates; not only spikes)
    if (deltaMs > maxDeltaSinceLastRef.current) {
      maxDeltaSinceLastRef.current = deltaMs;
    }

    if (deltaMs > SPIKE_THRESHOLD_MS) {
      spikesSinceLastRef.current += 1;
    }

    // Update at ~15fps to reduce overhead
    if (now - lastUpdateRef.current >= 66) {
      const fps = Math.round(1 / delta);
      updateSample(fps, deltaMs, spikesSinceLastRef.current, maxDeltaSinceLastRef.current);
      lastUpdateRef.current = now;
      spikesSinceLastRef.current = 0;
      maxDeltaSinceLastRef.current = 0;
    }
  });

  return null;
}
