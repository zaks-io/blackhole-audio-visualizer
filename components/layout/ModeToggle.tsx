"use client";

import { useRouter } from "next/navigation";
import { Radio, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useViewerMode, type ViewerMode } from "@/hooks/useViewerMode";
import { cn } from "@/lib/utils";

export function ModeToggle() {
  const router = useRouter();
  const mode = useViewerMode((s) => s.mode);
  const setMode = useViewerMode((s) => s.setMode);

  const handleModeChange = (newMode: ViewerMode) => {
    if (newMode === mode) return;

    if (newMode === "live") {
      setMode("live", null);
      router.push("/app");
    } else {
      setMode("scene", null);
    }
  };

  return (
    <div className="flex items-center bg-background/30 rounded-full p-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleModeChange("live")}
            className={cn(
              "h-9 w-9 rounded-full transition-colors",
              mode === "live" && "bg-primary/20 text-primary"
            )}
          >
            <Radio className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Live Mode
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleModeChange("scene")}
            className={cn(
              "h-9 w-9 rounded-full transition-colors",
              mode === "scene" && "bg-primary/20 text-primary"
            )}
          >
            <Film className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          Scene Mode
        </TooltipContent>
      </Tooltip>
    </div>
  );
}
