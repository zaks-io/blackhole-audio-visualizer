"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import gsap from "gsap";
import { PRESETS } from "./cameraPresets";
import type { CameraMode } from "./types";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

interface OrbitState {
  theta: number;
  radius: number;
  phi: number;
  horizontalSpeed: number;
  oscillationPhase: number;
  oscillationAmplitude: number;
  oscillationSpeed: number;
}

interface CameraSystemProps {
  mode: CameraMode;
  isTransitioning: boolean;
  onTransitionComplete: () => void;
  timelineRef: React.MutableRefObject<gsap.core.Timeline | null>;
}

export function CameraSystem({ mode, onTransitionComplete, timelineRef }: CameraSystemProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const prevModeRef = useRef<CameraMode | null>(null);
  const isOrbitingRef = useRef(true);

  const orbitStateRef = useRef<OrbitState>({
    theta: 0,
    radius: 220,
    phi: 1.2,
    horizontalSpeed: 0.15,
    oscillationPhase: 0,
    oscillationAmplitude: 0,
    oscillationSpeed: 0,
  });

  useEffect(() => {
    if (mode === prevModeRef.current) return;
    const isInitialMount = prevModeRef.current === null;
    const wasFreeMode = prevModeRef.current === "free";
    prevModeRef.current = mode;

    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }

    if (mode === "free") {
      isOrbitingRef.current = false;
      if (controlsRef.current) {
        controlsRef.current.enabled = true;
      }
      onTransitionComplete();
      return;
    }

    const preset = PRESETS[mode];
    const state = orbitStateRef.current;

    if (wasFreeMode) {
      state.theta = Math.atan2(camera.position.x, camera.position.z);
    }

    const setCameraFromState = () => {
      const phi = state.phi + Math.sin(state.oscillationPhase) * state.oscillationAmplitude;
      const x = state.radius * Math.sin(phi) * Math.sin(state.theta);
      const y = state.radius * Math.cos(phi);
      const z = state.radius * Math.sin(phi) * Math.cos(state.theta);
      camera.position.set(x, y, z);
      camera.lookAt(0, 0, 0);
    };

    if (isInitialMount) {
      state.radius = preset.radius;
      state.phi = preset.phi;
      state.horizontalSpeed = preset.horizontalSpeed;
      state.oscillationAmplitude = preset.verticalOscillation?.amplitude ?? 0;
      state.oscillationSpeed = preset.verticalOscillation?.speed ?? 0;

      isOrbitingRef.current = true;
      setCameraFromState();
      onTransitionComplete();
      return;
    }

    if (controlsRef.current) {
      controlsRef.current.enabled = false;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        onTransitionComplete();
      },
    });

    tl.to(state, {
      radius: preset.radius,
      phi: preset.phi,
      horizontalSpeed: preset.horizontalSpeed,
      oscillationAmplitude: preset.verticalOscillation?.amplitude ?? 0,
      oscillationSpeed: preset.verticalOscillation?.speed ?? 0,
      duration: 1.5,
      ease: "power2.inOut",
    });

    isOrbitingRef.current = true;
    timelineRef.current = tl;
  }, [mode, camera, onTransitionComplete, timelineRef]);

  useEffect(() => {
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [timelineRef]);

  useFrame((_, delta) => {
    if (!isOrbitingRef.current) return;

    const state = orbitStateRef.current;

    state.theta += delta * state.horizontalSpeed;

    if (state.oscillationSpeed > 0) {
      state.oscillationPhase += delta * state.oscillationSpeed;
    }

    const phi = state.phi + Math.sin(state.oscillationPhase) * state.oscillationAmplitude;
    const x = state.radius * Math.sin(phi) * Math.sin(state.theta);
    const y = state.radius * Math.cos(phi);
    const z = state.radius * Math.sin(phi) * Math.cos(state.theta);
    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={5}
      maxDistance={500}
      enabled={mode === "free"}
    />
  );
}
