"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { CameraControls } from "@/components/camera";
import { PlaylistControls } from "@/components/playlist";
import { SceneSelector } from "@/components/scenes";
import { useViewerMode } from "@/hooks/useViewerMode";
import { cn } from "@/lib/utils";
import type { CameraMode } from "@/components/CameraSystem";
import type { SceneWithDetails } from "@/hooks/useConvexScenes";

interface TopToolbarProps {
  currentCameraMode?: CameraMode;
  onCameraModeChange?: (mode: CameraMode) => void;
  isCameraTransitioning?: boolean;
  currentScene?: SceneWithDetails | null;
}

export function TopToolbar({
  currentCameraMode,
  onCameraModeChange,
  isCameraTransitioning = false,
  currentScene,
}: TopToolbarProps) {
  const mode = useViewerMode((s) => s.mode);
  const sceneId = useViewerMode((s) => s.sceneId);

  const showCenteredSceneSelector = mode === "scene" && !sceneId;

  return (
    <TooltipProvider delayDuration={300}>
      {/* Centered scene selector when no scene is selected */}
      {showCenteredSceneSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="glass-panel rounded-2xl px-6 py-4 flex flex-col items-center gap-3 pointer-events-auto">
            <span className="text-sm text-muted-foreground">Select a scene to play</span>
            <SceneSelector currentScene={currentScene} />
          </div>
        </div>
      )}

      {/* Top toolbar - hidden when showing centered selector */}
      {!showCenteredSceneSelector && (
        <div className="fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 pointer-events-none hidden sm:flex">
          <div
            className={cn(
              "glass-panel rounded-full px-4 py-2 flex items-center gap-2",
              "pointer-events-auto"
            )}
          >
            {mode === "live" && currentCameraMode && onCameraModeChange && (
              <>
                <CameraControls
                  currentMode={currentCameraMode}
                  onModeChange={onCameraModeChange}
                  isTransitioning={isCameraTransitioning}
                />
                <PlaylistControls />
              </>
            )}

            {mode === "scene" && <SceneSelector currentScene={currentScene} />}
          </div>
        </div>
      )}
    </TooltipProvider>
  );
}
