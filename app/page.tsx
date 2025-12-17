'use client';

import { Canvas } from '@react-three/fiber';
import { Leva } from 'leva';
import { BlackHoleSimulation } from '@/components/BlackHoleSimulation';

export default function Home() {
  return (
    <div className="w-screen h-screen">
      <Leva
        titleBar={{ title: 'Controls' }}
        theme={{ sizes: { rootWidth: '340px', controlWidth: '160px' } }}
      />
      <Canvas
        camera={{ position: [0, 30, 50], fov: 60 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <BlackHoleSimulation />
      </Canvas>
    </div>
  );
}
