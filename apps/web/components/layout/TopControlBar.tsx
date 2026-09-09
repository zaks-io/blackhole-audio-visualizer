"use client";

import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import { AudioSourceButton } from "@/components/audio";
import { SettingsMenu } from "@/components/dialogs";
import { useProducerMode } from "@/components/ProducerMode";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { AudioSourceType } from "@/hooks/useAudioSource";
import { useUIState } from "@/hooks/useUIState";
import { cn } from "@/lib/utils";
import { MobileOverflowMenu } from "./MobileOverflowMenu";

interface TopControlBarProps {
  isAudioConnected: boolean;
  audioSourceType: AudioSourceType | null;
  canUseSystemAudio: boolean;
  onAudioConnect: (sourceType: AudioSourceType) => void;
  onAudioDisconnect: () => void;
  isRecording: boolean;
  recordingDuration: number;
  onRecordToggle: () => void;
  recordDisabled?: boolean;
}

export function TopControlBar({
  isAudioConnected,
  audioSourceType,
  canUseSystemAudio,
  onAudioConnect,
  onAudioDisconnect,
  isRecording,
  recordingDuration,
  onRecordToggle,
  recordDisabled,
}: TopControlBarProps) {
  const isProducerModeOpen = useProducerMode((state) => state.isOpen);
  const toggleProducerMode = useProducerMode((state) => state.toggleOpen);
  const setProducerModeOpen = useProducerMode((state) => state.setOpen);
  const { controlBarCollapsed, setControlBarCollapsed, setDevControlsVisible } = useUIState();

  const hideControls = () => {
    setProducerModeOpen(false);
    setDevControlsVisible(false);
    setControlBarCollapsed(true);
  };

  return (
    <>
      <div
        className={cn(
          "fixed top-0 left-0 right-0 z-50 flex justify-center pt-6 pointer-events-none transition-all duration-300 ease-out",
          controlBarCollapsed && "opacity-0 -translate-y-full"
        )}
      >
        <div
          className={cn(
            "glass-panel rounded-full px-2 sm:px-4 py-2 flex items-center gap-1 sm:gap-2",
            !controlBarCollapsed && "pointer-events-auto"
          )}
        >
          <div className="hidden md:block">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleProducerMode}
                    aria-label="Preset editor"
                    className={cn(
                      "h-10 w-10 rounded-full",
                      isProducerModeOpen && "bg-primary/20 text-primary"
                    )}
                  >
                    <SlidersHorizontal className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Preset Editor
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <Separator orientation="vertical" className="hidden md:block h-6 mx-1 sm:mx-2" />
          <AudioSourceButton
            isConnected={isAudioConnected}
            sourceType={audioSourceType}
            canUseSystemAudio={canUseSystemAudio}
            onConnect={onAudioConnect}
            onDisconnect={onAudioDisconnect}
          />
          <MobileOverflowMenu />
          <Separator orientation="vertical" className="hidden sm:block h-6 mx-1 sm:mx-2" />

          <div className="hidden md:block">
            <SettingsMenu
              isRecording={isRecording}
              recordingDuration={recordingDuration}
              onRecordToggle={onRecordToggle}
              recordDisabled={recordDisabled}
            />
          </div>

          <Separator orientation="vertical" className="hidden md:block h-6 mx-1 sm:mx-2" />
          <div className="hidden md:block">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={hideControls}
                    aria-label="Hide controls"
                    className="h-10 w-10 rounded-full"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Hide Controls
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "fixed top-6 right-6 z-50 transition-all duration-300 ease-out",
          controlBarCollapsed
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4 pointer-events-none"
        )}
      >
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={() => setControlBarCollapsed(false)}
                aria-label="Show controls"
                className="glass-panel h-12 w-12 rounded-full p-0"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              Show Controls
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </>
  );
}
