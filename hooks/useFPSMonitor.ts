import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { create } from "zustand";

const HISTORY_SIZE = 60;

interface FPSState {
  fps: number;
  history: number[];
  update: (fps: number) => void;
}

export const useFPSStore = create<FPSState>((set) => ({
  fps: 60,
  history: new Array(HISTORY_SIZE).fill(60),
  update: (fps: number) =>
    set((state) => {
      const history = [...state.history, fps];
      if (history.length > HISTORY_SIZE) {
        history.shift();
      }
      return { fps, history };
    }),
}));

export function FPSTracker() {
  const lastUpdateRef = useRef(0);
  const update = useFPSStore((s) => s.update);

  useFrame((_, delta) => {
    const now = performance.now();

    // Update at ~15fps to reduce overhead
    if (now - lastUpdateRef.current >= 66) {
      const fps = Math.round(1 / delta);
      update(fps);
      lastUpdateRef.current = now;
    }
  });

  return null;
}
