"use client";

import { Settings } from "lucide-react";
import { VisualizationControls } from "@/components/controls";

export function ControlSidebar() {
  return (
    <div className="h-screen w-80 flex flex-col border-l border-white/10 glass-panel-solid">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
        <Settings className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Developer Controls</span>
      </div>

      {/* Controls */}
      <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin">
        <VisualizationControls />
      </div>
    </div>
  );
}
