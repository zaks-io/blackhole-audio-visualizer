'use client';

import { useRef, useCallback, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { Leva } from 'leva';
import { NoToneMapping, SRGBColorSpace } from 'three';
import { BlackHoleSimulation } from '@/components/BlackHoleSimulation';
import { MicToggleFab } from '@/components/MicToggleFab';
import { RecordToggleFab } from '@/components/RecordToggleFab';
import { CameraModeUI } from '@/components/CameraModeUI';
import { TweenControlPanel } from '@/components/TweenControlPanel';
import { AudioDebugPanel } from '@/components/AudioDebugPanel';
import { PermissionDialog } from '@/components/PermissionDialog';
import { useCameraMode } from '@/components/CameraSystem';
import { useColorMode } from '@/components/ColorModeSystem';
import { useAudioSource } from '@/hooks/useAudioSource';
import { useRecording } from '@/hooks/useRecording';
import { useAudioTriggers, type AudioTriggers } from '@/hooks/useAudioTriggers';
import { useAnimationModes, type AnimationModeId } from '@/hooks/useAnimationModes';

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

  const [triggers, setTriggers] = useState<AudioTriggers | null>(null);
  const [autoMode, setAutoMode] = useState(true);
  const animationFrameRef = useRef<number>(0);

  const handleParamsChange = useCallback(() => {
    // Params change handler for animation modes (will be wired to Leva later)
  }, []);

  const { setMode, getCurrentMode, availableModes, processTriggersForMode } = useAnimationModes({
    onParamsChange: handleParamsChange,
    autoMode,
  });

  // Process audio triggers in animation frame loop
  useEffect(() => {
    if (!isConnected) {
      setTriggers(null);
      return;
    }

    let lastTime = performance.now();

    const processFrame = () => {
      const now = performance.now();
      const audioData = getFrequencyData(36);
      const newTriggers = processAudio(audioData, now);
      setTriggers(newTriggers);
      processTriggersForMode(newTriggers, now);
      lastTime = now;
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
      const canvas = canvasContainerRef.current?.querySelector('canvas');
      if (canvas) {
        startRecording(canvas, getStream());
      }
    }
  }, [isRecording, startRecording, stopRecording, getStream]);

  return (
    <div className="w-screen h-screen">
      <Leva
        titleBar={{ title: 'Controls' }}
        theme={{ sizes: { rootWidth: '340px', controlWidth: '160px' } }}
      />
      <div ref={canvasContainerRef} className="w-full h-full">
        <Canvas
          camera={{ position: [0, 90, 150], fov: 60 }}
          gl={{
            antialias: true,
            alpha: false,
            preserveDrawingBuffer: true,
            powerPreference: 'high-performance',
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
        </Canvas>
      </div>
      <MicToggleFab
        isConnected={isConnected}
        sourceType={sourceType}
        canUseSystemAudio={canUseSystemAudio}
        onConnect={connect}
        onDisconnect={disconnect}
      />
      <RecordToggleFab
        isRecording={isRecording}
        duration={duration}
        disabled={!isConnected}
        onToggle={handleRecordToggle}
      />
      {error && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg">
          {error}
        </div>
      )}
      <CameraModeUI
        currentMode={cameraMode.mode}
        onModeChange={cameraMode.setMode}
        isTransitioning={cameraMode.isTransitioning}
      />
      <TweenControlPanel />
      <AudioDebugPanel
        triggers={triggers}
        currentMode={getCurrentMode()}
        onModeChange={setMode}
        availableModes={availableModes}
        autoMode={autoMode}
        onAutoModeChange={setAutoMode}
      />
      <PermissionDialog
        isOpen={showPermissionDialog}
        onClose={closePermissionDialog}
        onOpenSettings={openScreenRecordingSettings}
      />
    </div>
  );
}
