"use client";

import type { RefObject } from "react";
import { Settings } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { VisualizationControls } from "@/components/controls";
import { AudioDebugTab } from "./AudioDebugTab";
import type { AnalyzedAudio } from "@/hooks/useAudioAnalyzer";

interface ControlSidebarProps {
  analysisRef?: RefObject<AnalyzedAudio | null>;
}

export function ControlSidebar({ analysisRef }: ControlSidebarProps) {
  return (
    <div className="h-screen w-80 flex flex-col border-l border-white/10 glass-panel-solid">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <Settings className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Developer Controls</span>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="controls" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="px-3 shrink-0">
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="audio">Audio</TabsTrigger>
        </TabsList>

        <TabsContent value="controls" className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin">
          <VisualizationControls />
        </TabsContent>

        <TabsContent value="audio" className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin">
          {analysisRef ? (
            <AudioDebugTab analysisRef={analysisRef} />
          ) : (
            <div className="text-xs text-muted-foreground text-center py-8">
              Connect audio to see analysis
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
