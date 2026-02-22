"use client";

import { useMemo, useEffect, useState, useCallback } from "react";
import { ScenePlayerControls } from "@/components/scene-player/ScenePlayerControls";
import { SceneInfoPanel } from "@/components/scene-player/SceneInfoPanel";
import { TopControlBar } from "@/components/layout";
import { useCameraMode, type CameraMode } from "@/components/CameraSystem";
import { useViewerMode } from "@/hooks/useViewerMode";
import { useUnifiedAudio } from "@/hooks/useUnifiedAudio";
import { useUnifiedPlayer } from "@/hooks/useUnifiedPlayer";
import { useSceneRecording } from "@/hooks/useSceneRecording";
import { useConvexScenes } from "@/hooks/useConvexScenes";
import type { PlaylistWithPresets } from "@/components/ProducerMode/types";
import { Preloaded, usePreloadedQuery, useQuery } from "convex/react";
import { api } from "@blackhole/backend/convex/_generated/api";

interface SceneModeUIClientProps {
  sceneId: string;
  preloadedScene: Preloaded<typeof api.model.scenes.public.getSceneWithDetailsPublic>;
}

export function SceneModeUIClient({ sceneId, preloadedScene }: SceneModeUIClientProps) {
  const setMode = useViewerMode((s) => s.setMode);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  // Sync URL to store
  useEffect(() => {
    setMode("scene", sceneId);
  }, [sceneId, setMode]);

  const cameraMode = useCameraMode();

  const scene = usePreloadedQuery(preloadedScene);

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
    playlist: scenePlaylist,
    audioUrl: scene?.audioUrl,
    loop: true,
    onCameraModeChange: (m) => cameraMode.setMode(m as CameraMode),
  });

  const audio = useUnifiedAudio({
    sceneAudioElement: scenePlayer.audioElement,
  });

  const sceneRecording = useSceneRecording({
    player: scenePlayer,
    getRecordingStream: audio.getRecordingStream,
  });

  const { triggerTranscription } = useConvexScenes();

  const transcription = useQuery(
    api.model.transcriptions.public.getBySong,
    scene?.song?._id ? { songId: scene.song._id } : "skip"
  );

  const handleRecordToggle = useCallback(() => {
    if (sceneRecording.isRecording) {
      sceneRecording.stopRecording();
    } else {
      sceneRecording.startRecording();
    }
  }, [sceneRecording]);

  const handleLoopToggle = useCallback(() => {
    scenePlayer.setLoop(!scenePlayer.loopEnabled);
  }, [scenePlayer]);

  const handleTranscribe = useCallback(() => {
    if (scene?.song?._id) {
      triggerTranscription(scene.song._id);
    }
  }, [scene, triggerTranscription]);

  // No loading overlays - Canvas continues to show while scene loads
  if (!scene) {
    return null;
  }

  const transcriptionStatus: "idle" | "processing" | "complete" =
    transcription?.status === "processing" ? "processing" : transcription ? "complete" : "idle";

  return (
    <>
      <TopControlBar
        isAudioConnected={false}
        audioSourceType={null}
        canUseSystemAudio={false}
        onAudioConnect={() => {}}
        onAudioDisconnect={() => {}}
        isRecording={sceneRecording.isRecording}
        recordingDuration={sceneRecording.duration}
        onRecordToggle={handleRecordToggle}
        recordDisabled={!scene.audioUrl || scene.song?.status === "generating"}
        loopEnabled={scenePlayer.loopEnabled}
        onLoopToggle={handleLoopToggle}
        onTranscribe={scene.song?._id ? handleTranscribe : undefined}
        transcriptionStatus={transcriptionStatus}
        onInfoClick={() => setIsInfoOpen(true)}
      />

      <ScenePlayerControls scene={scene} player={scenePlayer} />

      <SceneInfoPanel
        scene={scene}
        sectionTimings={scenePlayer.sectionTimings}
        currentSectionIndex={scenePlayer.state.currentSectionIndex}
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
      />
    </>
  );
}
