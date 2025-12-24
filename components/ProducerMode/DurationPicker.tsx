"use client";

import { Timer, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { DURATION_PRESETS } from "./producerConfig";

interface DurationPickerProps {
  value: number;
  onChange: (duration: number) => void;
  disabled?: boolean;
}

export function DurationPicker({ value, onChange, disabled }: DurationPickerProps) {
  const isInstant = value === 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="h-7 w-7 rounded-md hover:bg-white/10"
        >
          <Timer className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-56 p-3 glass-panel-solid border-white/10"
        sideOffset={8}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium text-muted-foreground">Duration</span>
          <span className="text-xs font-mono text-primary">
            {isInstant ? "instant" : `${value.toFixed(1)}s`}
          </span>
        </div>

        <div className="mb-4">
          <Slider
            min={0}
            max={30}
            step={0.5}
            value={[value]}
            onValueChange={([v]) => onChange(v)}
            className="w-full"
          />
        </div>

        <div className="flex gap-1.5">
          <button
            onClick={() => onChange(0)}
            className={cn(
              "flex-1 py-1.5 text-xs rounded-md transition-colors flex items-center justify-center gap-1",
              isInstant
                ? "bg-primary/20 text-primary ring-1 ring-primary/50"
                : "bg-white/5 text-muted-foreground hover:bg-white/10"
            )}
          >
            <Zap className="h-3 w-3" />
          </button>
          {DURATION_PRESETS.map((preset) => (
            <button
              key={preset}
              onClick={() => onChange(preset)}
              className={cn(
                "flex-1 py-1.5 text-xs rounded-md transition-colors",
                value === preset
                  ? "bg-primary/20 text-primary ring-1 ring-primary/50"
                  : "bg-white/5 text-muted-foreground hover:bg-white/10"
              )}
            >
              {preset}s
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
