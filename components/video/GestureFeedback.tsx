"use client";

import { RotateCcw, RotateCw, Volume2, VolumeX, Volume1 } from "lucide-react";
import { cn } from "@/lib/utils";

interface GestureFeedbackProps {
  gestureType: "volume" | "seek-left" | "seek-right" | null;
  gestureValue: number;
  isGesturing: boolean;
}

function SeekIndicator({ direction, visible }: { direction: "left" | "right"; visible: boolean }) {
  const Icon = direction === "left" ? RotateCcw : RotateCw;
  const text = direction === "left" ? "-10s" : "+10s";

  return (
    <div
      className={cn(
        "absolute top-1/2 -translate-y-1/2 flex flex-col items-center gap-1",
        "pointer-events-none transition-all duration-200",
        direction === "left" ? "left-[15%]" : "right-[15%]",
        visible ? "opacity-100 scale-100" : "opacity-0 scale-90"
      )}
    >
      {/* Ripple background */}
      <div
        className={cn(
          "absolute inset-0 -m-8 rounded-full bg-white/10",
          "transition-transform duration-500",
          visible ? "scale-150 opacity-0" : "scale-100 opacity-100"
        )}
      />

      {/* Icon container */}
      <div
        className={cn(
          "relative w-14 h-14 rounded-full bg-black/60 backdrop-blur-sm",
          "flex items-center justify-center",
          "border border-white/20",
          "shadow-[0_0_30px_rgba(255,255,255,0.15)]"
        )}
      >
        <Icon className="w-7 h-7 text-white" strokeWidth={1.5} />
      </div>

      {/* Time label */}
      <span
        className={cn(
          "text-sm font-medium text-white/90 tabular-nums",
          "bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm"
        )}
      >
        {text}
      </span>
    </div>
  );
}

function VolumeIndicator({ value, visible }: { value: number; visible: boolean }) {
  const percentage = Math.round(value * 100);
  const VolumeIcon = value === 0 ? VolumeX : value < 0.5 ? Volume1 : Volume2;

  return (
    <div
      className={cn(
        "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
        "flex flex-col items-center gap-3",
        "pointer-events-none transition-all duration-150",
        visible ? "opacity-100 scale-100" : "opacity-0 scale-95"
      )}
    >
      {/* Volume card */}
      <div
        className={cn(
          "relative flex flex-col items-center gap-2 px-5 py-4",
          "bg-black/70 backdrop-blur-md rounded-2xl",
          "border border-white/10",
          "shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        )}
      >
        {/* Icon */}
        <VolumeIcon className="w-8 h-8 text-white" strokeWidth={1.5} />

        {/* Percentage */}
        <span className="text-2xl font-semibold text-white tabular-nums tracking-tight">
          {percentage}%
        </span>

        {/* Progress bar */}
        <div className="w-24 h-1.5 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-100"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function GestureFeedback({ gestureType, gestureValue, isGesturing }: GestureFeedbackProps) {
  return (
    <>
      {/* Seek indicators */}
      <SeekIndicator direction="left" visible={gestureType === "seek-left" && isGesturing} />
      <SeekIndicator direction="right" visible={gestureType === "seek-right" && isGesturing} />

      {/* Volume indicator */}
      <VolumeIndicator value={gestureValue} visible={gestureType === "volume" && isGesturing} />
    </>
  );
}
