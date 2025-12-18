"use client";

import { useCallback, useMemo } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { Label } from "@/components/ui/label";
import {
  useVisualizationControls,
  type VisualizationControlsState,
} from "@/hooks/useVisualizationControls";

interface SliderControlProps {
  controlKey: keyof VisualizationControlsState;
  label: string;
  min: number;
  max: number;
  step: number;
}

export function SliderControl({ controlKey, label, min, max, step }: SliderControlProps) {
  const value = useVisualizationControls((state) => state[controlKey]) as number;
  const set = useVisualizationControls((state) => state.set);

  const handleChange = useCallback(
    (newValue: number[]) => {
      set(controlKey, newValue[0] as VisualizationControlsState[typeof controlKey]);
    },
    [controlKey, set]
  );

  const formatValue = (v: number) => {
    if (step >= 1) return v.toFixed(0);
    if (step >= 0.1) return v.toFixed(1);
    return v.toFixed(2);
  };

  const fillPercent = useMemo(() => ((value - min) / (max - min)) * 100, [value, min, max]);

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="font-mono text-xs text-primary tabular-nums">{formatValue(value)}</span>
      </div>
      <SliderPrimitive.Root
        className="relative flex w-full touch-none items-center select-none h-6 cursor-pointer"
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={handleChange}
      >
        <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-white/10">
          <div
            className="absolute h-full rounded-full bg-primary/60"
            style={{ width: `${fillPercent}%` }}
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="block size-4 rounded-full border-2 border-primary bg-transparent hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-grab active:cursor-grabbing" />
      </SliderPrimitive.Root>
    </div>
  );
}
