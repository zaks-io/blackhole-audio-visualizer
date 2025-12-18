"use client";

import { Eye, Orbit, ArrowUpRight, ArrowDown } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CameraMode } from "@/components/CameraSystem";

interface CameraControlsProps {
  currentMode: CameraMode;
  onModeChange: (mode: CameraMode) => void;
  isTransitioning: boolean;
}

const CAMERA_MODES: { id: CameraMode; label: string; icon: React.ReactNode }[] = [
  { id: "free", label: "Free Look", icon: <Eye className="h-4 w-4" /> },
  { id: "orbital", label: "Orbital", icon: <Orbit className="h-4 w-4" /> },
  { id: "flyby", label: "Flyby", icon: <ArrowUpRight className="h-4 w-4" /> },
  { id: "topdown", label: "Top View", icon: <ArrowDown className="h-4 w-4" /> },
];

export function CameraControls({
  currentMode,
  onModeChange,
  isTransitioning,
}: CameraControlsProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <ToggleGroup
        type="single"
        value={currentMode}
        onValueChange={(value) => {
          if (value) onModeChange(value as CameraMode);
        }}
        className="gap-1"
      >
        {CAMERA_MODES.map((mode) => (
          <Tooltip key={mode.id}>
            <TooltipTrigger asChild>
              <ToggleGroupItem
                value={mode.id}
                disabled={isTransitioning && mode.id !== "free"}
                className={cn(
                  "h-10 w-10 rounded-full",
                  "data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                  "data-[state=on]:glow-cyan-sm",
                  "transition-all duration-200",
                  isTransitioning && mode.id !== "free" && "opacity-50 cursor-wait"
                )}
              >
                {mode.icon}
              </ToggleGroupItem>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {mode.label}
            </TooltipContent>
          </Tooltip>
        ))}
      </ToggleGroup>
    </TooltipProvider>
  );
}
