"use client";

import { useRef } from "react";
import { Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVideoPlayer } from "./useVideoPlayer";
import { VideoControls } from "./VideoControls";

interface HlsPlayerProps {
  src: string;
  autoPlay?: boolean;
  className?: string;
  poster?: string;
}

export function HlsPlayer({ src, autoPlay = false, className, poster }: HlsPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    videoRef,
    isPlaying,
    currentTime,
    duration,
    buffered,
    levels,
    currentLevel,
    autoLevelEnabled,
    isFullscreen,
    showControls,
    volume,
    isMuted,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    setQualityLevel,
    toggleFullscreen,
  } = useVideoPlayer({ src, autoPlay, containerRef });

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-black overflow-hidden group select-none",
        isFullscreen && "fixed inset-0 z-50",
        className
      )}
      tabIndex={0}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        poster={poster}
        onClick={togglePlay}
      />

      {/* Center play button overlay (when paused and controls visible) */}
      {!isPlaying && showControls && (
        <button
          onClick={togglePlay}
          className={cn(
            "absolute inset-0 flex items-center justify-center",
            "bg-black/20 transition-all duration-300",
            "hover:bg-black/30"
          )}
        >
          <div
            className={cn(
              "w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm",
              "flex items-center justify-center",
              "border border-white/20",
              "transition-all duration-300 hover:scale-110 hover:bg-white/20",
              "shadow-[0_0_40px_rgba(255,255,255,0.15)]"
            )}
          >
            <Play className="w-10 h-10 text-white fill-current ml-1" />
          </div>
        </button>
      )}

      {/* Custom controls */}
      <VideoControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        buffered={buffered}
        volume={volume}
        isMuted={isMuted}
        isFullscreen={isFullscreen}
        showControls={showControls}
        levels={levels}
        currentLevel={currentLevel}
        autoLevelEnabled={autoLevelEnabled}
        onPlayPause={togglePlay}
        onSeek={seek}
        onVolumeChange={setVolume}
        onMuteToggle={toggleMute}
        onQualityChange={setQualityLevel}
        onFullscreenToggle={toggleFullscreen}
      />
    </div>
  );
}
