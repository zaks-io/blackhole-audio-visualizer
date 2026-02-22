"use client";

import { useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  useVisualizationControls,
  type VisualizationControlsState,
} from "@/hooks/useVisualizationControls";

interface SelectControlProps {
  controlKey: keyof VisualizationControlsState;
  label: string;
  options: readonly string[];
}

export function SelectControl({ controlKey, label, options }: SelectControlProps) {
  const value = useVisualizationControls((state) => state[controlKey]) as string;
  const set = useVisualizationControls((state) => state.set);

  const handleChange = useCallback(
    (newValue: string) => {
      set(controlKey, newValue as VisualizationControlsState[typeof controlKey]);
    },
    [controlKey, set]
  );

  return (
    <div className="grid gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={handleChange}>
        <SelectTrigger className="h-8 text-xs bg-secondary/50 border-border">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option} className="text-xs">
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
