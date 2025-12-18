"use client";

import { useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <span className="font-mono text-xs text-primary tabular-nums">{formatValue(value)}</span>
      </div>
      <Slider
        value={[value]}
        onValueChange={handleChange}
        min={min}
        max={max}
        step={step}
        className={cn("cursor-pointer", "[&_[role=slider]]:h-3 [&_[role=slider]]:w-3")}
      />
    </div>
  );
}
