"use client";

import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useProducerMode } from "./useProducerMode";
import { PresetControls } from "./PresetControls";
import { PlaylistTab } from "./PlaylistTab";
import { ParameterEditor } from "@/components/ParameterEditor";

export function ProducerModePanel() {
  const isOpen = useProducerMode((s) => s.isOpen);
  const setOpen = useProducerMode((s) => s.setOpen);

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

            {/* Parameter Editor */}
            <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
              <ParameterEditor mode="preset" />
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
