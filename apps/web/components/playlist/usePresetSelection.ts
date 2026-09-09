import { useEffect, useMemo } from "react";
import { usePlaylists } from "@/hooks/usePlaylists";
import { usePlayPreset } from "@/components/ProducerMode/usePlayPreset";
import { usePresets } from "@/components/ProducerMode/usePresets";
import { useCameraMode, type CameraMode } from "@/components/CameraSystem";
import { usePresetSelector } from "./usePresetSelector";
import type { Playlist, Preset } from "@/components/ProducerMode/types";

interface GroupedPresets {
  ungrouped: Preset[];
  byPlaylist: Array<{ playlist: Playlist; presets: Preset[] }>;
}

export function usePresetSelection() {
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

  return { currentValue, displayName, groupedPresets, handleValueChange };
}
