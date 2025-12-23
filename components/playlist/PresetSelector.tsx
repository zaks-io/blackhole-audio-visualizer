"use client";

import { useEffect, useMemo } from "react";
import { Sparkles, Play, Pause, SkipForward } from "lucide-react";
import { useConvexAuth } from "convex/react";
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
import { useConvexPresets } from "@/hooks/useConvexPresets";
import { useConvexPlaylists } from "@/hooks/useConvexPlaylists";
import { useFeelingLucky } from "@/hooks/useFeelingLucky";
import { usePlayPreset } from "@/components/ProducerMode/usePlayPreset";
import { usePresetSelector } from "./usePresetSelector";
import type { ConvexPreset, Playlist, Preset } from "@/components/ProducerMode/types";

interface PresetSelectorProps {
  compact?: boolean;
}

interface GroupedPresets {
  ungrouped: ConvexPreset[];
  byPlaylist: Array<{ playlist: Playlist; presets: ConvexPreset[] }>;
  publicUngrouped: ConvexPreset[];
}

function convexPresetToPreset(preset: ConvexPreset): Preset {
  return {
    id: preset._id,
    name: preset.name,
    colorPalette: preset.colorPalette,
    parameters: preset.parameters,
  };
}

export function PresetSelector({ compact = false }: PresetSelectorProps) {
  const { isAuthenticated } = useConvexAuth();
  const { presets: myPresets, publicPresets, isLoading: presetsLoading } = useConvexPresets();
  const { playlists, publicPlaylists, isLoading: playlistsLoading } = useConvexPlaylists();

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

  const allPresets = useMemo(() => [...myPresets, ...publicPresets], [myPresets, publicPresets]);
  const allPlaylists = useMemo(
    () => [...playlists, ...publicPlaylists],
    [playlists, publicPlaylists]
  );

  const feelingLucky = useFeelingLucky(allPresets);

  const groupedPresets = useMemo((): GroupedPresets => {
    const presetIdsInPlaylists = new Set<string>();
    for (const playlist of allPlaylists) {
      for (const item of playlist.items) {
        presetIdsInPlaylists.add(item.presetId);
      }
    }

    const ungrouped = myPresets.filter((p) => !presetIdsInPlaylists.has(p._id));

    const byPlaylist: GroupedPresets["byPlaylist"] = [];
    for (const playlist of allPlaylists) {
      const seenIds = new Set<string>();
      const playlistPresets: ConvexPreset[] = [];
      for (const item of playlist.items) {
        if (seenIds.has(item.presetId)) continue;
        const preset = allPresets.find((p) => p._id === item.presetId);
        if (preset) {
          seenIds.add(item.presetId);
          playlistPresets.push(preset);
        }
      }
      if (playlistPresets.length > 0) {
        byPlaylist.push({ playlist, presets: playlistPresets });
      }
    }

    const publicUngrouped = publicPresets.filter((p) => !presetIdsInPlaylists.has(p._id));

    return { ungrouped, byPlaylist, publicUngrouped };
  }, [myPresets, publicPresets, allPresets, allPlaylists]);

  const isLoading = presetsLoading || playlistsLoading;

  useEffect(() => {
    if (isLoading) return;
    if (mode === "preset" && selectedPresetId) {
      const exists = allPresets.some((p) => p._id === selectedPresetId);
      if (!exists) {
        setMode("feeling-lucky");
        setSelectedPresetId(null);
      }
    }
  }, [isLoading, mode, selectedPresetId, allPresets, setMode, setSelectedPresetId]);

  const handleValueChange = (value: string) => {
    if (isLuckyPlaying) {
      triggerStop();
    }
    stopAll();

    if (value === "feeling-lucky") {
      setMode("feeling-lucky");
      setSelectedPresetId(null);
    } else if (value === "none") {
      setMode("none");
      setSelectedPresetId(null);
    } else {
      setMode("preset");
      setSelectedPresetId(value);
    }
  };

  const handlePlayPauseToggle = () => {
    if (mode === "preset" && selectedPresetId) {
      const preset = allPresets.find((p) => p._id === selectedPresetId);
      if (preset) {
        playPreset(convexPresetToPreset(preset));
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
      const preset = allPresets.find((p) => p._id === selectedPresetId);
      return preset?.name ?? "Preset";
    }
    return "None";
  }, [mode, selectedPresetId, allPresets]);

  const hasPresets = allPresets.length > 0;

  return (
    <div className="flex items-center gap-1">
      <div className={cn(compact && "hidden sm:block")}>
        <Select value={currentValue} onValueChange={handleValueChange} disabled={isLoading}>
          <SelectTrigger
            className={cn(
              "h-10 w-40 gap-2 rounded-full border-0 bg-transparent px-3",
              "hover:bg-accent/50",
              "focus:ring-0 focus-visible:ring-0",
              isLoading && "opacity-50 cursor-wait"
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

            {isAuthenticated && groupedPresets.ungrouped.length > 0 && (
              <>
                {groupedPresets.ungrouped.map((preset) => (
                  <SelectItem key={preset._id} value={preset._id}>
                    {preset.name}
                  </SelectItem>
                ))}
                {(groupedPresets.byPlaylist.length > 0 ||
                  groupedPresets.publicUngrouped.length > 0) && <SelectSeparator />}
              </>
            )}

            {groupedPresets.byPlaylist.map(({ playlist, presets }) => (
              <SelectGroup key={playlist._id}>
                <SelectLabel>{playlist.name}</SelectLabel>
                {presets.map((preset) => (
                  <SelectItem key={`${playlist._id}-${preset._id}`} value={preset._id}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}

            {groupedPresets.publicUngrouped.length > 0 && (
              <>
                {groupedPresets.byPlaylist.length > 0 && <SelectSeparator />}
                <SelectGroup>
                  <SelectLabel>Public Presets</SelectLabel>
                  {groupedPresets.publicUngrouped.map((preset) => (
                    <SelectItem key={preset._id} value={preset._id}>
                      {preset.name}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </>
            )}
          </SelectContent>
        </Select>
      </div>

      {mode === "preset" && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handlePlayPauseToggle}
          disabled={!selectedPresetId}
          className="h-10 w-10 rounded-full"
        >
          <Play className="h-4 w-4" />
        </Button>
      )}

      {mode === "feeling-lucky" && (
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
          >
            <SkipForward className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
