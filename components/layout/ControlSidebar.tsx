"use client";

import { X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VisualizationControls } from "@/components/controls";
import { useUIState } from "@/hooks/useUIState";

export function ControlSidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIState();

  return (
    <div
      className={cn(
        "h-screen flex flex-col border-l border-white/10 glass-panel-solid",
        "transition-all duration-300 ease-out overflow-hidden",
        sidebarOpen ? "w-80" : "w-0"
      )}
    >
      <div className="w-80 h-full flex flex-col min-w-80">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Controls</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="h-7 w-7 rounded-md hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Controls */}
        <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-thin">
          <VisualizationControls />
        </div>
      </div>
    </div>
  );
}
