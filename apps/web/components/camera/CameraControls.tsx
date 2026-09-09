"use client";

import { Video } from "lucide-react";
import { useCameraMode, type CameraMode } from "@/components/CameraSystem";
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";

const CAMERA_MODES: { id: CameraMode; label: string }[] = [
  { id: "free", label: "Free Look" },
  { id: "circle", label: "Circle" },
  { id: "closeup", label: "Close Up" },
  { id: "orbit", label: "Orbit" },
  { id: "edge", label: "Edge" },
];

export function CameraControls() {
  const { mode, setMode, isTransitioning } = useCameraMode();
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={isTransitioning} aria-label="Camera">
        <Video className="h-4 w-4 text-muted-foreground" />
        <span>{CAMERA_MODES.find((camera) => camera.id === mode)?.label}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuRadioGroup
          value={mode}
          onValueChange={(value) => setMode(value as CameraMode)}
        >
          {CAMERA_MODES.map((camera) => (
            <DropdownMenuRadioItem key={camera.id} value={camera.id}>
              {camera.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
