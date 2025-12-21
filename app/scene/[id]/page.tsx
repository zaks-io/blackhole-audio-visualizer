"use client";

import { use, useMemo, useRef, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { NoToneMapping, SRGBColorSpace } from "three";
import { PostProcessing } from "@/components/PostProcessing";
import { BlackHoleSimulation } from "@/components/BlackHoleSimulation";
import { FPSTracker } from "@/hooks/useFPSMonitor";
import { useCameraMode } from "@/components/CameraSystem";
import { useColorMode } from "@/components/ColorModeSystem";
import { usePublicSceneWithDetails } from "@/hooks/useConvexScenes";
import { useUnifiedPlayer } from "@/hooks/useUnifiedPlayer";
import { useAudioElementAnalyzer } from "@/hooks/useAudioElementAnalyzer";
import { ScenePlayerControls } from "@/components/scene-player/ScenePlayerControls";
import type { PlaylistWithPresets } from "@/components/ProducerMode/types";
import { Loader2 } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

function SceneNotFound() {
  return (
    <div className="w-screen h-dvh flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-2">Scene Not Found</h1>
        <p className="text-muted-foreground">
          This scene does not exist or you do not have access to view it.
        </p>
      </div>
    </div>
  );
}

function SceneLoading() {
  return (
    <div className="w-screen h-dvh flex items-center justify-center bg-black text-white">
      <div className="flex items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin" />
        <span>Loading scene...</span>
      </div>
    </div>
  );
}

function SongGenerating() {
  return (
    <div className="w-screen h-dvh flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">Song is being generated</h1>
        <p className="text-muted-foreground">Please wait while the audio is being created...</p>
      </div>
    </div>
  );
}

function ScenePlayerContent({ sceneId }: { sceneId: string }) {
  const { scene, isLoading } = usePublicSceneWithDetails(sceneId);
  const cameraMode = useCameraMode();
  const colorMode = useColorMode();
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const lastElementRef = useRef<HTMLAudioElement | null>(null);

  const playlist: PlaylistWithPresets | null = useMemo(() => {
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

  const player = useUnifiedPlayer({
    playlist,
    audioUrl: scene?.audioUrl,
    loop: false,
  });

  // Poll for audio element changes when playing
  useEffect(() => {
    const checkElement = () => {
      const el = player.state.isPlaying ? player.getAudioElement() : null;
      if (el !== lastElementRef.current) {
        lastElementRef.current = el;
        setAudioElement(el);
      }
    };

    const interval = setInterval(checkElement, 50);
    checkElement();
    return () => clearInterval(interval);
  }, [player.state.isPlaying, player]);

  const { getAnalysis, isConnected } = useAudioElementAnalyzer(audioElement);

  if (isLoading) {
    return <SceneLoading />;
  }

  if (!scene) {
    return <SceneNotFound />;
  }

  if (scene.song?.status === "generating") {
    return <SongGenerating />;
  }

  return (
    <div className="w-screen h-dvh flex flex-col bg-black">
      <div className="flex-1 relative">
        <Canvas
          camera={{ position: [0, 90, 150], fov: 60 }}
          gl={{
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: true,
            powerPreference: "high-performance",
          }}
          dpr={2}
          onCreated={({ gl }) => {
            gl.toneMapping = NoToneMapping;
            gl.outputColorSpace = SRGBColorSpace;
          }}
        >
          <BlackHoleSimulation
            getAnalysis={getAnalysis}
            isAudioConnected={isConnected()}
            setOnsetDecay={() => {}}
            cameraMode={cameraMode}
            colorMode={colorMode}
            resolutionScale={1}
          />
          <PostProcessing getAnalysis={getAnalysis} isAudioConnected={isConnected()} />
          <FPSTracker />
        </Canvas>
      </div>

      <ScenePlayerControls scene={scene} player={player} />
    </div>
  );
}

export default function ScenePlayerPage({ params }: PageProps) {
  const { id } = use(params);
  return <ScenePlayerContent sceneId={id} />;
}
