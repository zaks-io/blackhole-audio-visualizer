"use client";

import { Mic, Volume2, Pause } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AudioSourceType } from "@/hooks/useAudioSource";

interface AudioSourceButtonProps {
  isConnected: boolean;
  isConnecting: boolean;
  sourceType: AudioSourceType;
  onToggle: () => void;
}

export function AudioSourceButton({
  isConnected,
  isConnecting,
  sourceType,
  onToggle,
}: AudioSourceButtonProps) {
  const Icon = isConnected ? Pause : sourceType === "system" ? Volume2 : Mic;
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={isConnecting ? "Connecting audio" : isConnected ? "Pause" : "Start"}
      aria-pressed={isConnected}
      disabled={isConnecting}
      onClick={onToggle}
      className={cn(
        "h-10 w-10 rounded-full transition-all duration-200",
        isConnected && sourceType === "system" && "bg-audio/20 text-audio hover:bg-audio/30",
        isConnected &&
          sourceType === "microphone" &&
          "bg-red-500/20 text-red-400 hover:bg-red-500/30"
      )}
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}
