"use client";

import { Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { HlsLevel } from "./useVideoPlayer";

interface VideoQualitySelectorProps {
  levels: HlsLevel[];
  currentLevel: number;
  autoLevelEnabled: boolean;
  onSelect: (level: number) => void;
}

function formatBitrate(bitrate: number): string {
  if (bitrate >= 1_000_000) {
    return `${(bitrate / 1_000_000).toFixed(1)} Mbps`;
  }
  return `${Math.round(bitrate / 1000)} kbps`;
}

export function VideoQualitySelector({
  levels,
  currentLevel,
  autoLevelEnabled,
  onSelect,
}: VideoQualitySelectorProps) {
  if (levels.length === 0) return null;

  const currentLabel = autoLevelEnabled
    ? "Auto"
    : levels[currentLevel]
      ? `${levels[currentLevel].height}p`
      : "Auto";

  // Sort levels by height descending for display
  const sortedLevels = [...levels]
    .map((level, index) => ({ ...level, originalIndex: index }))
    .sort((a, b) => b.height - a.height);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 text-white/90 hover:text-white hover:bg-white/10 transition-colors font-medium text-xs"
        >
          <Settings className="w-4 h-4" />
          <span className="tabular-nums">{currentLabel}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[160px] bg-black/95 backdrop-blur-xl border-white/10"
      >
        <DropdownMenuLabel className="text-white/60 text-xs uppercase tracking-wider">
          Quality
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/10" />
        <DropdownMenuRadioGroup
          value={autoLevelEnabled ? "auto" : String(currentLevel)}
          onValueChange={(v) => onSelect(v === "auto" ? -1 : parseInt(v))}
        >
          <DropdownMenuRadioItem
            value="auto"
            className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white cursor-pointer"
          >
            <span className="font-medium">Auto</span>
            <span className="ml-auto text-white/50 text-xs">Adaptive</span>
          </DropdownMenuRadioItem>
          <DropdownMenuSeparator className="bg-white/10" />
          {sortedLevels.map((level) => (
            <DropdownMenuRadioItem
              key={level.originalIndex}
              value={String(level.originalIndex)}
              className="text-white hover:bg-white/10 focus:bg-white/10 focus:text-white cursor-pointer"
            >
              <span className="font-medium tabular-nums">{level.height}p</span>
              <span className="ml-auto text-white/50 text-xs tabular-nums">
                {formatBitrate(level.bitrate)}
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
