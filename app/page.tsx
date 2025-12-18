"use client";

import { useRef, useCallback, useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { NoToneMapping, SRGBColorSpace } from "three";
import { BlackHoleSimulation } from "@/components/BlackHoleSimulation";
import { FPSMeter } from "@/components/debug/FPSMeter";
import { FPSTracker } from "@/hooks/useFPSMonitor";
import { UIOverlay } from "@/components/layout";
import { TweenControlPanel } from "@/components/TweenControlPanel";
import { AudioDebugPanel } from "@/components/AudioDebugPanel";
import { PermissionDialog } from "@/components/PermissionDialog";
import { useCameraMode } from "@/components/CameraSystem";
import { useColorMode } from "@/components/ColorModeSystem";
import { useAudioSource } from "@/hooks/useAudioSource";
import { useRecording } from "@/hooks/useRecording";
import { useAudioTriggers, type AudioTriggers } from "@/hooks/useAudioTriggers";
import { useAnimationModes } from "@/hooks/useAnimationModes";
import { useUIState } from "@/hooks/useUIState";

export default function Home() {
  const {
    connect,
    disconnect,
    getFrequencyData,
    isConnected,
    setOnsetDecay,
    getStream,
    sourceType,
    canUseSystemAudio,
    showPermissionDialog,
    closePermissionDialog,
    openScreenRecordingSettings,
  } = useAudioSource();
  const { isRecording, duration, error, startRecording, stopRecording } = useRecording();
  const { processAudio, reset: resetTriggers } = useAudioTriggers();
  const cameraMode = useCameraMode();
  const colorMode = useColorMode();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const { debugPanelsVisible, tweenPanelVisible, fpsVisible } = useUIState();

  const [triggers, setTriggers] = useState<AudioTriggers | null>(null);
  const [autoMode, setAutoMode] = useState(true);
  const animationFrameRef = useRef<number>(0);

  const handleParamsChange = useCallback(() => {
    // Params change handler for animation modes
  }, []);

  const { setMode, getCurrentMode, availableModes, processTriggersForMode } = useAnimationModes({
    onParamsChange: handleParamsChange,
    autoMode,
  });

  // Process audio triggers in animation frame loop
  useEffect(() => {
    if (!isConnected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Cleanup on disconnect
      setTriggers(null);
      return;
    }

    const processFrame = () => {
      const now = performance.now();
      const audioData = getFrequencyData(36);
      const newTriggers = processAudio(audioData, now);
      setTriggers(newTriggers);
      processTriggersForMode(newTriggers, now);
      animationFrameRef.current = requestAnimationFrame(processFrame);
    };

    animationFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isConnected, getFrequencyData, processAudio, processTriggersForMode]);

  // Reset triggers when disconnecting
  useEffect(() => {
    if (!isConnected) {
      resetTriggers();
    }
  }, [isConnected, resetTriggers]);

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
    <div className="w-screen h-screen">
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
            getFrequencyData={getFrequencyData}
            isAudioConnected={isConnected}
            setOnsetDecay={setOnsetDecay}
            cameraMode={cameraMode}
            colorMode={colorMode}
          />
          <FPSTracker />
        </Canvas>
      </div>

      {/* New UI Overlay */}
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

      {/* Debug panels - conditionally rendered */}
      {tweenPanelVisible && (
        <div className="fixed left-6 bottom-24 z-40">
          <TweenControlPanel />
        </div>
      )}

      {debugPanelsVisible && (
        <div className="fixed left-6 top-6 z-40">
          <AudioDebugPanel
            triggers={triggers}
            currentMode={getCurrentMode()}
            onModeChange={setMode}
            availableModes={availableModes}
            autoMode={autoMode}
            onAutoModeChange={setAutoMode}
          />
        </div>
      )}

      <PermissionDialog
        isOpen={showPermissionDialog}
        onClose={closePermissionDialog}
        onOpenSettings={openScreenRecordingSettings}
      />

      {fpsVisible && <FPSMeter />}
    </div>
  );
}
