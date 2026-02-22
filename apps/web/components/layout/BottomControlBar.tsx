"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { CameraControls } from "@/components/camera";
import { PresetSelector } from "@/components/playlist";
import { PresetVoteButtons } from "@/components/playlist/PresetVoteButtons";
import { usePresetSelector } from "@/components/playlist/usePresetSelector";
import { useUIState } from "@/hooks/useUIState";
import { cn } from "@/lib/utils";
import type { CameraMode } from "@/components/CameraSystem";

interface BottomControlBarProps {
  currentCameraMode: CameraMode;
  onCameraModeChange: (mode: CameraMode) => void;
  isCameraTransitioning: boolean;
}

export function BottomControlBar({
  currentCameraMode,
  onCameraModeChange,
  isCameraTransitioning,
}: BottomControlBarProps) {
  const controlBarCollapsed = useUIState((s) => s.controlBarCollapsed);

  const activePresetId = usePresetSelector((s) => s.activePresetId);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 pointer-events-none transition-all duration-300 ease-out hidden sm:flex",
          controlBarCollapsed && "opacity-0 translate-y-full"
        )}
      >
        <div
          className={cn(
            "glass-panel rounded-full px-4 py-2 flex items-center gap-2",
            !controlBarCollapsed && "pointer-events-auto"
          )}
        >
          <CameraControls
            currentMode={currentCameraMode}
            onModeChange={onCameraModeChange}
            isTransitioning={isCameraTransitioning}
          />
          <PresetSelector />
        </div>
      </div>
      <PresetVoteButtons presetId={activePresetId} />
    </TooltipProvider>
  );
}
