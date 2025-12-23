"use client";

import { useState } from "react";
import {
  MoreVertical,
  HelpCircle,
  User,
  LogOut,
  Gauge,
  Zap,
  ListMusic,
  Monitor,
  Mic,
  Wrench,
  ExternalLink,
  Radio,
  Film,
  Video,
} from "lucide-react";
import { useAuth0 } from "@auth0/auth0-react";
import { useConvexAuth } from "convex/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
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
  const { isAuthenticated, user, loginWithRedirect, logout } = useAuth0();
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

  const handleSignIn = () => {
    loginWithRedirect({
      appState: {
        returnTo: typeof window !== "undefined" ? window.location.pathname : "/",
      },
    });
  };

  const handleSignOut = () => {
    logout({ logoutParams: { returnTo: window.location.origin } });
  };

  const handlePresetSelect = (
    presetId: string | null,
    newMode: "none" | "preset" | "feeling-lucky"
  ) => {
    const switchingToLucky = newMode === "feeling-lucky";
    if (!switchingToLucky && isLuckyPlaying) {
      triggerStop();
    }
    // If we're already running Feeling Lucky and re-select it, don't kill tweens.
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
    router.push(`/app/scene/${id}`);
  };

  const handleCameraChange = (newMode: CameraMode) => {
    cameraMode.setMode(newMode);
  };

  // Filter out user's scenes from public list to avoid duplicates
  const userSceneIds = new Set(scenes.map((s) => s._id));
  const filteredPublicScenes = publicScenes.filter((s) => !userSceneIds.has(s._id));
  const currentScene = [...scenes, ...filteredPublicScenes].find((s) => s._id === sceneId);

  // Build preset groups (same logic as PresetSelector)
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

          {/* Live Mode Controls */}
          {mode === "live" && (
            <>
              {/* Camera Selection */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <Video className="mr-2 h-4 w-4" />
                  <span className="truncate">
                    {CAMERA_MODES.find((m) => m.id === cameraMode.mode)?.label ?? "Camera"}
                  </span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {CAMERA_MODES.map((m) => (
                    <DropdownMenuItem
                      key={m.id}
                      onClick={() => handleCameraChange(m.id)}
                      className={`cursor-pointer ${cameraMode.mode === m.id ? "bg-primary/20" : ""}`}
                    >
                      {m.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Preset Selection */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <ListMusic className="mr-2 h-4 w-4" />
                  <span className="truncate">{displayName}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="max-h-80 overflow-y-auto">
                  <DropdownMenuItem
                    onClick={() => handlePresetSelect(null, "feeling-lucky")}
                    className={`cursor-pointer ${presetMode === "feeling-lucky" ? "bg-primary/20" : ""}`}
                  >
                    ✨ I&apos;m Feeling Lucky
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handlePresetSelect(null, "none")}
                    className={`cursor-pointer ${presetMode === "none" ? "bg-primary/20" : ""}`}
                  >
                    None
                  </DropdownMenuItem>
                  {!isPresetsLoading && !isPlaylistLoading && (
                    <>
                      {ungroupedPresets.length > 0 && (
                        <>
                          <DropdownMenuSeparator />
                          {ungroupedPresets.map((p) => (
                            <DropdownMenuItem
                              key={p._id}
                              onClick={() => handlePresetSelect(p._id, "preset")}
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
                              onClick={() => handlePresetSelect(p!._id, "preset")}
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
                              onClick={() => handlePresetSelect(p._id, "preset")}
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

              <DropdownMenuSeparator />
            </>
          )}

          {/* Scene Mode Controls */}
          {mode === "scene" && (
            <>
              {/* Scene Selection */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="cursor-pointer">
                  <Film className="mr-2 h-4 w-4" />
                  <span className="truncate">{currentScene?.name ?? "Select Scene"}</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {!isScenesLoading && (scenes.length > 0 || filteredPublicScenes.length > 0) ? (
                    <>
                      {isAuthenticated && scenes.length > 0 && (
                        <>
                          <DropdownMenuLabel className="text-xs text-muted-foreground">
                            My Scenes
                          </DropdownMenuLabel>
                          {scenes.map((s) => (
                            <DropdownMenuItem
                              key={s._id}
                              onClick={() => handleSceneSelect(s._id)}
                              className={`cursor-pointer ${sceneId === s._id ? "bg-primary/20" : ""}`}
                            >
                              {s.name}
                            </DropdownMenuItem>
                          ))}
                          {filteredPublicScenes.length > 0 && <DropdownMenuSeparator />}
                        </>
                      )}
                      {filteredPublicScenes.length > 0 && (
                        <>
                          <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Public Scenes
                          </DropdownMenuLabel>
                          {filteredPublicScenes.map((s) => (
                            <DropdownMenuItem
                              key={s._id}
                              onClick={() => handleSceneSelect(s._id)}
                              className={`cursor-pointer ${sceneId === s._id ? "bg-primary/20" : ""}`}
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

              <DropdownMenuSeparator />
            </>
          )}

          {/* Settings */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">Settings</DropdownMenuLabel>
          <div className="px-2 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">FPS Meter</span>
            </div>
            <Switch checked={fpsVisible} onCheckedChange={toggleFPS} />
          </div>
          <div className="px-2 py-1.5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Bass Strobe</span>
            </div>
            <Switch checked={bassStrobeEnabled} onCheckedChange={toggleBassStrobe} />
          </div>

          <DropdownMenuSeparator />

          {/* Help */}
          <DropdownMenuItem onClick={() => setHelpOpen(true)} className="cursor-pointer">
            <HelpCircle className="mr-2 h-4 w-4" />
            Help
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* User */}
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
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem onClick={handleSignIn} className="cursor-pointer">
              <User className="mr-2 h-4 w-4" />
              Sign In
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Help Dialog */}
      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Getting Started</DialogTitle>
          </DialogHeader>
          <Separator />
          <div className="space-y-6">
            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center">
                <Monitor className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">
                  Desktop App <span className="text-cyan-400">(Recommended)</span>
                </h4>
                <p className="text-sm text-muted-foreground">
                  Captures system audio directly. Just play music and the visualizer reacts
                  automatically.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Mic className="h-4 w-4 text-purple-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Web & Mobile</h4>
                <p className="text-sm text-muted-foreground">
                  Uses your microphone to capture sound. Play music through your speakers or let it
                  pick up ambient audio around you.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                <Wrench className="h-4 w-4 text-orange-400" />
              </div>
              <div>
                <h4 className="text-sm font-medium mb-1">Advanced: BlackHole (macOS)</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Route system audio directly to your microphone input for high-quality capture on
                  web.
                </p>
                <a
                  href="https://existential.audio/blackhole/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Download BlackHole
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
