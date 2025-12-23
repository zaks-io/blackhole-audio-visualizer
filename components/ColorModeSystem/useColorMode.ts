import { useCallback, useRef, useMemo, useEffect } from "react";
import { PALETTE_IDS, PALETTE_OFFSETS, getAllColors, type ColorPaletteId } from "./colorPalettes";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import { setRuntimeValue } from "@/lib/runtimeStateRegistry";

interface UseColorModeReturn {
  paletteId: ColorPaletteId;
  paletteOffset: number;
  allColors: string[];
  setPalette: (id: ColorPaletteId) => void;
  processBeat: (intensity: number, time: number) => void;
}

export function useColorMode(): UseColorModeReturn {
  // DON'T subscribe to Zustand - causes parent re-renders that cascade to 3D components
  // Instead use ref that's synced outside React's render cycle
  const paletteIdRef = useRef<ColorPaletteId>(useVisualizationControls.getState().colorPalette);

  // Subscribe to store changes OUTSIDE of React's render cycle
  // This updates the ref without causing re-renders
  useEffect(() => {
    const unsub = useVisualizationControls.subscribe((state) => {
      if (state.colorPalette !== paletteIdRef.current) {
        paletteIdRef.current = state.colorPalette;
        // Update runtimeState for GPU
        setRuntimeValue("colorPaletteOffset", PALETTE_OFFSETS[state.colorPalette]);
      }
    });
    return unsub;
  }, []);

  const lastTriggerTimeRef = useRef(0);
  const silenceStartRef = useRef<number | null>(null);

  // Memoize to avoid creating new array on every render
  const allColors = useMemo(() => getAllColors(), []);
  // Return offset from ref (stable, doesn't cause re-renders)
  const paletteOffset = PALETTE_OFFSETS[paletteIdRef.current];

  const setPalette = useCallback((newId: ColorPaletteId) => {
    paletteIdRef.current = newId;
    // Update runtimeState for GPU (immediate, no re-render)
    setRuntimeValue("colorPaletteOffset", PALETTE_OFFSETS[newId]);
    // Update Zustand for persistence/UI (will be picked up by subscription)
    useVisualizationControls.getState().set("colorPalette", newId);
  }, []);

  const triggerRandomPalette = useCallback(() => {
    const currentId = paletteIdRef.current;
    const otherIds = PALETTE_IDS.filter((id) => id !== currentId);
    const randomId = otherIds[Math.floor(Math.random() * otherIds.length)];
    setPalette(randomId);
  }, [setPalette]);

  const processBeat = useCallback(
    (intensity: number, time: number) => {
      const BEAT_THRESHOLD = 0.7;
      const COOLDOWN = 8.0;
      const SILENCE_THRESHOLD = 0.05;
      const SILENCE_DURATION = 3.0;

      // Detect silence (low energy for extended period)
      if (intensity < SILENCE_THRESHOLD) {
        if (silenceStartRef.current === null) {
          silenceStartRef.current = time;
        } else if (time - silenceStartRef.current > SILENCE_DURATION) {
          silenceStartRef.current = null;
          lastTriggerTimeRef.current = time;
          triggerRandomPalette();
          return;
        }
      } else {
        silenceStartRef.current = null;
      }

      // Detect strong beat with cooldown
      if (intensity > BEAT_THRESHOLD && time - lastTriggerTimeRef.current > COOLDOWN) {
        lastTriggerTimeRef.current = time;
        triggerRandomPalette();
      }
    },
    [triggerRandomPalette]
  );

  return {
    paletteId: paletteIdRef.current,
    paletteOffset,
    allColors,
    setPalette,
    processBeat,
  };
}
