"use client";

import { memo } from "react";
import { Palette, Timer, Zap, type LucideIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DurationPicker } from "@/components/ProducerMode/DurationPicker";
import { EasingPicker } from "@/components/ProducerMode/EasingPicker";
import type { EaseFunction } from "@/components/ProducerMode/types";
import { PALETTE_IDS, PALETTES, type ColorPaletteId } from "@/components/ColorModeSystem";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import { cn } from "@/lib/utils";

interface GlobalControlsProps {
  duration: number;
  ease: EaseFunction;
  onDurationChange: (duration: number) => void;
  onEaseChange: (ease: EaseFunction) => void;
}

const ColorPaletteSelector = memo(function ColorPaletteSelector() {
  const colorPalette = useVisualizationControls((s) => s.colorPalette);
  const setColorPalette = useVisualizationControls((s) => s.set);

  return (
    <Select
      value={colorPalette}
      onValueChange={(value) => setColorPalette("colorPalette", value as ColorPaletteId)}
    >
      <SelectTrigger
        size="sm"
        className={cn(
          "w-[88px] h-6 text-[10px] font-medium",
          "bg-white/[0.04] border-white/[0.08]",
          "hover:bg-white/[0.06] hover:border-white/[0.12]",
          "focus:border-primary/40 focus:ring-0",
          "transition-all duration-150"
        )}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-64">
        {PALETTE_IDS.map((id) => (
          <SelectItem key={id} value={id} className="text-xs">
            {PALETTES[id].name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
});

function ControlRow({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="group flex items-center gap-2.5 py-1.5">
      <div
        className={cn(
          "flex items-center justify-center w-5 h-5 rounded",
          "bg-white/[0.03] transition-colors duration-200",
          "group-hover:bg-white/[0.05]"
        )}
      >
        <Icon className="h-3 w-3 text-muted-foreground/60 group-hover:text-muted-foreground/80 transition-colors" />
      </div>
      <span className="text-[10px] font-medium text-foreground/70 flex-1 uppercase tracking-wider group-hover:text-foreground/90 transition-colors">
        {label}
      </span>
      {children}
    </div>
  );
}

export function GlobalControls({
  duration,
  ease,
  onDurationChange,
  onEaseChange,
}: GlobalControlsProps) {
  const isInstant = duration === 0;

  return (
    <div className="space-y-0.5 pb-3 mb-2 border-b border-white/[0.04]">
      {/* Color Palette */}
      <ControlRow icon={Palette} label="Palette">
        <ColorPaletteSelector />
      </ControlRow>

      {/* Duration & Easing */}
      <ControlRow icon={Timer} label="Timing">
        <div className="flex items-center gap-1.5">
          <DurationPicker value={duration} onChange={onDurationChange} />

          {/* Duration display with instant indicator */}
          <div
            className={cn(
              "min-w-[52px] h-6 px-2 flex items-center justify-center rounded",
              "text-[10px] font-mono tabular-nums",
              "transition-all duration-200",
              isInstant
                ? "bg-primary/10 text-primary/80"
                : "bg-white/[0.03] text-muted-foreground/60"
            )}
          >
            {isInstant ? (
              <span className="flex items-center gap-1">
                <Zap className="h-2.5 w-2.5" />
                <span>instant</span>
              </span>
            ) : (
              `${duration.toFixed(1)}s`
            )}
          </div>

          <EasingPicker value={ease} onChange={onEaseChange} disabled={isInstant} />
        </div>
      </ControlRow>
    </div>
  );
}
