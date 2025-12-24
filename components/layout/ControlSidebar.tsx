"use client";

import { useState, type RefObject } from "react";
import { Settings, X } from "lucide-react";
import { useUIState } from "@/hooks/useUIState";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ParameterEditor } from "@/components/ParameterEditor";
import { AudioDebugTab } from "./AudioDebugTab";
import type { AnalyzedAudio } from "@/hooks/useAudioAnalyzer";

interface ControlSidebarProps {
  analysisRef?: RefObject<AnalyzedAudio | null>;
}

export function ControlSidebar({ analysisRef }: ControlSidebarProps) {
  const [activeTab, setActiveTab] = useState("controls");
  const setDevControlsVisible = useUIState((s) => s.setDevControlsVisible);

  return (
    <div className="h-screen w-80 flex flex-col border-l border-white/10 glass-panel-solid">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Settings className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Developer Controls</span>
        </div>
        <button
          onClick={() => setDevControlsVisible(false)}
          className="h-6 w-6 flex items-center justify-center rounded hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="flex-1 flex flex-col overflow-hidden"
      >
        <TabsList className="px-3 shrink-0">
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="audio">Audio</TabsTrigger>
        </TabsList>

        <TabsContent value="controls" className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin">
          <ParameterEditor mode="dev" />
        </TabsContent>

        <TabsContent value="audio" className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin">
          {analysisRef ? (
            <AudioDebugTab analysisRef={analysisRef} isVisible={activeTab === "audio"} />
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
