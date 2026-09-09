"use client";

import { useRef, useState, useEffect, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { NoToneMapping, SRGBColorSpace } from "three";
import { useShallow } from "zustand/shallow";
import dynamic from "next/dynamic";
import { PostProcessing } from "@/components/PostProcessing";
import { BlackHoleSimulation } from "@/components/BlackHoleSimulation";
import { FPSTracker } from "@/hooks/useFPSMonitor";

const ProducerModePanel = dynamic(
  () =>
    import("@/components/ProducerMode/ProducerModePanel").then((m) => ({
      default: m.ProducerModePanel,
    })),
  { ssr: false }
);

const ControlSidebar = dynamic(
  () =>
    import("@/components/layout/ControlSidebar").then((m) => ({
      default: m.ControlSidebar,
    })),
  { ssr: false }
);

const FPSMeter = dynamic(
  () =>
    import("@/components/debug/FPSMeter").then((m) => ({
      default: m.FPSMeter,
    })),
  { ssr: false }
);
import { useCameraMode } from "@/components/CameraSystem";
import { useColorMode } from "@/components/ColorModeSystem";
import { useUIState } from "@/hooks/useUIState";
import { useAudioSource } from "@/hooks/useAudioSource";
import { isElectron } from "@/lib/platform";
import type { Resolution } from "@/hooks/useUIState";

// HACK: +1 pixel on each dimension to ensure recorded video meets target resolution after encoding
const RESOLUTIONS: Record<Exclude<Resolution, "auto">, { width: number; height: number }> = {
  "4k": { width: 3841, height: 2161 },
  "1080": { width: 1921, height: 1081 },
  "720": { width: 1281, height: 721 },
  "480": { width: 855, height: 481 },
};

export default function CanvasSlot() {
  const cameraMode = useCameraMode();
  const colorMode = useColorMode();
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const { fpsVisible, devControlsVisible, resolution } = useUIState(
    useShallow((s) => ({
      fpsVisible: s.fpsVisible,
      devControlsVisible: s.devControlsVisible,
      resolution: s.resolution,
    }))
  );
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [recoveryKey, setRecoveryKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Perf/bisection flags (URL-driven so we can test prod + Electron builds)
  const perfFlags = useMemo(() => {
    if (typeof window === "undefined") {
      return { noPostFX: false, noStars: false, noHistory: false, desktopAdvancedParticles: false };
    }
    const params = new URLSearchParams(window.location.search);
    const electronApp = isElectron();
    return {
      noPostFX: params.has("noPostFX"),
      noStars: params.has("noStars"),
      noHistory: params.has("noHistory"),
      desktopAdvancedParticles: params.has("desktopAdvancedParticles")
        ? params.get("desktopAdvancedParticles") !== "0"
        : electronApp,
    };
  }, []);

  const audio = useAudioSource();

  const isAudioActive = audio.isConnected;

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
            key={`${resolution}-${recoveryKey}`}
            camera={{ position: [0, 90, 150], fov: 60 }}
            gl={{
              antialias: true,
              alpha: false,
              preserveDrawingBuffer: false,
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
              isAudioConnected={isAudioActive}
              setOnsetDecay={audio.setOnsetDecay}
              cameraMode={cameraMode}
              colorMode={colorMode}
              resolutionScale={effectiveDpr / 2}
              perfFlags={perfFlags}
              onGPUError={() => setRecoveryKey((k) => k + 1)}
            />
            {!perfFlags.noPostFX && (
              <PostProcessing getAnalysis={audio.getAnalysis} isAudioConnected={isAudioActive} />
            )}
            <FPSTracker />
          </Canvas>
        </div>

        {fpsVisible && <FPSMeter />}
      </div>

      {/* Control Sidebar */}
      {devControlsVisible && <ControlSidebar analysisRef={audio.analysisRef} />}
    </div>
  );
}
