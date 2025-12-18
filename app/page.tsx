'use client';

import { useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { Leva } from 'leva';
import { NoToneMapping, SRGBColorSpace } from 'three';
import { BlackHoleSimulation } from '@/components/BlackHoleSimulation';
import { MicToggleFab } from '@/components/MicToggleFab';
import { RecordToggleFab } from '@/components/RecordToggleFab';
import { CameraModeUI } from '@/components/CameraModeUI';
import { TweenControlPanel } from '@/components/TweenControlPanel';
import { useCameraMode } from '@/components/CameraSystem';
import { useColorMode } from '@/components/ColorModeSystem';
import { useMicrophone } from '@/hooks/useMicrophone';
import { useRecording } from '@/hooks/useRecording';

export default function Home() {
  const { connect, disconnect, getFrequencyData, isConnected, setOnsetDecay, getStream } = useMicrophone();
  const { isRecording, duration, error, startRecording, stopRecording } = useRecording();
  const cameraMode = useCameraMode();
  const colorMode = useColorMode();
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const handleMicToggle = () => {
    if (isConnected) {
      disconnect();
    } else {
      connect();
    }
  };

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
      <MicToggleFab isConnected={isConnected} onToggle={handleMicToggle} />
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
    </div>
  );
}
