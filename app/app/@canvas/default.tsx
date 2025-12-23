"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { NoToneMapping, SRGBColorSpace } from "three";
import { PostProcessing } from "@/components/PostProcessing";
import { BlackHoleSimulation } from "@/components/BlackHoleSimulation";
import { FPSMeter } from "@/components/debug/FPSMeter";
import { FPSTracker } from "@/hooks/useFPSMonitor";
import { ControlSidebar } from "@/components/layout";
import { ProducerModePanel } from "@/components/ProducerMode";
import { SceneEditorPanel } from "@/components/scenes";
import { useCameraMode, type CameraMode } from "@/components/CameraSystem";
import { useColorMode } from "@/components/ColorModeSystem";
import { useUIState } from "@/hooks/useUIState";
import { useViewerMode } from "@/hooks/useViewerMode";
import { useUnifiedAudio } from "@/hooks/useUnifiedAudio";
import { usePublicSceneWithDetails } from "@/hooks/useConvexScenes";
import { useUnifiedPlayer } from "@/hooks/useUnifiedPlayer";
import type { Resolution } from "@/hooks/useUIState";
import type { PlaylistWithPresets } from "@/components/ProducerMode/types";

const RESOLUTIONS: Record<Exclude<Resolution, "auto">, { width: number; height: number }> = {
  "4k": { width: 3840, height: 2160 },
  "1080": { width: 1920, height: 1080 },
  "720": { width: 1280, height: 720 },
  "480": { width: 854, height: 480 },
};

export default function CanvasSlot() {
  const mode = useViewerMode((s) => s.mode);
  const sceneId = useViewerMode((s) => s.sceneId);

  // Scene data (only fetched when sceneId is present)
  const { scene } = usePublicSceneWithDetails(sceneId ?? "");

  const cameraMode = useCameraMode();
  const colorMode = useColorMode();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const { fpsVisible, devControlsVisible, resolution } = useUIState();
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Build playlist for scene player
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

  // Scene player (only active when in scene mode)
  const scenePlayer = useUnifiedPlayer({
    playlist: mode === "scene" ? scenePlaylist : null,
    audioUrl: mode === "scene" ? scene?.audioUrl : null,
    loop: true,
    onCameraModeChange: (m) => cameraMode.setMode(m as CameraMode),
  });

  // Unified audio hook
  const audio = useUnifiedAudio({
    sceneAudioElement: scenePlayer.audioElement,
  });

  // Resolution configuration
  const resolutionConfig = useMemo(
    () => (resolution !== "auto" ? RESOLUTIONS[resolution] : null),
    [resolution]
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateSize = () => {
      setContainerSize({ width: container.clientWidth, height: container.clientHeight });
    };

    updateSize();

    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  const { displayWidth, displayHeight, effectiveDpr } = useMemo(() => {
    if (!resolutionConfig || containerSize.width === 0) {
      return { displayWidth: undefined, displayHeight: undefined, effectiveDpr: 2 };
    }

    const containerAspect = containerSize.width / containerSize.height;
    const targetAspect = resolutionConfig.width / resolutionConfig.height;

    let width: number;
    let height: number;

    if (containerAspect > targetAspect) {
      height = containerSize.height;
      width = containerSize.height * targetAspect;
    } else {
      width = containerSize.width;
      height = containerSize.width / targetAspect;
    }

    const dpr = resolutionConfig.width / width;

    return { displayWidth: width, displayHeight: height, effectiveDpr: dpr };
  }, [resolutionConfig, containerSize]);

  return (
    <div className="absolute inset-0 grid grid-cols-[auto_1fr_auto_auto]">
      {/* Preset Editor Panel - available in all modes */}
      <ProducerModePanel />

      {/* Main content area */}
      <div
        ref={containerRef}
        className="relative w-full h-full min-w-0 min-h-0 overflow-hidden flex items-center justify-center"
      >
        <div
          ref={canvasContainerRef}
          className={resolutionConfig ? "" : "w-full h-full"}
          style={
            resolutionConfig
              ? {
                  width: `${displayWidth}px`,
                  height: `${displayHeight}px`,
                }
              : undefined
          }
        >
          <Canvas
            key={resolution}
            camera={{ position: [0, 90, 150], fov: 60 }}
            gl={{
              antialias: true,
              alpha: false,
              preserveDrawingBuffer: true,
              powerPreference: "high-performance",
            }}
            dpr={effectiveDpr}
            onCreated={({ gl }) => {
              gl.toneMapping = NoToneMapping;
              gl.outputColorSpace = SRGBColorSpace;
            }}
          >
            <BlackHoleSimulation
              getAnalysis={audio.getAnalysis}
              isAudioConnected={audio.isConnected}
              setOnsetDecay={audio.setOnsetDecay}
              cameraMode={cameraMode}
              colorMode={colorMode}
              resolutionScale={effectiveDpr / 2}
            />
            <PostProcessing getAnalysis={audio.getAnalysis} isAudioConnected={audio.isConnected} />
            <FPSTracker />
          </Canvas>
        </div>

        {fpsVisible && <FPSMeter />}
      </div>

      {/* Scene Editor Panel */}
      <SceneEditorPanel sceneId={sceneId ?? undefined} />

      {/* Control Sidebar */}
      {devControlsVisible && <ControlSidebar analysisRef={audio.analysisRef} />}
    </div>
  );
}
