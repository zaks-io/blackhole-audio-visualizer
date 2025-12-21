"use client";

import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { NoToneMapping, SRGBColorSpace } from "three";
import { PostProcessing } from "@/components/PostProcessing";
import { BlackHoleSimulation } from "@/components/BlackHoleSimulation";
import { FPSMeter } from "@/components/debug/FPSMeter";
import { FPSTracker } from "@/hooks/useFPSMonitor";
import { UIOverlay, ControlSidebar } from "@/components/layout";
import { ProducerModePanel } from "@/components/ProducerMode";
import { SceneEditorPanel } from "@/components/scenes";
import { PermissionDialog } from "@/components/PermissionDialog";
import { MicPermissionDialog } from "@/components/MicPermissionDialog";
import { AudioConnectOverlay } from "@/components/audio/AudioConnectOverlay";
import { useCameraMode } from "@/components/CameraSystem";
import { useColorMode } from "@/components/ColorModeSystem";
import { useAudioSource } from "@/hooks/useAudioSource";
import { useRecording } from "@/hooks/useRecording";
import { useUIState } from "@/hooks/useUIState";
import { useCameraPlaylist } from "@/hooks/useCameraPlaylist";
import { usePlaylistWithPresets } from "@/hooks/useConvexPlaylists";
import { usePlaylistControls } from "@/components/playlist/usePlaylistControls";
import type { Resolution } from "@/hooks/useUIState";

const RESOLUTIONS: Record<Exclude<Resolution, "auto">, { width: number; height: number }> = {
  "4k": { width: 3840, height: 2160 },
  "1080": { width: 1920, height: 1080 },
  "720": { width: 1280, height: 720 },
  "480": { width: 854, height: 480 },
};

export default function Home() {
  const {
    connect,
    disconnect,
    getAnalysis,
    isConnected,
    setOnsetDecay,
    getStream,
    sourceType,
    canUseSystemAudio,
    showPermissionDialog,
    closePermissionDialog,
    openScreenRecordingSettings,
    showMicPermissionDialog,
    closeMicPermissionDialog,
    analysisRef,
  } = useAudioSource();
  const { isRecording, duration, error, startRecording, stopRecording } = useRecording();
  const cameraMode = useCameraMode();
  const colorMode = useColorMode();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const { fpsVisible, devControlsVisible, resolution } = useUIState();
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

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
      // Container is wider - fit to height
      height = containerSize.height;
      width = containerSize.height * targetAspect;
    } else {
      // Container is taller - fit to width
      width = containerSize.width;
      height = containerSize.width / targetAspect;
    }

    // Calculate dpr needed to render at target resolution
    const dpr = resolutionConfig.width / width;

    return { displayWidth: width, displayHeight: height, effectiveDpr: dpr };
  }, [resolutionConfig, containerSize]);

  // Camera playlist integration
  const selectedPlaylistId = usePlaylistControls((s) => s.selectedPlaylistId);
  const shouldPlay = usePlaylistControls((s) => s.shouldPlay);
  const shouldStop = usePlaylistControls((s) => s.shouldStop);
  const { playlist } = usePlaylistWithPresets(selectedPlaylistId);

  const cameraPlaylist = useCameraPlaylist(
    playlist?.cameraPresets,
    playlist?.shuffle ?? false,
    playlist?.defaultCameraDuration,
    cameraMode.setMode
  );

  // Start camera cycling when visual playlist starts
  useEffect(() => {
    if (shouldPlay && playlist?.cameraPresets && playlist.cameraPresets.length > 0) {
      cameraPlaylist.start();
    }
  }, [shouldPlay, playlist?.cameraPresets, cameraPlaylist]);

  // Stop camera cycling when visual playlist stops
  useEffect(() => {
    if (shouldStop) {
      cameraPlaylist.stop();
    }
  }, [shouldStop, cameraPlaylist]);

  const handleRecordToggle = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      const canvas = canvasContainerRef.current?.querySelector("canvas");
      if (canvas) {
        startRecording(canvas, getStream());
      }
    }
  }, [isRecording, startRecording, stopRecording, getStream]);

  return (
    <div className="w-screen h-dvh grid grid-cols-[auto_1fr_auto_auto]">
      {/* Producer Mode Panel - pushes content from left */}
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
              getAnalysis={getAnalysis}
              isAudioConnected={isConnected}
              setOnsetDecay={setOnsetDecay}
              cameraMode={cameraMode}
              colorMode={colorMode}
              resolutionScale={effectiveDpr / 2}
            />
            <PostProcessing getAnalysis={getAnalysis} isAudioConnected={isConnected} />
            <FPSTracker />
          </Canvas>
        </div>

        {/* UI Overlay */}
        <UIOverlay
          currentCameraMode={cameraMode.mode}
          onCameraModeChange={cameraMode.setMode}
          isCameraTransitioning={cameraMode.isTransitioning}
          isAudioConnected={isConnected}
          audioSourceType={sourceType}
          canUseSystemAudio={canUseSystemAudio}
          onAudioConnect={connect}
          onAudioDisconnect={disconnect}
          isRecording={isRecording}
          recordingDuration={duration}
          recordingError={error}
          onRecordToggle={handleRecordToggle}
        />

        {/* Audio connect overlay - shown when not connected */}
        <AudioConnectOverlay isConnected={isConnected} onConnect={connect} />

        <PermissionDialog
          isOpen={showPermissionDialog}
          onClose={closePermissionDialog}
          onOpenSettings={openScreenRecordingSettings}
        />
        <MicPermissionDialog isOpen={showMicPermissionDialog} onClose={closeMicPermissionDialog} />

        {fpsVisible && <FPSMeter />}
      </div>

      {/* Scene Editor Panel - right side */}
      <SceneEditorPanel />

      {/* Control Sidebar - pushes content from right */}
      {devControlsVisible && <ControlSidebar analysisRef={analysisRef} />}
    </div>
  );
}
