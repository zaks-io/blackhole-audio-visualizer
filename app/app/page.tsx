"use client";

import { useRef, useCallback } from "react";
import { Canvas } from "@react-three/fiber";
import { NoToneMapping, SRGBColorSpace } from "three";
import { PostProcessing } from "@/components/PostProcessing";
import { BlackHoleSimulation } from "@/components/BlackHoleSimulation";
import { FPSMeter } from "@/components/debug/FPSMeter";
import { FPSTracker } from "@/hooks/useFPSMonitor";
import { UIOverlay, ControlSidebar } from "@/components/layout";
import { ProducerModePanel } from "@/components/ProducerMode";
import { AudioAnalysisDebug } from "@/components/AudioAnalysisDebug";
import { PermissionDialog } from "@/components/PermissionDialog";
import { MicPermissionDialog } from "@/components/MicPermissionDialog";
import { AudioConnectOverlay } from "@/components/audio/AudioConnectOverlay";
import { useCameraMode } from "@/components/CameraSystem";
import { useColorMode } from "@/components/ColorModeSystem";
import { useAudioSource } from "@/hooks/useAudioSource";
import { useRecording } from "@/hooks/useRecording";
import { useUIState } from "@/hooks/useUIState";

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
  const { debugPanelsVisible, fpsVisible, devControlsVisible } = useUIState();

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
    <div className="w-screen h-dvh grid grid-cols-[auto_1fr_auto]">
      {/* Producer Mode Panel - pushes content from left */}
      <ProducerModePanel />

      {/* Main content area */}
      <div className="relative w-full h-full min-w-0 min-h-0 overflow-hidden">
        <div ref={canvasContainerRef} className="w-full h-full">
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
              isAudioConnected={isConnected}
              setOnsetDecay={setOnsetDecay}
              cameraMode={cameraMode}
              colorMode={colorMode}
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

        {/* Debug panels - conditionally rendered */}
        {debugPanelsVisible && <AudioAnalysisDebug analysisRef={analysisRef} />}

        <PermissionDialog
          isOpen={showPermissionDialog}
          onClose={closePermissionDialog}
          onOpenSettings={openScreenRecordingSettings}
        />
        <MicPermissionDialog isOpen={showMicPermissionDialog} onClose={closeMicPermissionDialog} />

        {fpsVisible && <FPSMeter />}
      </div>

      {/* Control Sidebar - pushes content from right */}
      {devControlsVisible && <ControlSidebar />}
    </div>
  );
}
