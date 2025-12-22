import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { create } from "zustand";

const HISTORY_SIZE = 60;
const SPIKE_THRESHOLD_MS = 30;

interface FPSState {
  fps: number;
  history: Float32Array;
  historyIndex: number;
  historyVersion: number;
  lastDeltaMs: number;
  spikeCount: number;
  maxDeltaMs: number;
  updateSample: (
    fps: number,
    deltaMs: number,
    spikesSinceLast: number,
    maxDeltaSinceLast: number
  ) => void;
  resetSpikes: () => void;
}

export const useFPSStore = create<FPSState>((set) => ({
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

      return {
        fps,
        history: state.history,
        historyIndex: nextIndex,
        historyVersion: state.historyVersion + 1,
        lastDeltaMs: deltaMs,
        spikeCount: state.spikeCount + spikesSinceLast,
        maxDeltaMs: Math.max(state.maxDeltaMs, maxDeltaSinceLast),
      };
    }),
  resetSpikes: () => set({ spikeCount: 0, maxDeltaMs: 0 }),
}));

export function FPSTracker() {
  const lastUpdateRef = useRef(0);
  const updateSample = useFPSStore((s) => s.updateSample);
  const spikesSinceLastRef = useRef(0);
  const maxDeltaSinceLastRef = useRef(0);

  useFrame((_, delta) => {
    const now = performance.now();
    const deltaMs = delta * 1000;

    if (deltaMs > SPIKE_THRESHOLD_MS) {
      spikesSinceLastRef.current += 1;
      if (deltaMs > maxDeltaSinceLastRef.current) {
        maxDeltaSinceLastRef.current = deltaMs;
      }
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
