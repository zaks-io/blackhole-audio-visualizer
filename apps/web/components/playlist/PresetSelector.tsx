"use client";

import { useEffect, useMemo } from "react";
import { Sparkles, Play, Pause, SkipForward } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useFeelingLucky } from "@/hooks/useFeelingLucky";
import { usePlayPreset } from "@/components/ProducerMode/usePlayPreset";
import { usePresets } from "@/components/ProducerMode/usePresets";
import { useCameraMode, type CameraMode } from "@/components/CameraSystem";
import { usePresetSelector } from "./usePresetSelector";
import type { Playlist, Preset } from "@/components/ProducerMode/types";

interface PresetSelectorProps {
  compact?: boolean;
}

interface GroupedPresets {
  ungrouped: Preset[];
  byPlaylist: Array<{ playlist: Playlist; presets: Preset[] }>;
}

export function PresetSelector({ compact = false }: PresetSelectorProps) {
  const { presets, setActivePreset } = usePresets();
  const { playlists } = usePlaylists();
  const cameraMode = useCameraMode();

  const {
    mode,
    setMode,
    selectedPresetId,
    setSelectedPresetId,
    isLuckyPlaying,
    triggerStop,
    triggerPlay,
  } = usePresetSelector();

  const { playPreset, stopAll } = usePlayPreset();

  const feelingLucky = useFeelingLucky(presets);

  const groupedPresets = useMemo((): GroupedPresets => {
    const presetIdsInPlaylists = new Set<string>();
    for (const playlist of playlists) {
      for (const item of playlist.items) {
        presetIdsInPlaylists.add(item.presetId);
      }
    }

    const ungrouped = presets.filter((preset) => !presetIdsInPlaylists.has(preset.id));

    const byPlaylist: GroupedPresets["byPlaylist"] = [];
    for (const playlist of playlists) {
      const seenIds = new Set<string>();
      const playlistPresets: Preset[] = [];
      for (const item of playlist.items) {
        if (seenIds.has(item.presetId)) continue;
        const preset = presets.find((candidate) => candidate.id === item.presetId);
        if (preset) {
          seenIds.add(item.presetId);
          playlistPresets.push(preset);
        }
      }
      if (playlistPresets.length > 0) {
        byPlaylist.push({ playlist, presets: playlistPresets });
      }
    }

    return { ungrouped, byPlaylist };
  }, [presets, playlists]);

  useEffect(() => {
    if (mode === "preset" && selectedPresetId) {
      const exists = presets.some((preset) => preset.id === selectedPresetId);
      if (!exists) {
        setMode("feeling-lucky");
        setSelectedPresetId(null);
      }
    }
  }, [mode, selectedPresetId, presets, setMode, setSelectedPresetId]);

  const handleValueChange = (value: string) => {
    const switchingToLucky = value === "feeling-lucky";
    if (!switchingToLucky && isLuckyPlaying) {
      triggerStop();
    }
    // If we're already running Feeling Lucky and re-select it, don't kill tweens.
    if (!switchingToLucky || !isLuckyPlaying) {
      stopAll();
    }

    if (value === "feeling-lucky") {
      setMode("feeling-lucky");
      setSelectedPresetId(null);
      triggerPlay();
    } else if (value === "none") {
      setMode("none");
      setSelectedPresetId(null);
      setActivePreset(null);
    } else {
      const preset = presets.find((candidate) => candidate.id === value);
      setMode("preset");
      setSelectedPresetId(value);
      setActivePreset(value);
      if (preset) {
        playPreset(preset);
        if (preset.cameraMode) {
          cameraMode.setMode(preset.cameraMode as CameraMode);
        }
      }
    }
  };

  const currentValue =
    mode === "feeling-lucky"
      ? "feeling-lucky"
      : mode === "preset"
        ? (selectedPresetId ?? "none")
        : "none";

  const displayName = useMemo(() => {
    if (mode === "feeling-lucky") return "Feeling Lucky";
    if (mode === "preset" && selectedPresetId) {
      const preset = presets.find((candidate) => candidate.id === selectedPresetId);
      return preset?.name ?? "Preset";
    }
    return "None";
  }, [mode, selectedPresetId, presets]);

  const hasPresets = presets.length > 0;

  return (
    <div className="flex items-center gap-1">
      <div className={cn(compact && "hidden sm:block")}>
        <Select value={currentValue} onValueChange={handleValueChange}>
          <SelectTrigger
            className={cn(
              "h-10 w-40 gap-2 rounded-full border-0 bg-transparent px-3",
              "hover:bg-accent/50",
              "focus:ring-0 focus-visible:ring-0"
            )}
          >
            <Sparkles className="h-4 w-4" />
            <SelectValue placeholder="Preset" className="truncate">
              {displayName}
            </SelectValue>
          </SelectTrigger>
          <SelectContent position="popper" className="!overflow-y-auto !max-h-80">
            <SelectItem value="feeling-lucky">
              <span className="flex items-center gap-2">
                <Sparkles className="h-3 w-3" />
                I&apos;m Feeling Lucky
              </span>
            </SelectItem>
            <SelectItem value="none">None</SelectItem>

            {hasPresets && <SelectSeparator />}

            {groupedPresets.ungrouped.length > 0 && (
              <>
                {groupedPresets.ungrouped.map((preset) => (
                  <SelectItem key={preset.id} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
                {groupedPresets.byPlaylist.length > 0 && <SelectSeparator />}
              </>
            )}

            {groupedPresets.byPlaylist.map(({ playlist, presets }) => (
              <SelectGroup key={playlist.id}>
                <SelectLabel>{playlist.name}</SelectLabel>
                {presets.map((preset) => (
                  <SelectItem key={`${playlist.id}-${preset.id}`} value={preset.id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Always show Feeling Lucky controls: the play button always starts/controls Feeling Lucky */}
      <>
        <div className="relative">
          {feelingLucky.state.isPlaying && (
            <svg
              className="absolute inset-0 -rotate-90 pointer-events-none"
              width="40"
              height="40"
              viewBox="0 0 40 40"
            >
              <circle
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                className="text-primary/30"
              />
              <circle
                key={feelingLucky.state.cycleKey}
                cx="20"
                cy="20"
                r="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 18}
                strokeDashoffset={2 * Math.PI * 18}
                className="text-primary animate-progress-ring"
                style={{
                  animationPlayState: feelingLucky.state.isPaused ? "paused" : "running",
                }}
              />
            </svg>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (!feelingLucky.state.isPlaying) {
                // Ensure the Feeling Lucky engine is allowed to run (it stops itself when mode != feeling-lucky).
                setMode("feeling-lucky");
                setSelectedPresetId(null);
                triggerPlay();
              } else if (feelingLucky.state.isPaused) {
                feelingLucky.resume();
              } else {
                feelingLucky.pause();
              }
            }}
            className={cn(
              "h-10 w-10 rounded-full",
              feelingLucky.state.isPlaying && !feelingLucky.state.isPaused && "bg-white/10"
            )}
            aria-label={
              !feelingLucky.state.isPlaying || feelingLucky.state.isPaused
                ? "Play random presets"
                : "Pause random presets"
            }
          >
            {!feelingLucky.state.isPlaying || feelingLucky.state.isPaused ? (
              <Play className="h-4 w-4" />
            ) : (
              <Pause className="h-4 w-4" />
            )}
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => feelingLucky.skip()}
          disabled={!feelingLucky.state.isPlaying}
          className="h-10 w-10 rounded-full"
          aria-label="Skip random preset"
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </>
    </div>
  );
}
