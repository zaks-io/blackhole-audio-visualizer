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
  const prevModeRef = useRef<CameraMode | null>(null);
  const anglesRef = useRef({ horizontal: 0, vertical: Math.PI / 4 });
  const isSphericalModeRef = useRef(false);
  const sphericalParamsRef = useRef({ radius: 150, hSpeed: 0.5, vSpeed: 0.2 });
  const pendingAutoRotateRef = useRef<number | null>(null);

  useEffect(() => {
    if (mode === prevModeRef.current) return;
    const isInitialMount = prevModeRef.current === null;
    prevModeRef.current = mode;

    if (timelineRef.current) {
      timelineRef.current.kill();
      timelineRef.current = null;
    }

    const controls = controlsRef.current;

    if (mode === "free") {
      if (controls) controls.autoRotate = false;
      isSphericalModeRef.current = false;
      onTransitionComplete();
      return;
    }

    const preset = PRESETS[mode];
    const targetPos = preset.position;

    if (preset.rotateAxis === "spherical") {
      const radius = preset.orbitRadius ?? 150;
      sphericalParamsRef.current = {
        radius,
        hSpeed: preset.rotateSpeed,
        vSpeed: preset.verticalSpeed ?? 0.2,
      };
      if (controls) controls.autoRotate = false;

      const targetH = preset.startingAngles?.horizontal ?? 0;
      const targetV = preset.startingAngles?.vertical ?? Math.PI / 4;
      const phi = 0.3 + (Math.sin(targetV) + 1) * 1.25;
      const computedTarget = {
        x: radius * Math.sin(phi) * Math.sin(targetH),
        y: radius * Math.cos(phi),
        z: radius * Math.sin(phi) * Math.cos(targetH),
      };

      if (isInitialMount) {
        // Skip transition on initial mount - start orbiting immediately
        camera.position.set(computedTarget.x, computedTarget.y, computedTarget.z);
        camera.lookAt(0, 0, 0);
        anglesRef.current.horizontal = targetH;
        anglesRef.current.vertical = targetV;
        isSphericalModeRef.current = true;
        onTransitionComplete();
        return;
      }

      isSphericalModeRef.current = false;
      const currentPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };
      const currentAngles = { h: anglesRef.current.horizontal, v: anglesRef.current.vertical };

      const tl = gsap.timeline({
        onUpdate: () => {
          camera.position.set(currentPos.x, currentPos.y, currentPos.z);
          anglesRef.current.horizontal = currentAngles.h;
          anglesRef.current.vertical = currentAngles.v;
          camera.lookAt(0, 0, 0);
        },
        onComplete: () => {
          isSphericalModeRef.current = true;
          onTransitionComplete();
        },
      });

      tl.to(
        currentPos,
        {
          x: computedTarget.x,
          y: computedTarget.y,
          z: computedTarget.z,
          duration: 1.5,
          ease: "power2.inOut",
        },
        0
      );

      tl.to(
        currentAngles,
        {
          h: targetH,
          v: targetV,
          duration: 1.5,
          ease: "power2.inOut",
        },
        0
      );

      timelineRef.current = tl;
    } else {
      isSphericalModeRef.current = false;

      if (isInitialMount) {
        // Skip transition on initial mount - set position and start rotating immediately
        camera.position.set(targetPos[0], targetPos[1], targetPos[2]);
        camera.lookAt(0, 0, 0);
        pendingAutoRotateRef.current = preset.rotateSpeed;
        onTransitionComplete();
        return;
      }

      if (!controls) return;
      const currentPos = { x: camera.position.x, y: camera.position.y, z: camera.position.z };

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
    // Apply pending autoRotate when controls become available
    if (pendingAutoRotateRef.current !== null && controlsRef.current) {
      controlsRef.current.autoRotate = true;
      controlsRef.current.autoRotateSpeed = pendingAutoRotateRef.current;
      pendingAutoRotateRef.current = null;
    }

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
