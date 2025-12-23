"use client";

import { useState, useCallback, memo } from "react";
import { Play, Pause, Film, ChevronRight, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SceneTimeline } from "./SceneTimeline";
import { TimeDisplay } from "./TimeDisplay";
import { SceneInfoPanel } from "./SceneInfoPanel";
import { SubtitleDisplay } from "./SubtitleDisplay";
import { ModeToggle } from "@/components/layout/ModeToggle";
import { useProducerMode } from "@/components/ProducerMode";
import { SettingsMenu } from "@/components/dialogs";
import { UserMenu } from "@/components/auth/UserMenu";
import { useUIState } from "@/hooks/useUIState";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useSceneControls } from "@/components/scenes/useSceneControls";
import { useSceneRecording } from "@/hooks/useSceneRecording";
import { useConvexScenes, type SceneWithDetails } from "@/hooks/useConvexScenes";
import { useAudioPlayerStore } from "@/hooks/useAudioPlayerStore";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { useUnifiedPlayer } from "@/hooks/useUnifiedPlayer";
import { cn } from "@/lib/utils";

interface ScenePlayerControlsProps {
  scene: SceneWithDetails;
  player: ReturnType<typeof useUnifiedPlayer>;
  getRecordingStream: () => MediaStream | null;
}

function ScenePlayerControlsComponent({
  scene,
  player,
  getRecordingStream,
}: ScenePlayerControlsProps) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  // Use selectors to avoid re-renders from unrelated state changes
  const isProducerModeOpen = useProducerMode((s) => s.isOpen);
  const toggleProducerMode = useProducerMode((s) => s.toggleOpen);
  const setProducerModeOpen = useProducerMode((s) => s.setOpen);
  const { controlBarCollapsed, setControlBarCollapsed, setDevControlsVisible } = useUIState();
  const { openSceneAgent, closeSceneAgent, isSceneAgentOpen } = useSceneControls();
  const isAdmin = useIsAdmin();
  const { triggerTranscription } = useConvexScenes();
  const globalAudioPause = useAudioPlayerStore((s) => s.pause);
  const transcription = useQuery(
    api.model.transcriptions.public.getBySong,
    scene.song?._id ? { songId: scene.song._id } : "skip"
  );

  const sceneRecording = useSceneRecording({
    player,
    getRecordingStream,
  });

  const handleHideControls = useCallback(() => {
    setProducerModeOpen(false);
    setDevControlsVisible(false);
    setControlBarCollapsed(true);
  }, [setProducerModeOpen, setDevControlsVisible, setControlBarCollapsed]);

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
      globalAudioPause();
    }
  }, [isPlaying, isPaused, play, pause, resume, globalAudioPause]);

  const handleSeek = useCallback(
    (time: number) => {
      seek(time);
    },
    [seek]
  );

  const handleToggleLoop = useCallback(() => {
    setLoop(!loopEnabled);
  }, [loopEnabled, setLoop]);

  const handleRecordToggle = useCallback(() => {
    if (sceneRecording.isRecording) {
      sceneRecording.stopRecording();
    } else {
      sceneRecording.startRecording();
    }
  }, [sceneRecording]);

  const handleTranscribe = useCallback(() => {
    if (scene.song?._id) {
      triggerTranscription(scene.song._id);
    }
  }, [scene.song, triggerTranscription]);

  const showPlayButton = !isPlaying || isPaused;

  return (
    <TooltipProvider delayDuration={300}>
      {/* Subtitle display */}
      <SubtitleDisplay
        transcription={transcription}
        subscribeToTime={subscribeToTime}
        getCurrentTime={getCurrentTime}
        isVisible={!controlBarCollapsed}
      />

      {/* Floating pill toolbar */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 pointer-events-none transition-all duration-300 ease-out",
          controlBarCollapsed && "opacity-0 translate-x-full"
        )}
      >
        <div
          className={cn(
            "glass-panel rounded-full px-2 sm:px-4 py-2 flex items-center gap-1 sm:gap-2",
            !controlBarCollapsed && "pointer-events-auto"
          )}
        >
          {/* Preset Editor Toggle - Desktop only */}
          <div className="hidden md:block">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleProducerMode}
                  className={cn(
                    "h-10 w-10 rounded-full",
                    isProducerModeOpen && "bg-primary/20 text-primary"
                  )}
                >
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Preset Editor
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Scene Agent button - Admin only, Desktop only */}
          {isAdmin && (
            <div className="hidden md:block">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => (isSceneAgentOpen ? closeSceneAgent() : openSceneAgent())}
                    className={cn(
                      "h-10 w-10 rounded-full",
                      isSceneAgentOpen && "bg-primary/20 text-primary"
                    )}
                  >
                    <Film className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Scene Agent
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          <Separator orientation="vertical" className="hidden md:block h-6 mx-1 sm:mx-2" />

          {/* Mode Toggle */}
          <ModeToggle />

          <Separator orientation="vertical" className="h-6 mx-1 sm:mx-2" />

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
          <div className="w-48 sm:w-64 md:w-80 relative">
            {/* Scene name (tiny) */}
            <div className="absolute -top-4 left-0 right-0 text-center pointer-events-none">
              <span className="text-[10px] leading-none text-white/60 truncate block">
                {scene.name}
              </span>
            </div>
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

          {/* Settings - Desktop only */}
          <div className="hidden md:block">
            <SettingsMenu
              onInfoClick={() => setIsInfoOpen(true)}
              loopEnabled={loopEnabled}
              onLoopToggle={handleToggleLoop}
              isRecording={sceneRecording.isRecording}
              recordingDuration={sceneRecording.duration}
              onRecordToggle={handleRecordToggle}
              recordDisabled={!scene.audioUrl || scene.song?.status === "generating"}
              onTranscribe={scene.song?._id ? handleTranscribe : undefined}
              transcriptionStatus={
                transcription?.status === "processing"
                  ? "processing"
                  : transcription
                    ? "complete"
                    : "idle"
              }
            />
          </div>

          {/* User Menu - Tablet+ */}
          <div className="hidden sm:block">
            <UserMenu />
          </div>

          <Separator orientation="vertical" className="hidden md:block h-6 mx-1 sm:mx-2" />

          {/* Collapse Button - Desktop only */}
          <div className="hidden md:block">
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
