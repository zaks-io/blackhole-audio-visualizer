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

  // Touch event handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.stopPropagation();
      const touch = e.touches[0];
      setIsDragging(true);
      onSeek(calculateTime(touch.clientX));
    },
    [calculateTime, onSeek]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging) return;
      e.stopPropagation();
      const touch = e.touches[0];
      onSeek(calculateTime(touch.clientX));
    },
    [isDragging, calculateTime, onSeek]
  );

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  return (
    <div className="relative w-full group/progress touch-none">
      {/* Time tooltip on hover - hidden on touch devices */}
      {hoverTime !== null && hoverPosition !== null && (
        <div
          className={cn(
            "absolute -top-8 px-2 py-1 bg-black/90 backdrop-blur-sm rounded text-xs font-medium text-white/90",
            "transform -translate-x-1/2 pointer-events-none z-10 border border-white/10",
            "hidden [@media(hover:hover)]:block"
          )}
          style={{ left: `${hoverPosition}%` }}
        >
          {formatTime(hoverTime)}
        </div>
      )}

      {/* Clickable/touchable track area - 44px touch target */}
      <div
        ref={barRef}
        className="relative h-11 flex items-center cursor-pointer"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Track background */}
        <div
          className={cn(
            "absolute inset-x-0 h-1 bg-white/20 rounded-full overflow-hidden transition-all duration-150",
            "[@media(hover:hover)]:group-hover/progress:h-1.5",
            isDragging && "h-1.5"
          )}
        >
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

        {/* Hover preview line - desktop only */}
        {hoverPosition !== null && (
          <div
            className={cn(
              "absolute h-1 bg-white/40 rounded-full pointer-events-none transition-all duration-150",
              "hidden [@media(hover:hover)]:block [@media(hover:hover)]:group-hover/progress:h-1.5"
            )}
            style={{ width: `${hoverPosition}%` }}
          />
        )}

        {/* Scrubber handle - always visible on touch, hover-reveal on desktop */}
        <div
          className={cn(
            "absolute bg-white rounded-full transform -translate-x-1/2 transition-all duration-150",
            "shadow-[0_0_8px_rgba(255,255,255,0.4)]",
            // Mobile: 16px, always visible
            "w-4 h-4",
            // Desktop: 14px, hover-reveal
            "md:w-3.5 md:h-3.5",
            "[@media(hover:hover)]:opacity-0 [@media(hover:hover)]:scale-75",
            "[@media(hover:hover)]:group-hover/progress:opacity-100 [@media(hover:hover)]:group-hover/progress:scale-100",
            isDragging && "opacity-100 scale-110 shadow-[0_0_16px_rgba(255,255,255,0.6)]"
          )}
          style={{ left: `${progress}%` }}
        />
      </div>
    </div>
  );
}
