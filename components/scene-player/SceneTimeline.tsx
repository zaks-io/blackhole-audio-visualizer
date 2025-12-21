"use client";

import { useRef, useCallback, useState, useEffect, memo } from "react";
import type { SectionTiming, TimeSubscriber } from "@/hooks/useUnifiedPlayer";
import { cn } from "@/lib/utils";

interface SceneTimelineProps {
  subscribeToTime: (callback: TimeSubscriber) => () => void;
  getCurrentTime: () => number;
  duration: number;
  sectionTimings: SectionTiming[];
  currentSectionIndex: number;
  onSeek: (time: number) => void;
  disabled?: boolean;
}

function SceneTimelineComponent({
  subscribeToTime,
  getCurrentTime,
  duration,
  sectionTimings,
  currentSectionIndex,
  onSeek,
  disabled = false,
}: SceneTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const playheadRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const durationRef = useRef(duration);

  // Update duration ref when duration changes (outside render)
  useEffect(() => {
    durationRef.current = duration;
  }, [duration]);

  const totalDurationMs = duration * 1000;

  // Subscribe to time updates for progress bar and playhead
  useEffect(() => {
    const updateProgress = (currentTime: number, dur: number) => {
      const progress = dur > 0 ? (currentTime / dur) * 100 : 0;
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${progress}%`;
      }
      if (playheadRef.current) {
        playheadRef.current.style.left = `calc(${progress}% - 6px)`;
      }
    };

    // Set initial progress
    updateProgress(getCurrentTime(), duration);

    const unsubscribe = subscribeToTime(updateProgress);
    return unsubscribe;
  }, [subscribeToTime, getCurrentTime, duration]);

  const handleSeek = useCallback(
    (clientX: number) => {
      if (!trackRef.current || disabled) return;

      const rect = trackRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      const seekTime = percentage * durationRef.current;
      onSeek(seekTime);
    },
    [onSeek, disabled]
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

      {/* Progress bar - updated via ref */}
      <div
        ref={progressBarRef}
        className="absolute top-0 bottom-0 left-0 bg-white/60"
        style={{ width: "0%" }}
      />

      {/* Playhead - updated via ref */}
      <div
        ref={playheadRef}
        className={cn(
          "absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg",
          isDragging && "scale-125"
        )}
        style={{ left: "calc(0% - 6px)" }}
      />
    </div>
  );
}

export const SceneTimeline = memo(SceneTimelineComponent);
