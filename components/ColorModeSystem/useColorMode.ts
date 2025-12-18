import { useState, useCallback, useRef } from 'react';
import {
  PALETTES,
  PALETTE_IDS,
  PALETTE_OFFSETS,
  getAllColors,
  type ColorPaletteId,
} from './colorPalettes';

interface UseColorModeReturn {
  paletteId: ColorPaletteId;
  paletteOffset: number;
  allColors: string[];
  setPalette: (id: ColorPaletteId) => void;
  processBeat: (intensity: number, time: number) => void;
}

export function useColorMode(): UseColorModeReturn {
  const [paletteId, setPaletteId] = useState<ColorPaletteId>('grayscale');
  const lastTriggerTimeRef = useRef(0);
  const silenceStartRef = useRef<number | null>(null);

  const allColors = getAllColors();
  const paletteOffset = PALETTE_OFFSETS[paletteId];

  const setPalette = useCallback((newId: ColorPaletteId) => {
    setPaletteId(newId);
  }, []);

  const triggerRandomPalette = useCallback(() => {
    const otherIds = PALETTE_IDS.filter((id) => id !== paletteId && id !== 'default');
    const randomId = otherIds[Math.floor(Math.random() * otherIds.length)];
    setPaletteId(randomId);
  }, [paletteId]);

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
    paletteId,
    paletteOffset,
    allColors,
    setPalette,
    processBeat,
  };
}
