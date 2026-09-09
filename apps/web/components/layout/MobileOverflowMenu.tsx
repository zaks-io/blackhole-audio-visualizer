"use client";

import { useState } from "react";
import { HelpCircle, MoreVertical } from "lucide-react";
import { useCameraMode, type CameraMode } from "@/components/CameraSystem";
import { HelpDialogContent } from "@/components/dialogs";
import { usePlayPreset } from "@/components/ProducerMode/usePlayPreset";
import { usePresets } from "@/components/ProducerMode/usePresets";
import { usePresetSelector } from "@/components/playlist/usePresetSelector";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { usePlaylists } from "@/hooks/usePlaylists";
import { useUIState } from "@/hooks/useUIState";
import { CameraMenuSection, PresetMenuSection, SettingsMenuSection } from "./MobileMenuSections";

const CAMERA_MODES: { id: CameraMode; label: string }[] = [
  { id: "free", label: "Free Look" },
  { id: "circle", label: "Circle" },
  { id: "closeup", label: "Close Up" },
  { id: "orbit", label: "Orbit" },
  { id: "edge", label: "Edge" },
];

export function MobileOverflowMenu() {
  const [helpOpen, setHelpOpen] = useState(false);
  const { fpsVisible, toggleFPS, bassStrobeEnabled, toggleBassStrobe } = useUIState();
  const { playlists } = usePlaylists();
  const { presets, setActivePreset } = usePresets();
  const { playPreset, stopAll } = usePlayPreset();
  const {
    mode: presetMode,
    setMode: setPresetMode,
    selectedPresetId,
    setSelectedPresetId,
    isLuckyPlaying,
    triggerPlay,
    triggerStop,
  } = usePresetSelector();
  const cameraMode = useCameraMode();

  const handlePresetSelect = (
    presetId: string | null,
    newMode: "none" | "preset" | "feeling-lucky"
  ) => {
    const switchingToLucky = newMode === "feeling-lucky";
    if (!switchingToLucky && isLuckyPlaying) {
      triggerStop();
    }
    if (!switchingToLucky || !isLuckyPlaying) {
      stopAll();
    }

    setPresetMode(newMode);
    setSelectedPresetId(presetId);

    if (newMode === "preset" && presetId) {
      const preset = presets.find((candidate) => candidate.id === presetId);
      if (!preset) return;

      setActivePreset(preset.id);
      playPreset(preset);
      if (preset.cameraMode) {
        cameraMode.setMode(preset.cameraMode as CameraMode);
      }
    } else if (newMode === "feeling-lucky") {
      triggerPlay();
    } else {
      setActivePreset(null);
    }
  };

  const presetIdsInPlaylists = new Set(
    playlists.flatMap((playlist) => playlist.items.map((item) => item.presetId))
  );
  const ungroupedPresets = presets.filter((preset) => !presetIdsInPlaylists.has(preset.id));
  const playlistGroups = playlists
    .map((playlist) => {
      const seenIds = new Set<string>();
      const playlistPresets = playlist.items.flatMap((item) => {
        if (seenIds.has(item.presetId)) return [];
        const preset = presets.find((candidate) => candidate.id === item.presetId);
        if (!preset) return [];
        seenIds.add(item.presetId);
        return [preset];
      });
      return { playlist, presets: playlistPresets };
    })
    .filter((group) => group.presets.length > 0);

  const selectedPreset = presets.find((preset) => preset.id === selectedPresetId);
  const displayName =
    presetMode === "feeling-lucky" ? "Feeling Lucky" : (selectedPreset?.name ?? "None");

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full sm:hidden"
            aria-label="Settings"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <CameraMenuSection
            currentMode={cameraMode.mode}
            modes={CAMERA_MODES}
            onSelect={(mode) => cameraMode.setMode(mode)}
          />
          <PresetMenuSection
            displayName={displayName}
            presetMode={presetMode}
            selectedPresetId={selectedPresetId}
            ungroupedPresets={ungroupedPresets}
            playlistGroups={playlistGroups}
            onSelect={handlePresetSelect}
          />

          <DropdownMenuSeparator />

          <SettingsMenuSection
            fpsVisible={fpsVisible}
            bassStrobeEnabled={bassStrobeEnabled}
            onToggleFPS={toggleFPS}
            onToggleBassStrobe={toggleBassStrobe}
          />

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={() => setHelpOpen(true)} className="cursor-pointer">
            <HelpCircle className="mr-2 h-4 w-4" />
            Help
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Getting Started</DialogTitle>
          </DialogHeader>
          <Separator />
          <HelpDialogContent />
        </DialogContent>
      </Dialog>
    </>
  );
}
