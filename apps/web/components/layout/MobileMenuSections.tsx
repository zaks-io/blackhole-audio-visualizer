"use client";

import { Gauge, ListMusic, Sparkles, Video, Zap } from "lucide-react";
import type { CameraMode } from "@/components/CameraSystem";
import type { Playlist, Preset } from "@/components/ProducerMode/types";
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";

interface CameraModeEntry {
  id: CameraMode;
  label: string;
}

interface CameraMenuSectionProps {
  currentMode: CameraMode;
  modes: CameraModeEntry[];
  onSelect: (mode: CameraMode) => void;
}

export function CameraMenuSection({ currentMode, modes, onSelect }: CameraMenuSectionProps) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="cursor-pointer">
        <Video className="mr-2 h-4 w-4" />
        <span className="truncate">
          {modes.find((mode) => mode.id === currentMode)?.label ?? "Camera"}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {modes.map((mode) => (
          <DropdownMenuItem
            key={mode.id}
            onClick={() => onSelect(mode.id)}
            className={`cursor-pointer ${currentMode === mode.id ? "bg-primary/20" : ""}`}
          >
            {mode.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

interface PlaylistGroup {
  playlist: Playlist;
  presets: Preset[];
}

interface PresetMenuSectionProps {
  displayName: string;
  presetMode: string;
  selectedPresetId: string | null;
  ungroupedPresets: Preset[];
  playlistGroups: PlaylistGroup[];
  onSelect: (presetId: string | null, mode: "none" | "preset" | "feeling-lucky") => void;
}

export function PresetMenuSection({
  displayName,
  presetMode,
  selectedPresetId,
  ungroupedPresets,
  playlistGroups,
  onSelect,
}: PresetMenuSectionProps) {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="cursor-pointer">
        <ListMusic className="mr-2 h-4 w-4" />
        <span className="truncate">{displayName}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
        <DropdownMenuItem
          onClick={() => onSelect(null, "feeling-lucky")}
          className={`cursor-pointer ${presetMode === "feeling-lucky" ? "bg-primary/20" : ""}`}
        >
          <Sparkles className="mr-2 h-4 w-4" />
          I&apos;m Feeling Lucky
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSelect(null, "none")}
          className={`cursor-pointer ${presetMode === "none" ? "bg-primary/20" : ""}`}
        >
          None
        </DropdownMenuItem>
        {ungroupedPresets.length > 0 && (
          <>
            <DropdownMenuSeparator />
            {ungroupedPresets.map((preset) => (
              <DropdownMenuItem
                key={preset.id}
                onClick={() => onSelect(preset.id, "preset")}
                className={`cursor-pointer ${selectedPresetId === preset.id ? "bg-primary/20" : ""}`}
              >
                {preset.name}
              </DropdownMenuItem>
            ))}
          </>
        )}
        {playlistGroups.map(({ playlist, presets }) => (
          <div key={playlist.id}>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-xs text-muted-foreground">
              {playlist.name}
            </DropdownMenuLabel>
            {presets.map((preset) => (
              <DropdownMenuItem
                key={`${playlist.id}-${preset.id}`}
                onClick={() => onSelect(preset.id, "preset")}
                className={`cursor-pointer ${selectedPresetId === preset.id ? "bg-primary/20" : ""}`}
              >
                {preset.name}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

interface SettingsMenuSectionProps {
  fpsVisible: boolean;
  bassStrobeEnabled: boolean;
  onToggleFPS: () => void;
  onToggleBassStrobe: () => void;
}

export function SettingsMenuSection({
  fpsVisible,
  bassStrobeEnabled,
  onToggleFPS,
  onToggleBassStrobe,
}: SettingsMenuSectionProps) {
  return (
    <>
      <DropdownMenuLabel className="text-xs text-muted-foreground">Settings</DropdownMenuLabel>
      <div className="px-2 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gauge className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">FPS Meter</span>
        </div>
        <Switch checked={fpsVisible} onCheckedChange={onToggleFPS} />
      </div>
      <div className="px-2 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">Bass Strobe</span>
        </div>
        <Switch checked={bassStrobeEnabled} onCheckedChange={onToggleBassStrobe} />
      </div>
    </>
  );
}
