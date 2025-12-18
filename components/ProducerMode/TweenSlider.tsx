"use client";

import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
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
    targetValue,
    duration,
    ease,
    isTweening,
    progress,
    setTargetValue,
    setDuration,
    setEase,
    startTween,
    cancelTween,
  } = useProducerTween(config);

  const formatValue = config.formatValue || ((v: number) => v.toFixed(config.step < 1 ? 1 : 0));
  const hasChange = Math.abs(targetValue - currentValue) > config.step;

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
                  <span className="text-primary">{formatValue(targetValue)}</span>
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
        targetValue={targetValue}
        progress={progress}
        isTweening={isTweening}
        onTargetChange={setTargetValue}
      />

      {/* Controls row */}
      <TooltipProvider delayDuration={300}>
        <div className="flex items-center justify-end gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <EasingPicker value={ease} onChange={setEase} disabled={isTweening} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Easing
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DurationPicker value={duration} onChange={setDuration} disabled={isTweening} />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Duration ({duration}s)
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={isTweening ? cancelTween : startTween}
                disabled={!hasChange && !isTweening}
                className={cn(
                  "h-7 w-7 rounded-md relative",
                  isTweening
                    ? "bg-primary/20 hover:bg-primary/30"
                    : hasChange
                      ? "hover:bg-primary/20"
                      : "opacity-40"
                )}
              >
                {isTweening ? <Square className="h-3 w-3" /> : <Play className="h-3.5 w-3.5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {isTweening ? "Stop" : "Play"}
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>
    </div>
  );
}
