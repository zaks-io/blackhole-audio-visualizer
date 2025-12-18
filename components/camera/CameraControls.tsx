"use client";

import { Video } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CameraMode } from "@/components/CameraSystem";

interface CameraControlsProps {
  currentMode: CameraMode;
  onModeChange: (mode: CameraMode) => void;
  isTransitioning: boolean;
}

const CAMERA_MODES: { id: CameraMode; label: string }[] = [
  { id: "free", label: "Free Look" },
  { id: "circle", label: "Circle" },
  { id: "closeup", label: "Close Up" },
  { id: "orbit", label: "Orbit" },
];

export function CameraControls({
  currentMode,
  onModeChange,
  isTransitioning,
}: CameraControlsProps) {
  return (
    <Select
      value={currentMode}
      onValueChange={(value) => onModeChange(value as CameraMode)}
      disabled={isTransitioning}
    >
      <SelectTrigger
        className={cn(
          "h-10 w-auto gap-2 rounded-full border-0 bg-transparent px-3",
          "hover:bg-accent/50",
          "focus:ring-0 focus-visible:ring-0",
          isTransitioning && "opacity-50 cursor-wait"
        )}
      >
        <Video className="h-4 w-4" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CAMERA_MODES.map((mode) => (
          <SelectItem key={mode.id} value={mode.id}>
            {mode.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
