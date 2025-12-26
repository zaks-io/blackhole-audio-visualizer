"use client";

import { Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoProgressBar } from "./VideoProgressBar";
import { VideoQualitySelector } from "./VideoQualitySelector";
import { cn } from "@/lib/utils";
import type { HlsLevel } from "./useVideoPlayer";

interface VideoControlsProps {
  currentTime: number;
  duration: number;
  buffered: number;
  isFullscreen: boolean;
  showControls: boolean;
  levels: HlsLevel[];
  currentLevel: number;
  autoLevelEnabled: boolean;
  onSeek: (time: number) => void;
  onQualityChange: (level: number) => void;
  onFullscreenToggle: () => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VideoControls({
  currentTime,
  duration,
  buffered,
  isFullscreen,
  showControls,
  levels,
  currentLevel,
  autoLevelEnabled,
  onSeek,
  onQualityChange,
  onFullscreenToggle,
}: VideoControlsProps) {
  return (
    <div
      className={cn(
        "absolute bottom-0 inset-x-0 transition-opacity duration-200",
        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Gradient backdrop - thinner for minimal design */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />

      {/* Controls content */}
      <div className="relative px-3">
        {/* Info bar - time and buttons */}
        <div className="flex items-center gap-1">
          {/* Time display */}
          <div className="flex items-center gap-1 text-white/90 text-xs md:text-sm font-medium tabular-nums">
            <span>{formatTime(currentTime)}</span>
            <span className="text-white/40">/</span>
            <span className="text-white/60">{formatTime(duration)}</span>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Quality selector */}
          <VideoQualitySelector
            levels={levels}
            currentLevel={currentLevel}
            autoLevelEnabled={autoLevelEnabled}
            onSelect={onQualityChange}
          />

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onFullscreenToggle}
            className={cn(
              "w-8 h-8 md:w-9 md:h-9 text-white/90 hover:text-white",
              "hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
            )}
          >
            {isFullscreen ? (
              <Minimize className="w-4 h-4 md:w-5 md:h-5" />
            ) : (
              <Maximize className="w-4 h-4 md:w-5 md:h-5" />
            )}
          </Button>
        </div>

        {/* Progress bar */}
        <VideoProgressBar
          currentTime={currentTime}
          duration={duration}
          buffered={buffered}
          onSeek={onSeek}
        />
      </div>
    </div>
  );
}
