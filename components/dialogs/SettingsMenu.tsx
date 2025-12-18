"use client";

import { Settings, Activity, Gauge, Code } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useUIState } from "@/hooks/useUIState";

export function SettingsMenu() {
  const {
    debugPanelsVisible,
    toggleDebugPanels,
    fpsVisible,
    toggleFPS,
    devControlsVisible,
    toggleDevControls,
  } = useUIState();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
          <Settings className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56">
        <div className="space-y-4">
          <h4 className="font-medium text-sm">Debug Panels</h4>
          <Separator />
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="audio-debug" className="text-sm">
                Audio Debug
              </Label>
            </div>
            <Switch
              id="audio-debug"
              checked={debugPanelsVisible}
              onCheckedChange={toggleDebugPanels}
            />
          </div>
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
        </div>
      </PopoverContent>
    </Popover>
  );
}
