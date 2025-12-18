"use client";

import { BottomControlBar } from "./BottomControlBar";
import type { CameraMode } from "@/components/CameraSystem";
import type { AudioSourceType } from "@/hooks/useAudioSource";

interface UIOverlayProps {
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
  recordingError: string | null;
  onRecordToggle: () => void;
}

export function UIOverlay({
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
  recordingError,
  onRecordToggle,
}: UIOverlayProps) {
  return (
    <>
      {/* Bottom Control Bar */}
      <BottomControlBar
        currentCameraMode={currentCameraMode}
        onCameraModeChange={onCameraModeChange}
        isCameraTransitioning={isCameraTransitioning}
        isAudioConnected={isAudioConnected}
        audioSourceType={audioSourceType}
        canUseSystemAudio={canUseSystemAudio}
        onAudioConnect={onAudioConnect}
        onAudioDisconnect={onAudioDisconnect}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        onRecordToggle={onRecordToggle}
      />

      {/* Error Toast */}
      {recordingError && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-destructive text-destructive-foreground px-4 py-2 rounded-lg text-sm">
          {recordingError}
        </div>
      )}
    </>
  );
}
