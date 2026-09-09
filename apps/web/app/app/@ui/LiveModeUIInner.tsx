"use client";

import { useCallback } from "react";
import { BottomControlBar, TopControlBar } from "@/components/layout";
import { PermissionDialog } from "@/components/PermissionDialog";
import { MicPermissionDialog } from "@/components/MicPermissionDialog";
import { AudioConnectOverlay } from "@/components/audio/AudioConnectOverlay";
import { FirstLaunchGuide } from "@/components/dialogs/FirstLaunchGuide";
import { useCameraMode } from "@/components/CameraSystem";
import { useRecording } from "@/hooks/useRecording";
import { useAudioSource } from "@/hooks/useAudioSource";

export function LiveModeUIInner() {
  const cameraMode = useCameraMode();
  const audio = useAudioSource();

  const {
    isRecording,
    duration: recordingDuration,
    startRecording,
    stopRecording,
  } = useRecording();

  const handleRecordToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      const canvas = document.querySelector("canvas");
      const stream = audio.getStream();
      if (canvas && stream) {
        startRecording(canvas, stream);
      }
    }
  }, [isRecording, startRecording, stopRecording, audio]);

  return (
    <>
      <FirstLaunchGuide />

      <TopControlBar
        isAudioConnected={audio.isConnected}
        audioSourceType={audio.sourceType}
        canUseSystemAudio={audio.canUseSystemAudio}
        onAudioConnect={audio.connect}
        onAudioDisconnect={audio.disconnect}
        isRecording={isRecording}
        recordingDuration={recordingDuration}
        onRecordToggle={handleRecordToggle}
        recordDisabled={!audio.isConnected}
      />

      <BottomControlBar
        currentCameraMode={cameraMode.mode}
        onCameraModeChange={cameraMode.setMode}
        isCameraTransitioning={cameraMode.isTransitioning}
      />

      <AudioConnectOverlay isConnected={audio.isConnected} onConnect={audio.connect} />

      <PermissionDialog
        isOpen={audio.showPermissionDialog}
        onClose={audio.closePermissionDialog}
        onOpenSettings={audio.openScreenRecordingSettings}
      />
      <MicPermissionDialog
        isOpen={audio.showMicPermissionDialog}
        onClose={audio.closeMicPermissionDialog}
      />
    </>
  );
}
