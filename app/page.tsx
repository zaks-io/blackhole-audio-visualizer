'use client';

import { Canvas } from '@react-three/fiber';
import { Leva } from 'leva';
import { BlackHoleSimulation } from '@/components/BlackHoleSimulation';
import { MicToggleFab } from '@/components/MicToggleFab';
import { CameraModeUI } from '@/components/CameraModeUI';
import { useCameraMode } from '@/components/CameraSystem';
import { useMicrophone } from '@/hooks/useMicrophone';

export default function Home() {
  const { connect, getFrequencyData, isConnected, setOnsetDecay } = useMicrophone();
  const cameraMode = useCameraMode();

  const handleMicToggle = () => {
    if (!isConnected) {
      connect();
    }
  };

  return (
    <div className="w-screen h-screen">
      <Leva
        titleBar={{ title: 'Controls' }}
        theme={{ sizes: { rootWidth: '340px', controlWidth: '160px' } }}
      />
      <Canvas
        camera={{ position: [0, 90, 150], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <BlackHoleSimulation
          getFrequencyData={getFrequencyData}
          isAudioConnected={isConnected}
          setOnsetDecay={setOnsetDecay}
          cameraMode={cameraMode}
        />
      </Canvas>
      <MicToggleFab isConnected={isConnected} onToggle={handleMicToggle} />
      <CameraModeUI
        currentMode={cameraMode.mode}
        onModeChange={cameraMode.setMode}
        isTransitioning={cameraMode.isTransitioning}
      />
    </div>
  );
}
