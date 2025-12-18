"use client";

import { useCallback } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  useVisualizationControls,
  type VisualizationControlsState,
} from "@/hooks/useVisualizationControls";

interface SwitchControlProps {
  controlKey: keyof VisualizationControlsState;
  label: string;
}

export function SwitchControl({ controlKey, label }: SwitchControlProps) {
  const checked = useVisualizationControls((state) => state[controlKey]) as boolean;
  const set = useVisualizationControls((state) => state.set);

  const handleChange = useCallback(
    (newChecked: boolean) => {
      set(controlKey, newChecked as VisualizationControlsState[typeof controlKey]);
    },
    [controlKey, set]
  );

  return (
    <div className="flex items-center justify-between">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Switch checked={checked} onCheckedChange={handleChange} className="scale-90" />
    </div>
  );
}
