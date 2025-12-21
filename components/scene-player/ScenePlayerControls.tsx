"use client";

import { useState, useCallback } from "react";
import { Play, Pause, Repeat, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SceneTimeline } from "./SceneTimeline";
import { SceneInfoPanel } from "./SceneInfoPanel";
import type { SceneWithDetails } from "@/hooks/useConvexScenes";
import type { useUnifiedPlayer } from "@/hooks/useUnifiedPlayer";
import { cn } from "@/lib/utils";

interface ScenePlayerControlsProps {
  scene: SceneWithDetails;
  player: ReturnType<typeof useUnifiedPlayer>;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ScenePlayerControls({ scene, player }: ScenePlayerControlsProps) {
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  const { state, play, pause, resume, seek, setLoop, loopEnabled, sectionTimings } = player;
  const { isPlaying, isPaused, currentTime, duration, currentSectionIndex } = state;

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
    <>
      <div className="flex-shrink-0 px-4 py-3 bg-black/80 backdrop-blur-md border-t border-white/10">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          {/* Play/Pause button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePlayPause}
            disabled={!canPlay}
            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            {showPlayButton ? <Play className="w-5 h-5 ml-0.5" /> : <Pause className="w-5 h-5" />}
          </Button>

          {/* Timeline */}
          <SceneTimeline
            currentTime={currentTime}
            duration={duration}
            sectionTimings={sectionTimings}
            currentSectionIndex={currentSectionIndex}
            onSeek={handleSeek}
            disabled={duration === 0}
          />

          {/* Time display */}
          <div className="text-sm text-white/70 tabular-nums min-w-[80px] text-center">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>

          {/* Loop toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleLoop}
            className={cn(
              "w-8 h-8 rounded-full",
              loopEnabled ? "bg-white/20 text-white" : "text-white/50 hover:text-white"
            )}
          >
            <Repeat className="w-4 h-4" />
          </Button>

          {/* Info button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsInfoOpen(true)}
            className="w-8 h-8 rounded-full text-white/50 hover:text-white"
          >
            <Info className="w-4 h-4" />
          </Button>
        </div>

        {/* Current section name */}
        {currentSectionIndex >= 0 && scene.compositionPlan && (
          <div className="max-w-4xl mx-auto mt-2 text-center">
            <span className="text-xs text-white/50">
              {scene.compositionPlan.sections[currentSectionIndex]?.section_name}
            </span>
          </div>
        )}
      </div>

      {/* Info panel */}
      <SceneInfoPanel
        scene={scene}
        sectionTimings={sectionTimings}
        currentSectionIndex={currentSectionIndex}
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />
    </>
  );
}
