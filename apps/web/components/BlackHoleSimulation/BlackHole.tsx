"use client";

import type { MutableRefObject } from "react";
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import { runtimeState } from "@/lib/runtimeStateRegistry";

export interface BlackHoleData {
  positions: THREE.Vector3[];
  masses: number[];
  radii: number[];
  baseRadii: number[];
  count: number;
}

interface BlackHoleProps {
  blackHoleDataRef: MutableRefObject<BlackHoleData | null>;
  index: number;
}

const coronaVertexShader = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const coronaFragmentShader = /* glsl */ `
  varying vec3 vWorldPosition;
  varying vec3 vWorldNormal;

  uniform vec3 uGlowColor;
  uniform float uGlowIntensity;
  uniform float uFresnelPower;
  uniform vec3 uBaseColor;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    vec3 normal = normalize(vWorldNormal);
    float fresnel = pow(1.0 - abs(dot(viewDir, normal)), uFresnelPower);
    vec3 color = uBaseColor + uGlowColor * fresnel * uGlowIntensity;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function BlackHole({ blackHoleDataRef, index }: BlackHoleProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const smoothedScaleRef = useRef<number>(0);

  const uniforms = useMemo(
    () => ({
      uGlowColor: { value: new THREE.Color(0.6, 0.6, 0.65) },
      uGlowIntensity: { value: 0.8 },
      uFresnelPower: { value: 2.0 },
      uBaseColor: { value: new THREE.Color(0, 0, 0) },
    }),
    []
  );

  useFrame((_, delta) => {
    if (!meshRef.current || !blackHoleDataRef.current || !materialRef.current) return;

    const bhData = blackHoleDataRef.current;
    const { coronaEnabled, coronaIntensity, coronaPower } = useVisualizationControls.getState();

    if (index >= bhData.count) {
      meshRef.current.visible = false;
      smoothedScaleRef.current = 0;
      return;
    }

    // When corona is disabled, set intensity to 0 (renders as solid black sphere)
    materialRef.current.uniforms.uGlowIntensity.value = coronaEnabled ? coronaIntensity : 0;
    materialRef.current.uniforms.uFresnelPower.value = coronaPower;
    materialRef.current.uniforms.uBaseColor.value.setScalar(runtimeState.whiteBlackHole);

    meshRef.current.visible = true;
    meshRef.current.position.copy(bhData.positions[index]);

    // Smooth layout-driven size changes, but apply the beat pulse unsmoothed so it lands on the hit
    const baseRadius = bhData.baseRadii[index];
    const lerpFactor = 1 - Math.exp(-12 * delta);
    smoothedScaleRef.current += (baseRadius - smoothedScaleRef.current) * lerpFactor;
    const pulse = baseRadius > 0 ? bhData.radii[index] / baseRadius : 1;
    meshRef.current.scale.setScalar(smoothedScaleRef.current * pulse);
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[1, 32, 32]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={coronaVertexShader}
        fragmentShader={coronaFragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}
