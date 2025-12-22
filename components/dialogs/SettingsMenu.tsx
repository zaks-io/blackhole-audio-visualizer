"use client";

import {
  Settings,
  Gauge,
  Code,
  Zap,
  Video,
  Package,
  Download,
  ChevronRight,
  Monitor,
  Repeat,
  Circle,
  Subtitles,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useUIState, type Resolution } from "@/hooks/useUIState";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { RecordingsManagerDialog } from "./RecordingsManagerDialog";
import { ReleasesManagerDialog } from "./ReleasesManagerDialog";
import { DownloadDialog } from "./DownloadDialog";

const RESOLUTION_LABELS: Record<Resolution, string> = {
  auto: "Fill",
  "4k": "4K (3840×2160)",
  "1080": "1080p (1920×1080)",
  "720": "720p (1280×720)",
  "480": "480p (854×480)",
};

interface SettingsMenuProps {
  onInfoClick?: () => void;
  loopEnabled?: boolean;
  onLoopToggle?: () => void;
  isRecording?: boolean;
  recordingDuration?: number;
  onRecordToggle?: () => void;
  recordDisabled?: boolean;
  onTranscribe?: () => void;
  transcriptionStatus?: "idle" | "processing" | "complete";
}

export function SettingsMenu({
  onInfoClick,
  loopEnabled,
  onLoopToggle,
  isRecording,
  recordingDuration = 0,
  onRecordToggle,
  recordDisabled,
  onTranscribe,
  transcriptionStatus,
}: SettingsMenuProps = {}) {
  const {
    fpsVisible,
    toggleFPS,
    devControlsVisible,
    toggleDevControls,
    bassStrobeEnabled,
    toggleBassStrobe,
    resolution,
    setResolution,
  } = useUIState();
  const isAdmin = useIsAdmin();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <h4 className="font-medium text-sm">Settings</h4>
        </div>
        <DropdownMenuSeparator />
        {onInfoClick && (
          <button
            onClick={onInfoClick}
            className="flex items-center justify-between w-full text-left px-2 py-1.5 hover:bg-accent rounded-sm"
          >
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Scene Info</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
        {isAdmin && (
          <>
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
            <RecordingsManagerDialog>
              <button className="flex items-center justify-between w-full text-left px-2 py-1.5 hover:bg-accent rounded-sm">
                <div className="flex items-center gap-2">
                  <Video className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Recordings</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </RecordingsManagerDialog>
            <ReleasesManagerDialog>
              <button className="flex items-center justify-between w-full text-left px-2 py-1.5 hover:bg-accent rounded-sm">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">Releases</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </ReleasesManagerDialog>
            <DropdownMenuSeparator />
          </>
        )}
        <DownloadDialog>
          <button className="flex items-center justify-between w-full text-left px-2 py-1.5 hover:bg-accent rounded-sm">
            <div className="flex items-center gap-2">
              <Download className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Download App</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        </DownloadDialog>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Resolution</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup
              value={resolution}
              onValueChange={(v) => setResolution(v as Resolution)}
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

        {/* Scene-specific options */}
        {onLoopToggle !== undefined && (
          <>
            <DropdownMenuSeparator />
            <div className="flex items-center justify-between px-2 py-1.5">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="loop" className="text-sm">
                  Loop Playback
                </Label>
              </div>
              <Switch id="loop" checked={loopEnabled} onCheckedChange={onLoopToggle} />
            </div>
          </>
        )}

        {onRecordToggle !== undefined && isAdmin && (
          <button
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
        )}

        {onTranscribe !== undefined && isAdmin && (
          <button
            onClick={onTranscribe}
            disabled={transcriptionStatus === "processing"}
            className="flex items-center justify-between w-full text-left px-2 py-1.5 hover:bg-accent rounded-sm disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              <Subtitles className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {transcriptionStatus === "processing"
                  ? "Processing..."
                  : transcriptionStatus === "complete"
                    ? "Regenerate Transcript"
                    : "Generate Transcript"}
              </span>
            </div>
          </button>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
