"use client";

import { useState, useEffect, useCallback, memo, useMemo } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TweenSliderTrack } from "@/components/ProducerMode/TweenSliderTrack";
import { useProducerTween } from "@/components/ProducerMode/useProducerTween";
import {
  useVisualizationControls,
  type VisualizationControlsState,
} from "@/hooks/useVisualizationControls";
import { PARAMS } from "@blackhole/backend/convex/lib/visualizationParameters";
import type { ParameterSliderProps } from "./types";

function formatValue(value: number, step: number): string {
  if (step >= 1) return value.toFixed(0);
  if (step >= 0.1) return value.toFixed(1);
  return value.toFixed(2);
}

const InstantSlider = memo(function InstantSlider({
  storeKey,
  label,
  description,
  min,
  max,
  step,
}: {
  storeKey: string;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
}) {
  const value = useVisualizationControls(
    (state) => state[storeKey as keyof VisualizationControlsState]
  ) as number;
  const set = useVisualizationControls((state) => state.set);

  const handleChange = useCallback(
    (newValue: number[]) => {
      set(
        storeKey as keyof VisualizationControlsState,
        newValue[0] as VisualizationControlsState[keyof VisualizationControlsState]
      );
    },
    [storeKey, set]
  );

  const fillPercent = useMemo(() => ((value - min) / (max - min)) * 100, [value, min, max]);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-48">
                {description}
              </TooltipContent>
            </Tooltip>
          </div>
          <span className="font-mono text-xs text-primary tabular-nums">
            {formatValue(value, step)}
          </span>
        </div>
        <SliderPrimitive.Root
          className="relative flex w-full touch-none items-center select-none h-6 cursor-pointer"
          min={min}
          max={max}
          step={step}
          value={[value]}
          onValueChange={handleChange}
        >
          <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-white/10">
            <div
              className="absolute h-full rounded-full bg-primary/60"
              style={{ width: `${fillPercent}%` }}
            />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="block size-4 rounded-full border-2 border-primary bg-transparent hover:bg-primary/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 cursor-grab active:cursor-grabbing" />
        </SliderPrimitive.Root>
      </div>
    </TooltipProvider>
  );
});

const TweenedSlider = memo(function TweenedSlider({
  path,
  label,
  description,
  min,
  max,
  step,
}: {
  path: string;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
}) {
  const config = useMemo(
    () => ({ path, label, description, min, max, step }),
    [path, label, description, min, max, step]
  );

  const {
    currentValue,
    targetValue: storeTargetValue,
    isTweening,
    progress,
    startTween,
    killTween,
  } = useProducerTween(config);

  const [localTarget, setLocalTarget] = useState(storeTargetValue);

  useEffect(() => {
    setLocalTarget(storeTargetValue);
  }, [storeTargetValue]);

  const handleCommit = useCallback(
    (value: number) => {
      killTween();
      startTween(value);
    },
    [killTween, startTween]
  );

  const hasChange = Math.abs(localTarget - currentValue) > step;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">{label}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <HelpCircle className="h-3 w-3 text-muted-foreground/50 hover:text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-48">
                {description}
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {isTweening ? (
              <span className="text-primary">{formatValue(currentValue, step)}</span>
            ) : (
              <>
                <span className="text-muted-foreground/80">{formatValue(currentValue, step)}</span>
                {hasChange && (
                  <>
                    <span className="text-muted-foreground/40">→</span>
                    <span className="text-primary">{formatValue(localTarget, step)}</span>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <TweenSliderTrack
          min={min}
          max={max}
          step={step}
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
});

export const ParameterSlider = memo(function ParameterSlider({
  path,
  storeKey,
  label,
  min,
  max,
  step,
  mode,
  duration,
}: ParameterSliderProps) {
  const description = useMemo(() => PARAMS[path]?.description || "", [path]);

  if (mode === "dev" || duration === 0) {
    return (
      <InstantSlider
        storeKey={storeKey}
        label={label}
        description={description}
        min={min}
        max={max}
        step={step}
      />
    );
  }

  return (
    <TweenedSlider
      path={path}
      label={label}
      description={description}
      min={min}
      max={max}
      step={step}
    />
  );
});
