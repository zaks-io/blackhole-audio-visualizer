"use client";

import { useRouter } from "next/navigation";
import { Radio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useViewerMode } from "@/hooks/useViewerMode";
import { cn } from "@/lib/utils";
import { SceneSelector } from "@/components/scenes";

export function ModeToggle() {
  const router = useRouter();
  const mode = useViewerMode((s) => s.mode);
  const setMode = useViewerMode((s) => s.setMode);

  const handleLiveClick = () => {
    if (mode === "live") return;
    setMode("live", null);
    router.push("/app");
  };

  return (
    <div className="flex items-center bg-background/30 rounded-full p-0.5">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLiveClick}
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

      {/* Scene dropdown (selecting navigates directly to /app/scene/:id) */}
      <SceneSelector variant="icon" />
    </div>
  );
}
