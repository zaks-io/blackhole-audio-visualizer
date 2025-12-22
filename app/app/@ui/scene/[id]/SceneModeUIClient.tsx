"use client";

import { useMemo, useEffect } from "react";
import { ScenePlayerControls } from "@/components/scene-player/ScenePlayerControls";
import { TopToolbar } from "@/components/layout";
import { useCameraMode, type CameraMode } from "@/components/CameraSystem";
import { useViewerMode } from "@/hooks/useViewerMode";
import { useUnifiedAudio } from "@/hooks/useUnifiedAudio";
import { useUnifiedPlayer } from "@/hooks/useUnifiedPlayer";
import type { PlaylistWithPresets } from "@/components/ProducerMode/types";
import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

interface SceneModeUIClientProps {
  sceneId: string;
  preloadedScene: Preloaded<typeof api.model.scenes.public.getSceneWithDetailsPublic>;
}

export function SceneModeUIClient({ sceneId, preloadedScene }: SceneModeUIClientProps) {
  const setMode = useViewerMode((s) => s.setMode);

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

  // No loading overlays - Canvas continues to show while scene loads
  if (!scene) {
    // Fallback UI to confirm SSR is working even if data is missing/private
    return null;
  }

  return (
    <>
      <TopToolbar currentScene={scene} />

      <ScenePlayerControls
        scene={scene}
        player={scenePlayer}
        getRecordingStream={audio.getRecordingStream}
      />
    </>
  );
}
