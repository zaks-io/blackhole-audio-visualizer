"use client";

import { useState, useCallback, memo, type RefObject } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  Pause,
  Repeat,
  Info,
  Settings,
  Film,
  Code,
  Gauge,
  Zap,
  ArrowLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SceneTimeline } from "./SceneTimeline";
import { TimeDisplay } from "./TimeDisplay";
import { SceneInfoPanel } from "./SceneInfoPanel";
import { useUIState } from "@/hooks/useUIState";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useSceneControls } from "@/components/scenes/useSceneControls";
import { useSceneRecording } from "@/hooks/useSceneRecording";
import { RecordButton } from "@/components/recording/RecordButton";
import type { SceneWithDetails } from "@/hooks/useConvexScenes";
import type { useUnifiedPlayer } from "@/hooks/useUnifiedPlayer";
import { cn } from "@/lib/utils";

interface ScenePlayerControlsProps {
  scene: SceneWithDetails;
  player: ReturnType<typeof useUnifiedPlayer>;
  canvasRef: RefObject<HTMLDivElement | null>;
  getRecordingStream: () => MediaStream | null;
}

function ScenePlayerControlsComponent({
  scene,
  player,
  canvasRef,
  getRecordingStream,
}: ScenePlayerControlsProps) {
  const router = useRouter();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const {
    devControlsVisible,
    toggleDevControls,
    fpsVisible,
    toggleFPS,
    bassStrobeEnabled,
    toggleBassStrobe,
    controlBarCollapsed,
    setControlBarCollapsed,
    setDevControlsVisible,
  } = useUIState();
  const { openSceneEditor, closeSceneEditor, isSceneEditorOpen } = useSceneControls();
  const isAdmin = useIsAdmin();

  const sceneRecording = useSceneRecording({
    player,
    getRecordingStream,
    canvasRef,
  });

  const handleHideControls = useCallback(() => {
    setDevControlsVisible(false);
    setControlBarCollapsed(true);
  }, [setDevControlsVisible, setControlBarCollapsed]);

  const handleShowControls = useCallback(() => {
    setControlBarCollapsed(false);
  }, [setControlBarCollapsed]);

  const {
    state,
    play,
    pause,
    resume,
    seek,
    setLoop,
    loopEnabled,
    sectionTimings,
    subscribeToTime,
    getCurrentTime,
  } = player;
  const { isPlaying, isPaused, duration, currentSectionIndex } = state;

  const canPlay = !!scene.audioUrl || (scene.playlist && scene.playlist.items.length > 0);

  const handlePlayPause = useCallback(() => {
    if (!isPlaying) {
      play();
    } else if (isPaused) {
      resume();
    } else {
      pause();
    }
  }, [isPlaying, isPaused, play, pause, resume]);

  const handleSeek = useCallback(
    (time: number) => {
      seek(time);
    },
    [seek]
  );

  const handleToggleLoop = useCallback(() => {
    setLoop(!loopEnabled);
  }, [loopEnabled, setLoop]);

  const showPlayButton = !isPlaying || isPaused;

  return (
    <TooltipProvider delayDuration={300}>
      {/* Floating pill toolbar */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 pointer-events-none transition-all duration-300 ease-out",
          controlBarCollapsed && "opacity-0 translate-x-full"
        )}
      >
        <div
          className={cn(
            "glass-panel rounded-full px-4 py-2 flex items-center gap-2",
            !controlBarCollapsed && "pointer-events-auto"
          )}
        >
          {/* Back button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push("/app")}
                className="h-10 w-10 rounded-full"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Back to Home
            </TooltipContent>
          </Tooltip>

          {/* Play/Pause button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePlayPause}
                disabled={!canPlay}
                className="h-10 w-10 rounded-full"
              >
                {showPlayButton ? (
                  <Play className="h-5 w-5 ml-0.5" />
                ) : (
                  <Pause className="h-5 w-5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {showPlayButton ? "Play" : "Pause"}
            </TooltipContent>
          </Tooltip>

          {/* Timeline */}
          <div className="w-64 sm:w-80 md:w-96">
            <SceneTimeline
              subscribeToTime={subscribeToTime}
              getCurrentTime={getCurrentTime}
              duration={duration}
              sectionTimings={sectionTimings}
              currentSectionIndex={currentSectionIndex}
              onSeek={handleSeek}
              disabled={duration === 0}
            />
          </div>

          {/* Time display - self-rendering via subscription */}
          <TimeDisplay
            subscribeToTime={subscribeToTime}
            getCurrentTime={getCurrentTime}
            duration={duration}
          />

          {/* Loop toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleToggleLoop}
                className={cn(
                  "h-10 w-10 rounded-full",
                  loopEnabled && "bg-primary/20 text-primary"
                )}
              >
                <Repeat className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {loopEnabled ? "Disable Loop" : "Enable Loop"}
            </TooltipContent>
          </Tooltip>

          {/* Info button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsInfoOpen(true)}
                className="h-10 w-10 rounded-full"
              >
                <Info className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Scene Info
            </TooltipContent>
          </Tooltip>

          {/* Scene Editor button - Admin only */}
          {isAdmin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => (isSceneEditorOpen ? closeSceneEditor() : openSceneEditor())}
                  className={cn(
                    "h-10 w-10 rounded-full",
                    isSceneEditorOpen && "bg-primary/20 text-primary"
                  )}
                >
                  <Film className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Scene Editor
              </TooltipContent>
            </Tooltip>
          )}

          {/* Record button - Admin only */}
          {isAdmin && (
            <RecordButton
              isRecording={sceneRecording.isRecording}
              duration={sceneRecording.duration}
              disabled={!scene.audioUrl || scene.song?.status === "generating"}
              onToggle={
                sceneRecording.isRecording
                  ? sceneRecording.stopRecording
                  : sceneRecording.startRecording
              }
            />
          )}

          {/* Settings dropdown - Admin only */}
          {isAdmin && (
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Settings
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Gauge className="h-4 w-4" />
                    <span>FPS Meter</span>
                  </div>
                  <Switch checked={fpsVisible} onCheckedChange={toggleFPS} />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    <span>Bass Strobe</span>
                  </div>
                  <Switch checked={bassStrobeEnabled} onCheckedChange={toggleBassStrobe} />
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    <span>Developer Controls</span>
                  </div>
                  <Switch checked={devControlsVisible} onCheckedChange={toggleDevControls} />
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Collapse button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleHideControls}
                className="h-10 w-10 rounded-full"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Hide Controls
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Current section name */}
        {currentSectionIndex >= 0 && scene.compositionPlan && (
          <div className="absolute bottom-16 left-0 right-0 text-center pointer-events-none">
            <span className="text-xs text-white/50 glass-panel rounded-full px-3 py-1">
              {scene.compositionPlan.sections[currentSectionIndex]?.section_name}
            </span>
          </div>
        )}
      </div>

      {/* Collapsed FAB */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 transition-all duration-300 ease-out",
          controlBarCollapsed
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-4 pointer-events-none"
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={handleShowControls}
              className="glass-panel h-12 w-12 rounded-full p-0"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="text-xs">
            Show Controls
          </TooltipContent>
        </Tooltip>
      </div>

      {/* Info panel */}
      <SceneInfoPanel
        scene={scene}
        sectionTimings={sectionTimings}
        currentSectionIndex={currentSectionIndex}
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />
    </TooltipProvider>
  );
}

export const ScenePlayerControls = memo(ScenePlayerControlsComponent);
