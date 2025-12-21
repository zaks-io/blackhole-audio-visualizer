"use client";

import { useRef, useCallback, useState } from "react";
import type { SectionTiming } from "@/hooks/useUnifiedPlayer";
import { cn } from "@/lib/utils";

interface SceneTimelineProps {
  currentTime: number;
  duration: number;
  sectionTimings: SectionTiming[];
  currentSectionIndex: number;
  onSeek: (time: number) => void;
  disabled?: boolean;
}

export function SceneTimeline({
  currentTime,
  duration,
  sectionTimings,
  currentSectionIndex,
  onSeek,
  disabled = false,
}: SceneTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const totalDurationMs = duration * 1000;

  const handleSeek = useCallback(
    (clientX: number) => {
      if (!trackRef.current || disabled) return;

      const rect = trackRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const seekTime = percentage * duration;
      onSeek(seekTime);
    },
    [duration, onSeek, disabled]
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setIsDragging(true);
      handleSeek(e.clientX);
    },
    [handleSeek, disabled]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      handleSeek(e.clientX);
    },
    [isDragging, handleSeek]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    setIsDragging(false);
  }, []);

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative h-3 flex-1 rounded-full overflow-hidden",
        "bg-white/10 backdrop-blur-sm",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : isDragging
            ? "cursor-grabbing"
            : "cursor-pointer"
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Section markers */}
      {sectionTimings.map((section, index) => {
        const left = totalDurationMs > 0 ? (section.startTimeMs / totalDurationMs) * 100 : 0;
        const width =
          totalDurationMs > 0
            ? ((section.endTimeMs - section.startTimeMs) / totalDurationMs) * 100
            : 0;
        const isActive = index === currentSectionIndex;

        return (
          <div
            key={section.index}
            className={cn(
              "absolute top-0 bottom-0 transition-colors duration-200",
              isActive ? "bg-white/20" : "bg-white/5",
              index > 0 && "border-l border-white/20"
            )}
            style={{
              left: `${left}%`,
              width: `${width}%`,
            }}
          />
        );
      })}

      {/* Progress bar */}
      <div
        className="absolute top-0 bottom-0 left-0 bg-white/60 transition-[width] duration-75"
        style={{ width: `${progress}%` }}
      />

      {/* Playhead */}
      <div
        className={cn(
          "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg",
          "transition-[left] duration-75",
          isDragging && "scale-125"
        )}
        style={{ left: `calc(${progress}% - 6px)` }}
      />
    </div>
  );
}
