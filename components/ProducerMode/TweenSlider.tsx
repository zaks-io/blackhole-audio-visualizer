"use client";

import { useState, useEffect, useCallback } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TweenSliderTrack } from "./TweenSliderTrack";
import { EasingPicker } from "./EasingPicker";
import { DurationPicker } from "./DurationPicker";
import { useProducerTween } from "./useProducerTween";
import type { ParameterConfig } from "./types";

interface TweenSliderProps {
  config: ParameterConfig;
}

export function TweenSlider({ config }: TweenSliderProps) {
  const {
    currentValue,
    targetValue: storeTargetValue,
    duration,
    ease,
    isTweening,
    progress,
    setDuration,
    setEase,
    startTween,
    killTween,
  } = useProducerTween(config);

  // Local state for dragging - avoids Zustand updates on every drag event
  const [localTarget, setLocalTarget] = useState(storeTargetValue);

  // Sync local state when store changes (e.g., after tween completes)
  useEffect(() => {
    setLocalTarget(storeTargetValue);
  }, [storeTargetValue]);

  // Handle commit - kill any running tween and start new one
  const handleCommit = useCallback(
    (value: number) => {
      killTween();
      startTween(value);
    },
    [killTween, startTween]
  );

  const formatValue = config.formatValue || ((v: number) => v.toFixed(config.step < 1 ? 1 : 0));
  const hasChange = Math.abs(localTarget - currentValue) > config.step;

  return (
    <div className="space-y-2">
      {/* Header with label and values */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{config.label}</span>
        <div className="flex items-center gap-1.5 text-xs font-mono">
          {isTweening ? (
            <span className="text-primary">{formatValue(currentValue)}</span>
          ) : (
            <>
              <span className="text-muted-foreground/80">{formatValue(currentValue)}</span>
              {hasChange && (
                <>
                  <span className="text-muted-foreground/40">→</span>
                  <span className="text-primary">{formatValue(localTarget)}</span>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Slider track */}
      <TweenSliderTrack
        min={config.min}
        max={config.max}
        step={config.step}
        currentValue={currentValue}
        targetValue={localTarget}
        progress={progress}
        isTweening={isTweening}
        onTargetChange={setLocalTarget}
        onCommit={handleCommit}
      />

      {/* Controls row */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center justify-end gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <EasingPicker value={ease} onChange={setEase} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Easing
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DurationPicker value={duration} onChange={setDuration} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Duration ({duration}s)
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
