"use client";

import { Play, Pause, RotateCcw, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface CenterControlsProps {
  isPlaying: boolean;
  visible: boolean;
  onPlayPause: () => void;
  onSkipBack: () => void;
  onSkipForward: () => void;
}

export function CenterControls({
  isPlaying,
  visible,
  onPlayPause,
  onSkipBack,
  onSkipForward,
}: CenterControlsProps) {
  return (
    <div
      className={cn(
        "absolute inset-0 flex items-center justify-center",
        "pointer-events-none transition-opacity duration-200",
        visible ? "opacity-100" : "opacity-0"
      )}
    >
      {/* Control buttons container */}
      <div className="flex items-center gap-6 md:gap-10 pointer-events-auto">
        {/* Skip back button */}
        <button
          onClick={onSkipBack}
          className={cn(
            "flex items-center justify-center",
            "w-11 h-11 md:w-12 md:h-12",
            "rounded-full bg-black/40 backdrop-blur-sm",
            "border border-white/10",
            "text-white/90 hover:text-white",
            "transition-all duration-150",
            "hover:bg-black/50 hover:scale-105 active:scale-95",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          )}
          aria-label="Skip back 10 seconds"
        >
          <RotateCcw className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
        </button>

        {/* Play/Pause button */}
        <button
          onClick={onPlayPause}
          className={cn(
            "relative flex items-center justify-center",
            "w-14 h-14 md:w-[72px] md:h-[72px]",
            "rounded-full bg-white/10 backdrop-blur-md",
            "border border-white/20",
            "text-white",
            "transition-all duration-150",
            "hover:bg-white/15 hover:scale-105 active:scale-95",
            "shadow-[0_0_40px_rgba(255,255,255,0.1)]",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          )}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 md:w-9 md:h-9 fill-current" strokeWidth={1} />
          ) : (
            <Play className="w-7 h-7 md:w-9 md:h-9 fill-current ml-1" strokeWidth={1} />
          )}
        </button>

        {/* Skip forward button */}
        <button
          onClick={onSkipForward}
          className={cn(
            "flex items-center justify-center",
            "w-11 h-11 md:w-12 md:h-12",
            "rounded-full bg-black/40 backdrop-blur-sm",
            "border border-white/10",
            "text-white/90 hover:text-white",
            "transition-all duration-150",
            "hover:bg-black/50 hover:scale-105 active:scale-95",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          )}
          aria-label="Skip forward 10 seconds"
        >
          <RotateCw className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
