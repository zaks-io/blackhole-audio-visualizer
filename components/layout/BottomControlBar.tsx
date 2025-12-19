"use client";

import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CameraControls } from "@/components/camera";
import { AudioSourceButton } from "@/components/audio";
import { RecordButton } from "@/components/recording";
import { SettingsMenu } from "@/components/dialogs";
import { UserMenu } from "@/components/auth/UserMenu";
import { useProducerMode } from "@/components/ProducerMode";
import { cn } from "@/lib/utils";
import type { CameraMode } from "@/components/CameraSystem";
import type { AudioSourceType } from "@/hooks/useAudioSource";

interface BottomControlBarProps {
  // Camera props
  currentCameraMode: CameraMode;
  onCameraModeChange: (mode: CameraMode) => void;
  isCameraTransitioning: boolean;
  // Audio props
  isAudioConnected: boolean;
  audioSourceType: AudioSourceType | null;
  canUseSystemAudio: boolean;
  onAudioConnect: (sourceType: AudioSourceType) => void;
  onAudioDisconnect: () => void;
  // Recording props
  isRecording: boolean;
  recordingDuration: number;
  onRecordToggle: () => void;
}

export function BottomControlBar({
  currentCameraMode,
  onCameraModeChange,
  isCameraTransitioning,
  isAudioConnected,
  audioSourceType,
  canUseSystemAudio,
  onAudioConnect,
  onAudioDisconnect,
  isRecording,
  recordingDuration,
  onRecordToggle,
}: BottomControlBarProps) {
  const { isOpen: isProducerModeOpen, toggleOpen: toggleProducerMode } = useProducerMode();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 pointer-events-none">
      <div className="glass-panel rounded-full px-4 py-2 flex items-center gap-2 pointer-events-auto">
        {/* Producer Mode Toggle */}
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleProducerMode}
                className={cn(
                  "h-10 w-10 rounded-full",
                  isProducerModeOpen && "bg-primary/20 text-primary"
                )}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Producer Mode
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <Separator orientation="vertical" className="h-6 mx-2" />

        {/* Camera Controls */}
        <CameraControls
          currentMode={currentCameraMode}
          onModeChange={onCameraModeChange}
          isTransitioning={isCameraTransitioning}
        />

        <Separator orientation="vertical" className="h-6 mx-2" />

        {/* Audio & Recording */}
        <div className="flex items-center gap-1">
          <AudioSourceButton
            isConnected={isAudioConnected}
            sourceType={audioSourceType}
            canUseSystemAudio={canUseSystemAudio}
            onConnect={onAudioConnect}
            onDisconnect={onAudioDisconnect}
          />
          <RecordButton
            isRecording={isRecording}
            duration={recordingDuration}
            disabled={!isAudioConnected}
            onToggle={onRecordToggle}
          />
        </div>

        <Separator orientation="vertical" className="h-6 mx-2" />

        {/* Settings */}
        <SettingsMenu />

        <Separator orientation="vertical" className="h-6 mx-2" />

        {/* User Menu */}
        <UserMenu />
      </div>
    </div>
  );
}
