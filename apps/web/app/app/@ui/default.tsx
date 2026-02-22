"use client";

import { useCallback, useMemo, useEffect } from "react";
import { BottomControlBar, TopControlBar } from "@/components/layout";
import { PermissionDialog } from "@/components/PermissionDialog";
import { MicPermissionDialog } from "@/components/MicPermissionDialog";
import { AudioConnectOverlay } from "@/components/audio/AudioConnectOverlay";
import { useCameraMode, type CameraMode } from "@/components/CameraSystem";
import { useRecording } from "@/hooks/useRecording";
import { useViewerMode } from "@/hooks/useViewerMode";
import { useUnifiedAudio } from "@/hooks/useUnifiedAudio";
import { usePublicSceneWithDetails } from "@/hooks/useConvexScenes";
import { useUnifiedPlayer } from "@/hooks/useUnifiedPlayer";
import type { PlaylistWithPresets } from "@/components/ProducerMode/types";

export default function LiveModeUI() {
  const mode = useViewerMode((s) => s.mode);
  const sceneId = useViewerMode((s) => s.sceneId);
  const setMode = useViewerMode((s) => s.setMode);

  // Sync URL on mount for live mode
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.pathname === "/app") {
      setMode("live", null);
    }
  }, [setMode]);

  const cameraMode = useCameraMode();

  // Scene data for audio
  const { scene } = usePublicSceneWithDetails(sceneId ?? "");

  const scenePlaylist: PlaylistWithPresets | null = useMemo(() => {
    if (!scene?.playlist) return null;
    return {
      _id: scene.playlist._id,
      userId: scene.userId,
      name: scene.playlist.name,
      items: scene.playlist.items,
      shuffle: false,
      defaultWaitDuration: 10,
      isPublic: false,
      updatedAt: 0,
      presets: scene.playlist.presets as PlaylistWithPresets["presets"],
    };
  }, [scene]);

  const scenePlayer = useUnifiedPlayer({
    playlist: mode === "scene" ? scenePlaylist : null,
    audioUrl: mode === "scene" ? scene?.audioUrl : null,
    loop: true,
    onCameraModeChange: (m) => cameraMode.setMode(m as CameraMode),
  });

  const audio = useUnifiedAudio({
    sceneAudioElement: scenePlayer.audioElement,
  });

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
      const stream = audio.getRecordingStream();
      if (canvas && stream) {
        startRecording(canvas, stream);
      }
    }
  }, [isRecording, startRecording, stopRecording, audio]);

  return (
    <>
      <TopControlBar
        isAudioConnected={audio.isConnected}
        audioSourceType={audio.liveSourceType}
        canUseSystemAudio={audio.canUseSystemAudio}
        onAudioConnect={audio.connectLive}
        onAudioDisconnect={audio.disconnectLive}
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

      {/* Hide when scene mode with no scene selected (showing centered selector) */}
      {!(mode === "scene" && !sceneId) && (
        <AudioConnectOverlay isConnected={audio.isConnected} onConnect={audio.connectLive} />
      )}

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
