"use client";

import { Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { EASE_OPTIONS } from "./producerConfig";
import type { EaseFunction } from "./types";

interface EasingPickerProps {
  value: EaseFunction;
  onChange: (ease: EaseFunction) => void;
  disabled?: boolean;
}

const EASE_CURVES: Partial<Record<EaseFunction, string>> = {
  none: "M 0 20 L 30 0",
  "power1.inOut": "M 0 20 Q 15 20 15 10 Q 15 0 30 0",
  "power2.inOut": "M 0 20 C 10 20 5 0 15 0 C 25 0 20 0 30 0",
  "power3.inOut": "M 0 20 C 12 20 3 0 15 0 C 27 0 18 0 30 0",
  "power4.inOut": "M 0 20 C 14 20 1 0 15 0 C 29 0 16 0 30 0",
  "power1.in": "M 0 20 Q 15 18 30 0",
  "power2.in": "M 0 20 Q 20 18 30 0",
  "power3.in": "M 0 20 Q 25 16 30 0",
  "power1.out": "M 0 20 Q 5 2 30 0",
  "power2.out": "M 0 20 Q 10 2 30 0",
  "power3.out": "M 0 20 Q 5 0 30 0",
  "back.inOut": "M 0 20 C 8 24 22 -4 30 0",
  "elastic.out": "M 0 20 Q 5 -8 10 4 Q 15 -2 20 1 Q 25 0 30 0",
  "bounce.out": "M 0 20 L 8 4 L 12 10 L 18 2 L 22 6 L 26 1 L 30 0",
};

export function EasingPicker({ value, onChange, disabled }: EasingPickerProps) {
  const groups = EASE_OPTIONS.reduce(
    (acc, opt) => {
      if (!acc[opt.group]) acc[opt.group] = [];
      acc[opt.group].push(opt);
      return acc;
    },
    {} as Record<string, typeof EASE_OPTIONS>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="h-7 w-7 rounded-md hover:bg-white/10"
        >
          <Waves className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 p-3 glass-panel-solid border-white/10"
        sideOffset={8}
      >
        <div className="text-xs font-medium text-muted-foreground mb-3">Easing</div>
        <div className="space-y-3">
          {Object.entries(groups).map(([group, options]) => (
            <div key={group}>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5">
                {group}
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => onChange(opt.value)}
                    className={cn(
                      "flex flex-col items-center p-1.5 rounded-md transition-colors",
                      value === opt.value
                        ? "bg-primary/20 ring-1 ring-primary/50"
                        : "hover:bg-white/5"
                    )}
                  >
                    <svg
                      width="30"
                      height="20"
                      viewBox="0 0 30 20"
                      className="mb-1"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                    >
                      <path
                        d={EASE_CURVES[opt.value] || "M 0 20 L 30 0"}
                        className={
                          value === opt.value ? "stroke-primary" : "stroke-muted-foreground/60"
                        }
                      />
                    </svg>
                    <span className="text-[9px] text-muted-foreground">{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
