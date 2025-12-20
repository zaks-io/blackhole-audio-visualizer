"use client";

import { SlidersHorizontal, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CameraControls } from "@/components/camera";
import { PlaylistControls } from "@/components/playlist";
import { AudioSourceButton } from "@/components/audio";
import { RecordButton } from "@/components/recording";
import { HelpModal, SettingsMenu } from "@/components/dialogs";
import { UserMenu } from "@/components/auth/UserMenu";
import { useProducerMode } from "@/components/ProducerMode";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useUIState } from "@/hooks/useUIState";
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
  const {
    isOpen: isProducerModeOpen,
    toggleOpen: toggleProducerMode,
    setOpen: setProducerModeOpen,
  } = useProducerMode();
  const isAdmin = useIsAdmin();
  const { controlBarCollapsed, setControlBarCollapsed, setDevControlsVisible } = useUIState();

  const handleHideControls = () => {
    setProducerModeOpen(false);
    setDevControlsVisible(false);
    setControlBarCollapsed(true);
  };

  const handleShowControls = () => {
    setControlBarCollapsed(false);
  };

  return (
    <>
      {/* Main Control Bar */}
      <div
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-6 pointer-events-none transition-all duration-300 ease-out",
          controlBarCollapsed && "opacity-0 translate-x-full"
        )}
      >
        <div
          className={cn(
            "glass-panel rounded-full px-4 py-2 flex items-center gap-2",
            !controlBarCollapsed && "pointer-events-auto"
          )}
        >
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

          {/* Playlist Controls */}
          <PlaylistControls />

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
            {isAdmin && (
              <RecordButton
                isRecording={isRecording}
                duration={recordingDuration}
                disabled={!isAudioConnected}
                onToggle={onRecordToggle}
              />
            )}
          </div>

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* Settings & Help */}
          <SettingsMenu />
          <HelpModal />

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* User Menu */}
          <UserMenu />

          <Separator orientation="vertical" className="h-6 mx-2" />

          {/* Collapse Button */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleHideControls}
                  className="h-10 w-10 rounded-full"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Hide Controls
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Collapsed FAB */}
      <div
        className={cn(
          "fixed bottom-6 right-6 z-50 transition-all duration-300 ease-out",
          controlBarCollapsed
            ? "opacity-100 translate-x-0"
            : "opacity-0 translate-x-4 pointer-events-none"
        )}
      >
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                onClick={handleShowControls}
                className="glass-panel h-12 w-12 rounded-full p-0"
              >
                <ChevronRight className="h-5 w-5" />
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
