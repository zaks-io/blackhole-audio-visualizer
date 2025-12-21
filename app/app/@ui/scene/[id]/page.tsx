"use client";

import { use, useRef, useMemo, useEffect } from "react";
import { ScenePlayerControls } from "@/components/scene-player/ScenePlayerControls";
import { useCameraMode, type CameraMode } from "@/components/CameraSystem";
import { useViewerMode } from "@/hooks/useViewerMode";
import { useUnifiedAudio } from "@/hooks/useUnifiedAudio";
import { usePublicSceneWithDetails } from "@/hooks/useConvexScenes";
import { useUnifiedPlayer } from "@/hooks/useUnifiedPlayer";
import type { PlaylistWithPresets } from "@/components/ProducerMode/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function SceneModeUI({ params }: PageProps) {
  const { id: sceneId } = use(params);
  const setMode = useViewerMode((s) => s.setMode);

  // Sync URL to store
  useEffect(() => {
    setMode("scene", sceneId);
  }, [sceneId, setMode]);

  const cameraMode = useCameraMode();
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const { scene } = usePublicSceneWithDetails(sceneId);

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

  // No loading overlays - Canvas continues to show while scene loads
  if (!scene) {
    return null;
  }

  return (
    <ScenePlayerControls
      scene={scene}
      player={scenePlayer}
      canvasRef={canvasContainerRef}
      getRecordingStream={audio.getRecordingStream}
    />
  );
}
