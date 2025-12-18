"use client";

import { useRef, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import gsap from "gsap";
import { PRESETS } from "./cameraPresets";
import type { CameraMode } from "./types";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

interface CameraSystemProps {
  mode: CameraMode;
  isTransitioning: boolean;
  onTransitionComplete: () => void;
  timelineRef: React.MutableRefObject<gsap.core.Timeline | null>;
}

export function CameraSystem({ mode, onTransitionComplete, timelineRef }: CameraSystemProps) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const prevModeRef = useRef<CameraMode>(mode);
  const anglesRef = useRef({ horizontal: 0, vertical: Math.PI / 4 });
  const isSphericalModeRef = useRef(false);
  const sphericalParamsRef = useRef({ radius: 150, hSpeed: 0.5, vSpeed: 0.2 });

  useEffect(() => {
    if (mode === prevModeRef.current) return;
    prevModeRef.current = mode;

    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }

    const controls = controlsRef.current;
    if (!controls) return;

    if (mode === "free") {
      controls.autoRotate = false;
      isSphericalModeRef.current = false;
      onTransitionComplete();
      return;
    }

    const preset = PRESETS[mode];
    const targetPos = preset.position;
    const currentPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };

    if (preset.rotateAxis === "spherical") {
      isSphericalModeRef.current = true;
      sphericalParamsRef.current = {
        radius: preset.orbitRadius ?? 150,
        hSpeed: preset.rotateSpeed,
        vSpeed: preset.verticalSpeed ?? 0.2,
      };
      controls.autoRotate = false;

      const tl = gsap.timeline({
        onUpdate: () => {
          camera.position.set(currentPos.x, currentPos.y, currentPos.z);
          camera.lookAt(0, 0, 0);
        },
        onComplete: () => {
          const r = sphericalParamsRef.current.radius;
          const pos = camera.position;
          anglesRef.current.horizontal = Math.atan2(pos.x, pos.z);
          anglesRef.current.vertical = Math.acos(pos.y / r);
          onTransitionComplete();
        },
      });

      tl.to(currentPos, {
        x: targetPos[0],
        y: targetPos[1],
        z: targetPos[2],
        duration: 1.5,
        ease: "power2.inOut",
      });

      timelineRef.current = tl;
    } else {
      isSphericalModeRef.current = false;

      const tl = gsap.timeline({
        onUpdate: () => {
          camera.position.set(currentPos.x, currentPos.y, currentPos.z);
        },
        onComplete: () => {
          controls.autoRotate = true;
          controls.autoRotateSpeed = preset.rotateSpeed;
          onTransitionComplete();
        },
      });

      tl.to(currentPos, {
        x: targetPos[0],
        y: targetPos[1],
        z: targetPos[2],
        duration: 1.5,
        ease: "power2.inOut",
      });

      timelineRef.current = tl;
    }
  }, [mode, camera, onTransitionComplete, timelineRef]);

  useEffect(() => {
    return () => {
      if (timelineRef.current) {
        timelineRef.current.kill();
      }
    };
  }, [timelineRef]);

  useFrame((_, delta) => {
    if (isSphericalModeRef.current && mode !== "free") {
      const { radius, hSpeed, vSpeed } = sphericalParamsRef.current;

      anglesRef.current.horizontal += delta * hSpeed;
      anglesRef.current.vertical += delta * vSpeed;

      const theta = anglesRef.current.horizontal;
      // Oscillate phi between 0.3 and 2.8 (avoids poles) using sine wave
      const phi = 0.3 + (Math.sin(anglesRef.current.vertical) + 1) * 1.25;

      const x = radius * Math.sin(phi) * Math.sin(theta);
      const y = radius * Math.cos(phi);
      const z = radius * Math.sin(phi) * Math.cos(theta);

      camera.position.set(x, y, z);
      camera.lookAt(0, 0, 0);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={5}
      maxDistance={500}
      autoRotate={false}
      autoRotateSpeed={2}
    />
  );
}
