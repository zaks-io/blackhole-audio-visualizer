"use client";

import { Play, Pause, Volume2, VolumeX, Volume1, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { VideoProgressBar } from "./VideoProgressBar";
import { VideoQualitySelector } from "./VideoQualitySelector";
import { cn } from "@/lib/utils";
import type { HlsLevel } from "./useVideoPlayer";
import { useState } from "react";

interface VideoControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  showControls: boolean;
  levels: HlsLevel[];
  currentLevel: number;
  autoLevelEnabled: boolean;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
  onQualityChange: (level: number) => void;
  onFullscreenToggle: () => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function VolumeIcon({ volume, isMuted }: { volume: number; isMuted: boolean }) {
  if (isMuted || volume === 0) return <VolumeX className="w-5 h-5" />;
  if (volume < 0.5) return <Volume1 className="w-5 h-5" />;
  return <Volume2 className="w-5 h-5" />;
}

export function VideoControls({
  isPlaying,
  currentTime,
  duration,
  buffered,
  volume,
  isMuted,
  isFullscreen,
  showControls,
  levels,
  currentLevel,
  autoLevelEnabled,
  onPlayPause,
  onSeek,
  onVolumeChange,
  onMuteToggle,
  onQualityChange,
  onFullscreenToggle,
}: VideoControlsProps) {
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  return (
    <div
      className={cn(
        "absolute bottom-0 inset-x-0 transition-opacity duration-300",
        showControls ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      {/* Gradient backdrop */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none" />

      {/* Controls content */}
      <div className="relative px-4 pb-4 pt-16">
        {/* Progress bar */}
        <div className="mb-3">
          <VideoProgressBar
            currentTime={currentTime}
            duration={duration}
            buffered={buffered}
            onSeek={onSeek}
          />
        </div>

        {/* Control bar */}
        <div className="flex items-center gap-1">
          {/* Play/Pause */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onPlayPause}
            className="w-10 h-10 text-white hover:bg-white/10 transition-all hover:scale-105"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </Button>

          {/* Volume control */}
          <div
            className="relative flex items-center"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={onMuteToggle}
              className="w-10 h-10 text-white hover:bg-white/10 transition-all"
            >
              <VolumeIcon volume={volume} isMuted={isMuted} />
            </Button>

            {/* Volume slider - appears on hover */}
            <div
              className={cn(
                "overflow-hidden transition-all duration-200 ease-out",
                showVolumeSlider ? "w-20 opacity-100 ml-1" : "w-0 opacity-0 ml-0"
              )}
            >
              <Slider
                value={[isMuted ? 0 : volume * 100]}
                onValueChange={(v) => onVolumeChange(v[0] / 100)}
                max={100}
                step={1}
                className="w-20 [&_[data-slot=slider-track]]:h-1 [&_[data-slot=slider-track]]:bg-white/20 [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-thumb]]:w-3 [&_[data-slot=slider-thumb]]:h-3 [&_[data-slot=slider-thumb]]:border-0 [&_[data-slot=slider-thumb]]:shadow-[0_0_6px_rgba(255,255,255,0.4)]"
              />
            </div>
          </div>

          {/* Time display */}
          <div className="flex items-center gap-1 text-white/80 text-sm font-medium tabular-nums ml-2">
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
            className="w-10 h-10 text-white hover:bg-white/10 transition-all hover:scale-105"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
