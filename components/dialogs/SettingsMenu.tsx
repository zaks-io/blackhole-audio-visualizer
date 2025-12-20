"use client";

import { Settings, Gauge, Code, Zap, Video, Package, Download, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useUIState } from "@/hooks/useUIState";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { RecordingsManagerDialog } from "./RecordingsManagerDialog";
import { ReleasesManagerDialog } from "./ReleasesManagerDialog";
import { DownloadDialog } from "./DownloadDialog";

export function SettingsMenu() {
  const {
    fpsVisible,
    toggleFPS,
    devControlsVisible,
    toggleDevControls,
    bassStrobeEnabled,
    toggleBassStrobe,
  } = useUIState();
  const isAdmin = useIsAdmin();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Settings</h4>
          <Separator />
          {isAdmin && (
            <>
              <div className="flex items-center justify-between">
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
                <button className="flex items-center justify-between w-full text-left">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Recordings</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </RecordingsManagerDialog>
              <ReleasesManagerDialog>
                <button className="flex items-center justify-between w-full text-left">
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">Releases</span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              </ReleasesManagerDialog>
              <Separator />
            </>
          )}
          <DownloadDialog>
            <button className="flex items-center justify-between w-full text-left">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Download App</span>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </DownloadDialog>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="fps-meter" className="text-sm">
                FPS Meter
              </Label>
            </div>
            <Switch id="fps-meter" checked={fpsVisible} onCheckedChange={toggleFPS} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="bass-strobe" className="text-sm">
                Bass Strobe
              </Label>
            </div>
            <Switch
              id="bass-strobe"
              checked={bassStrobeEnabled}
              onCheckedChange={toggleBassStrobe}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
