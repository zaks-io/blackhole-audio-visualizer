"use client";

import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Gauge, Zap, Video, ListMusic, Film } from "lucide-react";
import type { CameraMode } from "@/components/CameraSystem";
import type { ConvexPreset } from "@/components/ProducerMode/types";

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
          {modes.find((m) => m.id === currentMode)?.label ?? "Camera"}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {modes.map((m) => (
          <DropdownMenuItem
            key={m.id}
            onClick={() => onSelect(m.id)}
            className={`cursor-pointer ${currentMode === m.id ? "bg-primary/20" : ""}`}
          >
            {m.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

interface PlaylistGroup {
  playlist: { _id: string; name: string };
  presets: (ConvexPreset | undefined | null)[];
}

interface PresetMenuSectionProps {
  displayName: string;
  presetMode: string;
  selectedPresetId: string | null;
  isLoading: boolean;
  ungroupedPresets: ConvexPreset[];
  publicUngroupedPresets: ConvexPreset[];
  playlistGroups: PlaylistGroup[];
  onSelect: (presetId: string | null, mode: "none" | "preset" | "feeling-lucky") => void;
}

export function PresetMenuSection({
  displayName,
  presetMode,
  selectedPresetId,
  isLoading,
  ungroupedPresets,
  publicUngroupedPresets,
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
          ✨ I&apos;m Feeling Lucky
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onSelect(null, "none")}
          className={`cursor-pointer ${presetMode === "none" ? "bg-primary/20" : ""}`}
        >
          None
        </DropdownMenuItem>
        {!isLoading && (
          <>
            {ungroupedPresets.length > 0 && (
              <>
                <DropdownMenuSeparator />
                {ungroupedPresets.map((p) => (
                  <DropdownMenuItem
                    key={p._id}
                    onClick={() => onSelect(p._id, "preset")}
                    className={`cursor-pointer ${selectedPresetId === p._id ? "bg-primary/20" : ""}`}
                  >
                    {p.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            {playlistGroups.map(({ playlist, presets }) => (
              <div key={playlist._id}>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  {playlist.name}
                </DropdownMenuLabel>
                {presets.map((p) => (
                  <DropdownMenuItem
                    key={`${playlist._id}-${p!._id}`}
                    onClick={() => onSelect(p!._id, "preset")}
                    className={`cursor-pointer ${selectedPresetId === p!._id ? "bg-primary/20" : ""}`}
                  >
                    {p!.name}
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
            {publicUngroupedPresets.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Public Presets
                </DropdownMenuLabel>
                {publicUngroupedPresets.map((p) => (
                  <DropdownMenuItem
                    key={p._id}
                    onClick={() => onSelect(p._id, "preset")}
                    className={`cursor-pointer ${selectedPresetId === p._id ? "bg-primary/20" : ""}`}
                  >
                    {p.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </>
        )}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

interface Scene {
  _id: string;
  name: string;
}

interface SceneMenuSectionProps {
  currentSceneId: string | null;
  currentSceneName: string | undefined;
  isAuthenticated: boolean;
  isLoading: boolean;
  myScenes: Scene[];
  publicScenes: Scene[];
  onSelect: (id: string) => void;
}

export function SceneMenuSection({
  currentSceneId,
  currentSceneName,
  isAuthenticated,
  isLoading,
  myScenes,
  publicScenes,
  onSelect,
}: SceneMenuSectionProps) {
  const hasScenes = myScenes.length > 0 || publicScenes.length > 0;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="cursor-pointer">
        <Film className="mr-2 h-4 w-4" />
        <span className="truncate">{currentSceneName ?? "Select Scene"}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        {!isLoading && hasScenes ? (
          <>
            {isAuthenticated && myScenes.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  My Scenes
                </DropdownMenuLabel>
                {myScenes.map((s) => (
                  <DropdownMenuItem
                    key={s._id}
                    onClick={() => onSelect(s._id)}
                    className={`cursor-pointer ${currentSceneId === s._id ? "bg-primary/20" : ""}`}
                  >
                    {s.name}
                  </DropdownMenuItem>
                ))}
                {publicScenes.length > 0 && <DropdownMenuSeparator />}
              </>
            )}
            {publicScenes.length > 0 && (
              <>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Public Scenes
                </DropdownMenuLabel>
                {publicScenes.map((s) => (
                  <DropdownMenuItem
                    key={s._id}
                    onClick={() => onSelect(s._id)}
                    className={`cursor-pointer ${currentSceneId === s._id ? "bg-primary/20" : ""}`}
                  >
                    {s.name}
                  </DropdownMenuItem>
                ))}
              </>
            )}
          </>
        ) : (
          <DropdownMenuItem disabled>No scenes available</DropdownMenuItem>
        )}
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
