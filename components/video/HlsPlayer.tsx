"use client";

import { useRef, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { useVideoPlayer } from "./useVideoPlayer";
import { VideoControls } from "./VideoControls";
import { CenterControls } from "./CenterControls";
import { GestureFeedback } from "./GestureFeedback";
import { useTouchGestures } from "@/hooks/useTouchGestures";

interface HlsPlayerProps {
  src: string;
  autoPlay?: boolean;
  className?: string;
  poster?: string;
}

export function HlsPlayer({ src, autoPlay = false, className, poster }: HlsPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gestureZoneRef = useRef<HTMLDivElement>(null);
  const [volumeBeforeGesture, setVolumeBeforeGesture] = useState<number | null>(null);

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
    togglePlay,
    seek,
    skipForward,
    skipBack,
    setVolume,
    setQualityLevel,
    toggleFullscreen,
    toggleControlVisibility,
  } = useVideoPlayer({ src, autoPlay, containerRef });

  // Handle vertical swipe for volume
  const handleVerticalSwipe = useCallback(
    (delta: number, side: "left" | "right") => {
      // Only handle right side for volume (left side could be brightness, but we skip it)
      if (side === "right") {
        // Store initial volume on first swipe
        if (volumeBeforeGesture === null) {
          setVolumeBeforeGesture(volume);
        }
        const baseVolume = volumeBeforeGesture ?? volume;
        const newVolume = Math.max(0, Math.min(1, baseVolume + delta));
        setVolume(newVolume);
      }
    },
    [volume, volumeBeforeGesture, setVolume]
  );

  const handleSwipeEnd = useCallback(() => {
    setVolumeBeforeGesture(null);
  }, []);

  // Touch gesture handling - attached to gesture zone, not container
  const gestureState = useTouchGestures({
    containerRef: gestureZoneRef,
    onTap: toggleControlVisibility,
    onDoubleTapLeft: skipBack,
    onDoubleTapRight: skipForward,
    onVerticalSwipe: handleVerticalSwipe,
    onSwipeEnd: handleSwipeEnd,
  });

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative bg-black overflow-hidden select-none",
        isFullscreen && "fixed inset-0 z-50",
        // Hide cursor when controls are hidden and playing
        !showControls && isPlaying && "cursor-none",
        className
      )}
      tabIndex={0}
    >
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain pointer-events-none"
        playsInline
        poster={poster}
      />

      {/* Gesture zone - captures touch gestures */}
      <div ref={gestureZoneRef} className="absolute inset-0" />

      {/* Gesture feedback overlays */}
      <GestureFeedback
        gestureType={gestureState.gestureType}
        gestureValue={gestureState.gestureType === "volume" ? volume : gestureState.gestureValue}
        isGesturing={gestureState.isGesturing}
      />

      {/* Center controls - YouTube style */}
      <CenterControls
        isPlaying={isPlaying}
        visible={showControls && !gestureState.isGesturing}
        onPlayPause={togglePlay}
        onSkipBack={skipBack}
        onSkipForward={skipForward}
      />

      {/* Bottom controls - minimal bar */}
      <VideoControls
        currentTime={currentTime}
        duration={duration}
        buffered={buffered}
        isFullscreen={isFullscreen}
        showControls={showControls}
        levels={levels}
        currentLevel={currentLevel}
        autoLevelEnabled={autoLevelEnabled}
        onSeek={seek}
        onQualityChange={setQualityLevel}
        onFullscreenToggle={toggleFullscreen}
      />
    </div>
  );
}
