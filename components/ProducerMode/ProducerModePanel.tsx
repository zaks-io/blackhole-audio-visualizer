"use client";

import { X, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useProducerMode } from "./useProducerMode";
import { ParameterGroup } from "./ParameterGroup";
import { PRODUCER_PARAMETERS } from "./producerConfig";

export function ProducerModePanel() {
  const { isOpen, setOpen } = useProducerMode();

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
            <span className="text-sm font-medium">Producer Mode</span>
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

        {/* Parameter groups */}
        <div className="flex-1 overflow-y-auto px-3 py-2 scrollbar-thin">
          {PRODUCER_PARAMETERS.map((group) => (
            <ParameterGroup key={group.name} group={group} />
          ))}
        </div>

        {/* Footer hint */}
        <div className="px-4 py-3 border-t border-white/5">
          <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
            Drag sliders to set target values, then press play to animate. Multiple parameters can
            tween simultaneously.
          </p>
        </div>
      </div>
    </div>
  );
}
