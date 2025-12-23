"use client";

import { X, SlidersHorizontal, Palette, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useProducerMode } from "./useProducerMode";
import { TweenSlider } from "./TweenSlider";
import { DurationPicker } from "./DurationPicker";
import { EasingPicker } from "./EasingPicker";
import { PresetControls } from "./PresetControls";
import { PlaylistTab } from "./PlaylistTab";
import { PRODUCER_PARAMETERS } from "./producerConfig";
import { PALETTE_IDS, PALETTES, type ColorPaletteId } from "@/components/ColorModeSystem";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";

export function ProducerModePanel() {
  // Use selectors to avoid re-renders from unrelated state changes
  const isOpen = useProducerMode((s) => s.isOpen);
  const setOpen = useProducerMode((s) => s.setOpen);
  const globalDuration = useProducerMode((s) => s.globalDuration);
  const globalEase = useProducerMode((s) => s.globalEase);
  const setGlobalDuration = useProducerMode((s) => s.setGlobalDuration);
  const setGlobalEase = useProducerMode((s) => s.setGlobalEase);
  const colorPalette = useVisualizationControls((s) => s.colorPalette);
  const setColorPalette = useVisualizationControls((s) => s.set);

  // Flatten all parameters from all groups
  const allParameters = PRODUCER_PARAMETERS.flatMap((group) => group.parameters);

  return (
    <div
      className={cn(
        "h-screen flex flex-col border-r border-white/10 glass-panel-solid",
        "transition-all duration-300 ease-out overflow-hidden",
        isOpen ? "w-80" : "w-0"
      )}
    >
      <div className="w-80 h-full flex flex-col min-w-80">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Preset Editor</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setOpen(false)}
            className="h-7 w-7 rounded-md hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="presets" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="px-3 shrink-0">
            <TabsTrigger value="presets">Presets</TabsTrigger>
            <TabsTrigger value="playlists">Playlists</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="flex flex-col">
            {/* Preset Controls */}
            <PresetControls />

            {/* Global settings */}
            <div className="px-3 py-2 border-b border-white/5 space-y-2">
              {/* Color Palette */}
              <div className="flex items-center gap-2">
                <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground flex-1">Palette</span>
                <Select
                  value={colorPalette}
                  onValueChange={(value) =>
                    setColorPalette("colorPalette", value as ColorPaletteId)
                  }
                >
                  <SelectTrigger size="sm" className="w-24 h-6 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PALETTE_IDS.map((id) => (
                      <SelectItem key={id} value={id} className="text-xs">
                        {PALETTES[id].name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Duration & Easing */}
              <div className="flex items-center gap-2">
                <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground flex-1">Timing</span>
                <div className="flex items-center gap-1">
                  <DurationPicker value={globalDuration} onChange={setGlobalDuration} />
                  <span className="text-xs text-muted-foreground/60 w-8">{globalDuration}s</span>
                  <EasingPicker value={globalEase} onChange={setGlobalEase} />
                </div>
              </div>
            </div>

            {/* Parameter list (flat) */}
            <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
              <div className="space-y-3">
                {allParameters.map((param) => (
                  <TweenSlider key={param.path} config={param} />
                ))}
              </div>
            </div>

            {/* Footer hint */}
            <div className="px-3 py-2 border-t border-white/5 shrink-0">
              <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                Drag sliders to set targets, then press play to animate.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="playlists" className="flex flex-col">
            <PlaylistTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
