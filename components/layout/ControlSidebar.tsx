"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { VisualizationControls } from "@/components/controls";
import { useUIState } from "@/hooks/useUIState";

export function ControlSidebar() {
  const { sidebarOpen, setSidebarOpen } = useUIState();

  return (
    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <SheetContent
        side="right"
        className="w-80 glass-panel-solid border-l border-border p-0 overflow-hidden"
      >
        <SheetHeader className="px-4 py-3 border-b border-border">
          <SheetTitle className="text-sm font-medium uppercase tracking-wider">Controls</SheetTitle>
        </SheetHeader>
        <div className="h-[calc(100vh-60px)] overflow-y-auto scrollbar-thin px-4 py-2">
          <VisualizationControls />
        </div>
      </SheetContent>
    </Sheet>
  );
}
