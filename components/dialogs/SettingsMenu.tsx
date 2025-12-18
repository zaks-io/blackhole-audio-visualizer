"use client";

import { Settings, Activity, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useUIState } from "@/hooks/useUIState";

export function SettingsMenu() {
  const { debugPanelsVisible, toggleDebugPanels, tweenPanelVisible, toggleTweenPanel } =
    useUIState();

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
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <Label htmlFor="tween-panel" className="text-sm">
                Property Tween
              </Label>
            </div>
            <Switch
              id="tween-panel"
              checked={tweenPanelVisible}
              onCheckedChange={toggleTweenPanel}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
