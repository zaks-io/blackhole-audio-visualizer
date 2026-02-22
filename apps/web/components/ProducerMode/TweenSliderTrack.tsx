"use client";

import { useMemo, useRef, useEffect } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface TweenSliderTrackProps {
  min: number;
  max: number;
  step: number;
  currentValue: number;
  targetValue: number;
  progress: number;
  isTweening: boolean;
  onTargetChange: (value: number) => void;
  onCommit?: (value: number) => void;
  disabled?: boolean;
}

export function TweenSliderTrack({
  min,
  max,
  step,
  currentValue,
  targetValue,
  progress,
  isTweening,
  onTargetChange,
  onCommit,
  disabled,
}: TweenSliderTrackProps) {
  const isDragging = useRef(false);
  const latestValue = useRef(targetValue);

  // Keep latest value in sync for the global listener
  useEffect(() => {
    latestValue.current = targetValue;
  }, [targetValue]);

  // Global pointer up listener to catch releases outside the component
  useEffect(() => {
    const handlePointerUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        onCommit?.(latestValue.current);
      }
    };

    window.addEventListener("pointerup", handlePointerUp);
    return () => window.removeEventListener("pointerup", handlePointerUp);
  }, [onCommit]);

  const currentPercent = useMemo(
    () => ((currentValue - min) / (max - min)) * 100,
    [currentValue, min, max]
  );

  const animatedPercent = useMemo(() => {
    if (!isTweening) return currentPercent;
    const targetPercent = ((targetValue - min) / (max - min)) * 100;
    return currentPercent + (targetPercent - currentPercent) * progress;
  }, [isTweening, currentPercent, targetValue, min, max, progress]);

  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex w-full touch-none items-center select-none h-6",
        disabled && "opacity-50 pointer-events-none"
      )}
      min={min}
      max={max}
      step={step}
      value={[targetValue]}
      onPointerDown={() => {
        isDragging.current = true;
      }}
      onValueChange={([value]) => onTargetChange(value)}
      onValueCommit={([value]) => {
        // Commit reliably for mouse/touch + keyboard interactions.
        // Also prevents the global pointerup fallback from double-firing.
        isDragging.current = false;
        onCommit?.(value);
      }}
      disabled={disabled}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-white/10">
        {/* Current value fill (animated during tween) */}
        <div
          className={cn(
            "absolute h-full rounded-full transition-all",
            isTweening ? "bg-primary/80" : "bg-primary/60"
          )}
          style={{
            width: `${animatedPercent}%`,
            transition: isTweening ? "none" : "width 100ms ease-out",
          }}
        />
        {/* Target indicator line (only shown when different from current and not tweening) */}
        {!isTweening && Math.abs(targetValue - currentValue) > step && (
          <div
            className="absolute h-full w-0.5 bg-primary"
            style={{
              left: `${((targetValue - min) / (max - min)) * 100}%`,
              transform: "translateX(-50%)",
            }}
          />
        )}
      </SliderPrimitive.Track>

      {/* Ghost thumb for target */}
      <SliderPrimitive.Thumb
        className={cn(
          "block size-4 rounded-full transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-grab active:cursor-grabbing",
          isTweening
            ? "bg-primary/40 border-2 border-primary/60"
            : "bg-transparent border-2 border-primary hover:bg-primary/20"
        )}
      />
    </SliderPrimitive.Root>
  );
}
