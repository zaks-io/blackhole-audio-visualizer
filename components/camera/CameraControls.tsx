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
  compact?: boolean;
}

const CAMERA_MODES: { id: CameraMode; label: string }[] = [
  { id: "free", label: "Free Look" },
  { id: "circle", label: "Circle" },
  { id: "closeup", label: "Close Up" },
  { id: "orbit", label: "Orbit" },
  { id: "edge", label: "Edge" },
];

export function CameraControls({
  currentMode,
  onModeChange,
  isTransitioning,
  compact = false,
}: CameraControlsProps) {
  return (
    <Select
      value={currentMode}
      onValueChange={(value) => onModeChange(value as CameraMode)}
      disabled={isTransitioning}
    >
      <SelectTrigger
        className={cn(
          "h-10 gap-2 rounded-full border-0 bg-transparent",
          "hover:bg-accent/50",
          "focus:ring-0 focus-visible:ring-0",
          isTransitioning && "opacity-50 cursor-wait",
          compact ? "w-10 px-0 justify-center sm:w-auto sm:px-3" : "w-auto px-3"
        )}
      >
        <Video className="h-4 w-4 shrink-0" />
        <span className={cn(compact && "hidden sm:inline")}>
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent position="popper" className="!overflow-y-visible !max-h-none">
        {CAMERA_MODES.map((mode) => (
          <SelectItem key={mode.id} value={mode.id}>
            {mode.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
