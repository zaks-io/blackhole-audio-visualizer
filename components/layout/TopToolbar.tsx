"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { CameraControls } from "@/components/camera";
import { PresetSelector } from "@/components/playlist";
import { useViewerMode } from "@/hooks/useViewerMode";
import { useUIState } from "@/hooks/useUIState";
import { cn } from "@/lib/utils";
import type { CameraMode } from "@/components/CameraSystem";

interface TopToolbarProps {
  currentCameraMode?: CameraMode;
  onCameraModeChange?: (mode: CameraMode) => void;
  isCameraTransitioning?: boolean;
}

export function TopToolbar({
  currentCameraMode,
  onCameraModeChange,
  isCameraTransitioning = false,
}: TopToolbarProps) {
  const mode = useViewerMode((s) => s.mode);
  const controlBarCollapsed = useUIState((s) => s.controlBarCollapsed);

  // Scene selection is handled from the bottom control bar (ModeToggle Film dropdown).
  // Keep the top toolbar focused on live-mode camera + preset controls.
  if (mode !== "live") return null;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 pointer-events-none hidden sm:flex",
          "transition-all duration-300",
          controlBarCollapsed && "-translate-y-full opacity-0"
        )}
      >
        <div
          className={cn(
            "glass-panel rounded-full px-4 py-2 flex items-center gap-2",
            "pointer-events-auto"
          )}
        >
          {currentCameraMode && onCameraModeChange && (
            <>
              <CameraControls
                currentMode={currentCameraMode}
                onModeChange={onCameraModeChange}
                isTransitioning={isCameraTransitioning}
              />
              <PresetSelector />
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
