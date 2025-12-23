"use client";

import { memo, useCallback } from "react";
import { Play, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SceneTimeline } from "./SceneTimeline";
import { TimeDisplay } from "./TimeDisplay";
import { SubtitleDisplay } from "./SubtitleDisplay";
import { useUIState } from "@/hooks/useUIState";
import { useAudioPlayerStore } from "@/hooks/useAudioPlayerStore";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { SceneWithDetails } from "@/hooks/useConvexScenes";
import type { useUnifiedPlayer } from "@/hooks/useUnifiedPlayer";
import { cn } from "@/lib/utils";

interface ScenePlayerControlsProps {
  scene: SceneWithDetails;
  player: ReturnType<typeof useUnifiedPlayer>;
}

function ScenePlayerControlsComponent({ scene, player }: ScenePlayerControlsProps) {
  const controlBarCollapsed = useUIState((s) => s.controlBarCollapsed);
  const globalAudioPause = useAudioPlayerStore((s) => s.pause);
  const transcription = useQuery(
    api.model.transcriptions.public.getBySong,
    scene.song?._id ? { songId: scene.song._id } : "skip"
  );

  const { state, play, pause, resume, seek, sectionTimings, subscribeToTime, getCurrentTime } =
    player;
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
          controlBarCollapsed && "opacity-0 translate-y-full"
        )}
      >
        <div
          className={cn(
            "glass-panel rounded-full px-2 sm:px-4 py-2 flex items-center gap-1 sm:gap-2",
            !controlBarCollapsed && "pointer-events-auto"
          )}
        >
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
    </TooltipProvider>
  );
}

export const ScenePlayerControls = memo(ScenePlayerControlsComponent);
