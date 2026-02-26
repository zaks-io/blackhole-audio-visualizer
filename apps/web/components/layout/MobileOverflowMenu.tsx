"use client";

import { useState } from "react";
import { MoreVertical, HelpCircle, User, LogOut, Radio, Film } from "lucide-react";
import { useConvexAuth } from "convex/react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUIState } from "@/hooks/useUIState";
import { useViewerMode } from "@/hooks/useViewerMode";
import { useConvexPlaylists } from "@/hooks/useConvexPlaylists";
import { useConvexScenes } from "@/hooks/useConvexScenes";
import { usePresetSelector } from "@/components/playlist/usePresetSelector";
import { useConvexPresets } from "@/hooks/useConvexPresets";
import { useCameraMode, type CameraMode } from "@/components/CameraSystem";
import { usePlayPreset } from "@/components/ProducerMode/usePlayPreset";
import { useRouter } from "next/navigation";
import type { ConvexPreset, Preset } from "@/components/ProducerMode/types";
import { HelpDialogContent } from "@/components/dialogs";
import {
  CameraMenuSection,
  PresetMenuSection,
  SceneMenuSection,
  SettingsMenuSection,
} from "./MobileMenuSections";

const CAMERA_MODES: { id: CameraMode; label: string }[] = [
  { id: "free", label: "Free Look" },
  { id: "circle", label: "Circle" },
  { id: "closeup", label: "Close Up" },
  { id: "orbit", label: "Orbit" },
  { id: "edge", label: "Edge" },
];

function convexPresetToPreset(preset: ConvexPreset): Preset {
  return {
    id: preset._id,
    name: preset.name,
    colorPalette: preset.colorPalette,
    parameters: preset.parameters,
    cameraMode: preset.cameraMode,
  };
}

export function MobileOverflowMenu() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const { isLoading: isAuthLoading } = useConvexAuth();
  const { isAuthenticated, user, login, logout } = useAuth();
  const { fpsVisible, toggleFPS, bassStrobeEnabled, toggleBassStrobe } = useUIState();
  const mode = useViewerMode((s) => s.mode);
  const sceneId = useViewerMode((s) => s.sceneId);
  const setMode = useViewerMode((s) => s.setMode);
  const { playlists, publicPlaylists, isLoading: isPlaylistLoading } = useConvexPlaylists();
  const { presets: myPresets, publicPresets, isLoading: isPresetsLoading } = useConvexPresets();
  const { scenes, publicScenes, isLoading: isScenesLoading } = useConvexScenes();
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
      const preset = allPresets.find((p) => p._id === presetId);
      if (preset) {
        playPreset(convexPresetToPreset(preset));
        if (preset.cameraMode) {
          cameraMode.setMode(preset.cameraMode as CameraMode);
        }
      }
    } else if (newMode === "feeling-lucky") {
      triggerPlay();
    }
  };

  const handleModeSwitch = (newMode: "live" | "scene") => {
    if (newMode === "live") {
      setMode("live", null);
      router.push("/app");
    } else {
      setMode("scene", null);
    }
  };

  const handleSceneSelect = (id: string) => {
    useViewerMode.getState().setNavigating(id);
    router.push(`/app/scene/${id}`);
  };

  const userSceneIds = new Set(scenes.map((s) => s._id));
  const filteredPublicScenes = publicScenes.filter((s) => !userSceneIds.has(s._id));
  const currentScene = [...scenes, ...filteredPublicScenes].find((s) => s._id === sceneId);

  const allPresets = [...myPresets, ...publicPresets];
  const allPlaylists = [...playlists, ...publicPlaylists];

  const presetIdsInPlaylists = new Set<string>();
  for (const playlist of allPlaylists) {
    for (const item of playlist.items) {
      presetIdsInPlaylists.add(item.presetId);
    }
  }

  const ungroupedPresets = myPresets.filter((p) => !presetIdsInPlaylists.has(p._id));
  const publicUngroupedPresets = publicPresets.filter((p) => !presetIdsInPlaylists.has(p._id));

  const playlistGroups = allPlaylists
    .map((playlist) => {
      const seenIds = new Set<string>();
      const playlistPresets = playlist.items
        .map((item) => {
          if (seenIds.has(item.presetId)) return null;
          const preset = allPresets.find((p) => p._id === item.presetId);
          if (preset) seenIds.add(item.presetId);
          return preset;
        })
        .filter(Boolean);
      return { playlist, presets: playlistPresets };
    })
    .filter((g) => g.presets.length > 0);

  const selectedPreset = allPresets.find((p) => p._id === selectedPresetId);
  const displayName =
    presetMode === "feeling-lucky" ? "Feeling Lucky" : (selectedPreset?.name ?? "None");

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ||
    user?.email?.charAt(0).toUpperCase() ||
    "?";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full sm:hidden">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {/* Mode Switch */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">Mode</DropdownMenuLabel>
          <DropdownMenuItem
            onClick={() => handleModeSwitch("live")}
            className={`cursor-pointer ${mode === "live" ? "bg-primary/20" : ""}`}
          >
            <Radio className="mr-2 h-4 w-4" />
            Live
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleModeSwitch("scene")}
            className={`cursor-pointer ${mode === "scene" ? "bg-primary/20" : ""}`}
          >
            <Film className="mr-2 h-4 w-4" />
            Scene
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {mode === "live" && (
            <>
              <CameraMenuSection
                currentMode={cameraMode.mode}
                modes={CAMERA_MODES}
                onSelect={(m) => cameraMode.setMode(m)}
              />
              <PresetMenuSection
                displayName={displayName}
                presetMode={presetMode}
                selectedPresetId={selectedPresetId}
                isLoading={isPresetsLoading || isPlaylistLoading}
                ungroupedPresets={ungroupedPresets}
                publicUngroupedPresets={publicUngroupedPresets}
                playlistGroups={playlistGroups}
                onSelect={handlePresetSelect}
              />
              <DropdownMenuSeparator />
            </>
          )}

          {mode === "scene" && (
            <>
              <SceneMenuSection
                currentSceneId={sceneId}
                currentSceneName={currentScene?.name}
                isAuthenticated={isAuthenticated}
                isLoading={isScenesLoading}
                myScenes={scenes}
                publicScenes={filteredPublicScenes}
                onSelect={handleSceneSelect}
              />
              <DropdownMenuSeparator />
            </>
          )}

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

          <DropdownMenuSeparator />

          {isAuthLoading ? (
            <DropdownMenuItem disabled>
              <User className="mr-2 h-4 w-4" />
              Loading...
            </DropdownMenuItem>
          ) : isAuthenticated ? (
            <>
              <DropdownMenuLabel className="font-normal">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user?.picture} alt={user?.name || "User"} />
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate">{user?.name}</span>
                    <span className="text-xs text-muted-foreground truncate">{user?.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuItem onClick={logout} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem
              onClick={() => login(typeof window !== "undefined" ? window.location.pathname : "/")}
              className="cursor-pointer"
            >
              <User className="mr-2 h-4 w-4" />
              Sign In
            </DropdownMenuItem>
          )}
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
