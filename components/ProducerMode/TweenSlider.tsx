"use client";

import { useState, useEffect, useCallback } from "react";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TweenSliderTrack } from "./TweenSliderTrack";
import { useProducerTween } from "./useProducerTween";
import type { ParameterConfig } from "./types";

interface TweenSliderProps {
  config: ParameterConfig;
}

export function TweenSlider({ config }: TweenSliderProps) {
  const {
    currentValue,
    targetValue: storeTargetValue,
    isTweening,
    progress,
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
    <TooltipProvider delayDuration={300}>
      <div className="space-y-1">
        {/* Header with label and values */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{config.label}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-48">
                {config.description}
              </TooltipContent>
            </Tooltip>
          </div>
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
      </div>
    </TooltipProvider>
  );
}
