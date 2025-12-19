"use client";

import { Mic, Volume2, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { AudioSourceType } from "@/hooks/useAudioSource";

interface AudioSourceButtonProps {
  isConnected: boolean;
  sourceType: AudioSourceType | null;
  canUseSystemAudio: boolean;
  onConnect: (sourceType: AudioSourceType) => void;
  onDisconnect: () => void;
}

export function AudioSourceButton({
  isConnected,
  sourceType,
  canUseSystemAudio,
  onConnect,
  onDisconnect,
}: AudioSourceButtonProps) {
  const handleClick = () => {
    if (isConnected) {
      onDisconnect();
    } else if (!canUseSystemAudio) {
      onConnect("microphone");
    }
  };

  const getIcon = () => {
    if (!isConnected) return <MicOff className="h-4 w-4" />;
    if (sourceType === "system") return <Volume2 className="h-4 w-4" />;
    return <Mic className="h-4 w-4" />;
  };

  const getTooltip = () => {
    if (!isConnected) return "Connect audio";
    if (sourceType === "system") return "System audio connected";
    return "Microphone connected";
  };

  const buttonContent = (
    <Button
      variant="ghost"
      size="icon"
      onClick={!canUseSystemAudio || isConnected ? handleClick : undefined}
      className={cn(
        "h-10 w-10 rounded-full transition-all duration-200",
        isConnected && sourceType === "system" && "bg-audio/20 text-audio hover:bg-audio/30",
        isConnected &&
          sourceType === "microphone" &&
          "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30",
        !isConnected && "text-muted-foreground hover:text-foreground"
      )}
    >
      {getIcon()}
    </Button>
  );

  if (canUseSystemAudio && !isConnected) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{buttonContent}</DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="min-w-[160px]">
          <DropdownMenuItem
            onClick={() => onConnect("microphone")}
            className="gap-2 cursor-pointer"
          >
            <Mic className="h-4 w-4 text-emerald-400" />
            <span>Microphone</span>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onConnect("system")} className="gap-2 cursor-pointer">
            <Volume2 className="h-4 w-4 text-audio" />
            <span>System Audio</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {getTooltip()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
