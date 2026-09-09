"use client";

import { Sparkles } from "lucide-react";
import {
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import type { usePresetSelection } from "./usePresetSelection";

type PresetSelectorProps = ReturnType<typeof usePresetSelection>;

export function PresetSelector({
  currentValue,
  displayName,
  groupedPresets,
  handleValueChange,
}: PresetSelectorProps) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger aria-label="Preset">
        <Sparkles className="h-4 w-4 text-muted-foreground" />
        <span className="truncate">{displayName}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
        <DropdownMenuRadioGroup value={currentValue} onValueChange={handleValueChange}>
          <DropdownMenuRadioItem value="feeling-lucky">
            I&apos;m Feeling Lucky
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="none">None</DropdownMenuRadioItem>
          {groupedPresets.ungrouped.length > 0 && <DropdownMenuSeparator />}
          {groupedPresets.ungrouped.map((preset) => (
            <DropdownMenuRadioItem key={preset.id} value={preset.id}>
              {preset.name}
            </DropdownMenuRadioItem>
          ))}
          {groupedPresets.byPlaylist.map(({ playlist, presets }) => (
            <div key={playlist.id}>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{playlist.name}</DropdownMenuLabel>
              {presets.map((preset) => (
                <DropdownMenuRadioItem key={preset.id} value={preset.id}>
                  {preset.name}
                </DropdownMenuRadioItem>
              ))}
            </div>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
