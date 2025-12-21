"use client";

import { use, useMemo, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { NoToneMapping, SRGBColorSpace } from "three";
import { PostProcessing } from "@/components/PostProcessing";
import { BlackHoleSimulation } from "@/components/BlackHoleSimulation";
import { FPSTracker } from "@/hooks/useFPSMonitor";
import { FPSMeter } from "@/components/debug/FPSMeter";
import { useCameraMode, type CameraMode } from "@/components/CameraSystem";
import { useColorMode } from "@/components/ColorModeSystem";
import { usePublicSceneWithDetails } from "@/hooks/useConvexScenes";
import { useUnifiedPlayer } from "@/hooks/useUnifiedPlayer";
import { useAudioElementAnalyzer } from "@/hooks/useAudioElementAnalyzer";
import { useUIState } from "@/hooks/useUIState";
import { ScenePlayerControls } from "@/components/scene-player/ScenePlayerControls";
import { ControlSidebar } from "@/components/layout/ControlSidebar";
import { SceneEditorPanel } from "@/components/scenes/SceneEditorPanel";
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

function SongGeneratingOverlay() {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="text-center text-white">
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
  const { devControlsVisible, fpsVisible } = useUIState();

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
    loop: true,
    onCameraModeChange: (mode) => cameraMode.setMode(mode as CameraMode),
  });

  // Always connect analyzer so recording stream is available when needed
  const { getAnalysis, isConnected, getRecordingStream } = useAudioElementAnalyzer(
    player.audioElement
  );

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  if (isLoading) {
    return <SceneLoading />;
  }

  if (!scene) {
    return <SceneNotFound />;
  }

  return (
    <div className="w-screen h-dvh bg-black grid grid-cols-[1fr_auto_auto]">
      {/* Main canvas - takes full screen */}
      <div
        ref={canvasContainerRef}
        className="relative w-full h-full min-w-0 min-h-0 overflow-hidden flex items-center justify-center"
      >
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

        {/* Floating controls - inside canvas div like main app */}
        <ScenePlayerControls
          scene={scene}
          player={player}
          canvasRef={canvasContainerRef}
          getRecordingStream={getRecordingStream}
        />

        {/* Song generation overlay */}
        {scene.song?.status === "generating" && <SongGeneratingOverlay />}

        {fpsVisible && <FPSMeter />}
      </div>

      {/* Scene Editor Panel */}
      <SceneEditorPanel sceneId={sceneId} />

      {/* Developer controls sidebar */}
      {devControlsVisible && <ControlSidebar />}
    </div>
  );
}

export default function ScenePlayerPage({ params }: PageProps) {
  const { id } = use(params);
  return <ScenePlayerContent sceneId={id} />;
}
