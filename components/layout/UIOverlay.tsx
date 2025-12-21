"use client";

import { BottomControlBar } from "./BottomControlBar";
import type { AudioSourceType } from "@/hooks/useAudioSource";

interface UIOverlayProps {
  isAudioConnected: boolean;
  audioSourceType: AudioSourceType | null;
  canUseSystemAudio: boolean;
  onAudioConnect: (sourceType: AudioSourceType) => void;
  onAudioDisconnect: () => void;
  isRecording: boolean;
  recordingDuration: number;
  recordingError: string | null;
  onRecordToggle: () => void;
}

export function UIOverlay({
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
