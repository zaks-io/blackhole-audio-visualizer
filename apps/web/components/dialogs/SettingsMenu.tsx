"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Circle, Code, Gauge, HelpCircle, Monitor, Pin, Settings, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useUIState, type Resolution } from "@/hooks/useUIState";
import { HelpDialog } from "./HelpModal";

const RESOLUTION_LABELS: Record<Resolution, string> = {
  auto: "Fill",
  "4k": "4K (3840×2160)",
  "1080": "1080p (1920×1080)",
  "720": "720p (1280×720)",
  "480": "480p (854×480)",
};

interface SettingsMenuProps {
  isRecording: boolean;
  recordingDuration: number;
  onRecordToggle: () => void;
  recordDisabled?: boolean;
}

export function SettingsMenu({
  isRecording,
  recordingDuration,
  onRecordToggle,
  recordDisabled,
}: SettingsMenuProps) {
  const {
    fpsVisible,
    toggleFPS,
    devControlsVisible,
    toggleDevControls,
    bassStrobeEnabled,
    toggleBassStrobe,
    resolution,
    setResolution,
    alwaysOnTop,
    setAlwaysOnTop,
  } = useUIState();
  const isElectronApp = useSyncExternalStore(
    () => () => undefined,
    () => Boolean(window.electronAPI?.isElectron),
    () => false
  );

  useEffect(() => {
    if (isElectronApp) {
      window.electronAPI?.setAlwaysOnTop(alwaysOnTop);
    }
  }, [alwaysOnTop, isElectronApp]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Settings"
          className="h-10 w-10 rounded-full"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <h4 className="font-medium text-sm">Settings</h4>
        </div>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="dev-controls" className="text-sm">
              Developer Controls
            </Label>
          </div>
          <Switch
            id="dev-controls"
            checked={devControlsVisible}
            onCheckedChange={toggleDevControls}
          />
        </div>
        <button
          type="button"
          onClick={onRecordToggle}
          disabled={recordDisabled}
          className="flex items-center justify-between w-full text-left px-2 py-1.5 hover:bg-accent rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex items-center gap-2">
            <Circle
              className={`h-4 w-4 ${isRecording ? "text-red-500 fill-red-500" : "text-muted-foreground"}`}
            />
            <span className="text-sm">
              {isRecording
                ? `Recording ${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, "0")}`
                : "Start Recording"}
            </span>
          </div>
        </button>
        <HelpDialog>
          <button
            type="button"
            className="flex items-center justify-between w-full text-left px-2 py-1.5 hover:bg-accent rounded-sm"
          >
            <div className="flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Help</span>
            </div>
          </button>
        </HelpDialog>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Resolution</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={resolution}
              onValueChange={(value) => setResolution(value as Resolution)}
            >
              {(["auto", "4k", "1080", "720", "480"] as Resolution[]).map((key) => (
                <DropdownMenuRadioItem key={key} value={key}>
                  {RESOLUTION_LABELS[key]}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="fps-meter" className="text-sm">
              FPS Meter
            </Label>
          </div>
          <Switch id="fps-meter" checked={fpsVisible} onCheckedChange={toggleFPS} />
        </div>
        <div className="flex items-center justify-between px-2 py-1.5">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <Label htmlFor="bass-strobe" className="text-sm">
              Bass Strobe
            </Label>
          </div>
          <Switch id="bass-strobe" checked={bassStrobeEnabled} onCheckedChange={toggleBassStrobe} />
        </div>
        {isElectronApp ? (
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2">
              <Pin className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="always-on-top" className="text-sm">
                Always on top
              </Label>
            </div>
            <Switch id="always-on-top" checked={alwaysOnTop} onCheckedChange={setAlwaysOnTop} />
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
