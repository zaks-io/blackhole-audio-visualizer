"use client";

import { useCallback } from "react";
import { TopControlBar } from "@/components/layout";
import { PermissionDialog } from "@/components/PermissionDialog";
import { MicPermissionDialog } from "@/components/MicPermissionDialog";
import { FirstLaunchGuide } from "@/components/dialogs/FirstLaunchGuide";
import { useRecording } from "@/hooks/useRecording";
import { useAudioSource } from "@/hooks/useAudioSource";

export function LiveModeUIInner() {
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
