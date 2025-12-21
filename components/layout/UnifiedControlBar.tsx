"use client";

import { type RefObject } from "react";
import { useViewerMode } from "@/hooks/useViewerMode";
import { BottomControlBar } from "./BottomControlBar";
import { ScenePlayerControls } from "@/components/scene-player/ScenePlayerControls";
import type { AudioSourceType } from "@/hooks/useAudioSource";
import type { useUnifiedPlayer } from "@/hooks/useUnifiedPlayer";
import type { SceneWithDetails } from "@/hooks/useConvexScenes";

interface LiveModeProps {
  isAudioConnected: boolean;
  audioSourceType: AudioSourceType | null;
  canUseSystemAudio: boolean;
  onAudioConnect: (sourceType: AudioSourceType) => void;
  onAudioDisconnect: () => void;
  isRecording: boolean;
  recordingDuration: number;
  onRecordToggle: () => void;
}

interface SceneModeProps {
  scene: SceneWithDetails | null;
  player: ReturnType<typeof useUnifiedPlayer> | null;
  canvasRef: RefObject<HTMLDivElement | null>;
  getRecordingStream: () => MediaStream | null;
}

interface UnifiedControlBarProps {
  liveProps: LiveModeProps;
  sceneProps: SceneModeProps;
}

export function UnifiedControlBar({ liveProps, sceneProps }: UnifiedControlBarProps) {
  const mode = useViewerMode((s) => s.mode);

  if (mode === "scene" && sceneProps.scene && sceneProps.player) {
    return (
      <ScenePlayerControls
        scene={sceneProps.scene}
        player={sceneProps.player}
        canvasRef={sceneProps.canvasRef}
        getRecordingStream={sceneProps.getRecordingStream}
      />
    );
  }

  return (
    <BottomControlBar
      isAudioConnected={liveProps.isAudioConnected}
      audioSourceType={liveProps.audioSourceType}
      canUseSystemAudio={liveProps.canUseSystemAudio}
      onAudioConnect={liveProps.onAudioConnect}
      onAudioDisconnect={liveProps.onAudioDisconnect}
      isRecording={liveProps.isRecording}
      recordingDuration={liveProps.recordingDuration}
      onRecordToggle={liveProps.onRecordToggle}
    />
  );
}
