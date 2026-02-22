"use client";

import { Video, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface RecordButtonProps {
  isRecording: boolean;
  duration: number;
  disabled: boolean;
  onToggle: () => void;
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export function RecordButton({ isRecording, duration, disabled, onToggle }: RecordButtonProps) {
  const getTooltip = () => {
    if (disabled) return "Connect audio first";
    if (isRecording) return "Stop recording";
    return "Start recording";
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size={isRecording ? "default" : "icon"}
            onClick={onToggle}
            disabled={disabled}
            className={cn(
              "rounded-full transition-all duration-200",
              isRecording
                ? "h-10 px-4 bg-recording/20 text-recording hover:bg-recording/30 glow-recording"
                : "h-10 w-10",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            {isRecording ? (
              <div className="flex items-center gap-2">
                <Circle className="h-3 w-3 fill-current animate-pulse-recording" />
                <span className="font-mono text-xs tabular-nums">{formatDuration(duration)}</span>
              </div>
            ) : (
              <Video className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {getTooltip()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
