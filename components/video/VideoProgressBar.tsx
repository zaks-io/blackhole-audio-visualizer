"use client";

import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface VideoProgressBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  onSeek: (time: number) => void;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function VideoProgressBar({
  currentTime,
  duration,
  buffered,
  onSeek,
}: VideoProgressBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (buffered / duration) * 100 : 0;

  const calculateTime = useCallback(
    (clientX: number): number => {
      if (!barRef.current || duration === 0) return 0;
      const rect = barRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return percent * duration;
    },
    [duration]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      const percent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      setHoverPosition(percent * 100);
      setHoverTime(percent * duration);

      if (isDragging) {
        onSeek(calculateTime(e.clientX));
      }
    },
    [duration, isDragging, calculateTime, onSeek]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      onSeek(calculateTime(e.clientX));

      const handleMouseMove = (e: MouseEvent) => {
        onSeek(calculateTime(e.clientX));
      };

      const handleMouseUp = () => {
        setIsDragging(false);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [calculateTime, onSeek]
  );

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      setHoverPosition(null);
      setHoverTime(null);
    }
  }, [isDragging]);

  return (
    <div className="relative w-full group/progress">
      {/* Time tooltip on hover */}
      {hoverTime !== null && hoverPosition !== null && (
        <div
          className="absolute -top-8 px-2 py-1 bg-black/90 backdrop-blur-sm rounded text-xs font-medium text-white/90 transform -translate-x-1/2 pointer-events-none z-10 border border-white/10"
          style={{ left: `${hoverPosition}%` }}
        >
          {formatTime(hoverTime)}
        </div>
      )}

      {/* Clickable track area */}
      <div
        ref={barRef}
        className="relative h-5 flex items-center cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
      >
        {/* Track background */}
        <div className="absolute inset-x-0 h-1 bg-white/20 rounded-full overflow-hidden transition-all duration-150 group-hover/progress:h-1.5">
          {/* Buffered indicator */}
          <div
            className="absolute h-full bg-white/30 rounded-full"
            style={{ width: `${bufferedPercent}%` }}
          />

          {/* Progress fill with glow */}
          <div
            className={cn(
              "absolute h-full bg-white rounded-full transition-shadow duration-300",
              isDragging && "shadow-[0_0_12px_rgba(255,255,255,0.5)]"
            )}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Hover preview line */}
        {hoverPosition !== null && (
          <div
            className="absolute h-1 group-hover/progress:h-1.5 bg-white/40 rounded-full pointer-events-none transition-all duration-150"
            style={{ width: `${hoverPosition}%` }}
          />
        )}

        {/* Scrubber handle */}
        <div
          className={cn(
            "absolute w-3.5 h-3.5 bg-white rounded-full transform -translate-x-1/2 transition-all duration-150",
            "shadow-[0_0_8px_rgba(255,255,255,0.4)]",
            "opacity-0 group-hover/progress:opacity-100 scale-75 group-hover/progress:scale-100",
            isDragging && "opacity-100 scale-110 shadow-[0_0_16px_rgba(255,255,255,0.6)]"
          )}
          style={{ left: `${progress}%` }}
        />
      </div>
    </div>
  );
}
