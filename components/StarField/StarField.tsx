"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const SPHERE_RADIUS = 500;

const vertexShader = `
attribute float aTemperature;
attribute float aSize;

uniform float uBeatIntensity;
uniform float uSizeBoost;

varying float vTemp;
varying float vPointSize;

void main() {
  vTemp = aTemperature;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float beatSize = 1.0 + uBeatIntensity * uSizeBoost;
  float size = aSize * beatSize * (400.0 / -mvPosition.z);
  gl_PointSize = clamp(size, 6.0, 80.0);
  vPointSize = gl_PointSize;
}
`;

const fragmentShader = `
varying float vTemp;
varying float vPointSize;

uniform float uBrightnessBoost;

void main() {
  float dist = length(gl_PointCoord - 0.5) * 2.0;

  // Soft Gaussian that fills the point - key to avoiding aliasing
  float alpha = exp(-dist * dist * 3.0);

  // Brighter core for point-like appearance
  float core = exp(-dist * dist * 12.0);
  alpha = alpha * 0.4 + core * 0.6;

  // Very soft edge fade
  alpha *= smoothstep(1.0, 0.5, dist);

  if (alpha < 0.01) discard;

  // Temperature to color
  float t = clamp((vTemp - 3000.0) / 9000.0, 0.0, 1.0);

  vec3 warmColor = vec3(1.0, 0.7, 0.4);
  vec3 midColor = vec3(1.0, 1.0, 1.0);
  vec3 coolColor = vec3(0.6, 0.85, 1.0);

  vec3 color = t < 0.5
    ? mix(warmColor, midColor, t * 2.0)
    : mix(midColor, coolColor, (t - 0.5) * 2.0);

  float brightness = uBrightnessBoost * 2.0 * alpha;
  gl_FragColor = vec4(color * brightness, 1.0);
}
`;

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + seed * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

interface StarFieldProps {
  beatIntensityRef: React.MutableRefObject<number>;
  starCount?: number;
  brightnessBoost?: number;
  sizeBoost?: number;
}

export function StarField({
  beatIntensityRef,
  starCount = 30000,
  brightnessBoost = 0.2,
  sizeBoost = 0.3,
}: StarFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(starCount * 3);
    const temps = new Float32Array(starCount);
    const szs = new Float32Array(starCount);
    const goldenRatio = (1 + Math.sqrt(5)) / 2;

    for (let i = 0; i < starCount; i++) {
      const jitterPhi = (seededRandom(i * 3.7) - 0.5) * 0.1;
      const jitterTheta = (seededRandom(i * 5.3) - 0.5) * 0.2;
      const phi = Math.acos(1 - (2 * (i + 0.5)) / starCount) + jitterPhi;
      const theta = (2 * Math.PI * i) / goldenRatio + jitterTheta;

      pos[i * 3] = SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = SPHERE_RADIUS * Math.cos(phi);

      // Temperature: 3000K (orange) to 12000K (blue-white)
      temps[i] = 3000 + seededRandom(i * 1.7) * 9000;

      // Dramatic size variation - most small, some medium, few large
      const sizeRand = seededRandom(i * 2.3 + 1000);
      szs[i] = 2.0 + Math.pow(sizeRand, 3.0) * 25.0;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aTemperature", new THREE.BufferAttribute(temps, 1));
    geo.setAttribute("aSize", new THREE.BufferAttribute(szs, 1));
    return geo;
  }, [starCount]);

  useFrame(() => {
    const mat = materialRef.current;
    if (!mat) return;
    mat.uniforms.uBeatIntensity.value = beatIntensityRef.current;
    mat.uniforms.uBrightnessBoost.value = brightnessBoost;
    mat.uniforms.uSizeBoost.value = sizeBoost;
  });

  return (
    <points ref={pointsRef} frustumCulled={false} geometry={geometry}>
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{
          uBeatIntensity: { value: 0 },
          uBrightnessBoost: { value: brightnessBoost },
          uSizeBoost: { value: sizeBoost },
        }}
        transparent
        depthTest
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
