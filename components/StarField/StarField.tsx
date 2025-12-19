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

void main() {
  vTemp = aTemperature;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  float beatSize = 1.0 + uBeatIntensity * uSizeBoost;
  gl_PointSize = aSize * beatSize * (600.0 / -mvPosition.z);
  gl_PointSize = clamp(gl_PointSize, 3.0, 40.0);
}
`;

const fragmentShader = `
varying float vTemp;

uniform float uBrightnessBoost;

void main() {
  // Soft circular falloff
  float dist = length(gl_PointCoord - 0.5) * 2.0;
  float alpha = 1.0 - dist;
  alpha = alpha * alpha * alpha; // Sharper falloff for star-like appearance
  if (alpha < 0.01) discard;

  // Temperature to color (warm orange -> white -> cool blue)
  float t = (vTemp - 3000.0) / 9000.0;
  t = clamp(t, 0.0, 1.0);

  vec3 warmColor = vec3(1.0, 0.7, 0.4);
  vec3 midColor = vec3(1.0, 1.0, 1.0);
  vec3 coolColor = vec3(0.6, 0.85, 1.0);

  vec3 color;
  if (t < 0.5) {
    color = mix(warmColor, midColor, t * 2.0);
  } else {
    color = mix(midColor, coolColor, (t - 0.5) * 2.0);
  }

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
  brightnessBoost = 1.0,
  sizeBoost = 0.3,
}: StarFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);

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

      // Much more size variation - power distribution for rare big stars
      const sizeRand = seededRandom(i * 2.3 + 1000);
      szs[i] = 1.5 + Math.pow(sizeRand, 1.5) * 6.0;
    }

    geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    geo.setAttribute("aTemperature", new THREE.BufferAttribute(temps, 1));
    geo.setAttribute("aSize", new THREE.BufferAttribute(szs, 1));
    return geo;
  }, [starCount]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uBeatIntensity: { value: 0 },
        uBrightnessBoost: { value: brightnessBoost },
        uSizeBoost: { value: sizeBoost },
      },
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }, [brightnessBoost, sizeBoost]);

  useFrame(() => {
    if (!material) return;
    material.uniforms.uBeatIntensity.value = beatIntensityRef.current;
    material.uniforms.uBrightnessBoost.value = brightnessBoost;
    material.uniforms.uSizeBoost.value = sizeBoost;
  });

  return (
    <points ref={pointsRef} frustumCulled={false} geometry={geometry} material={material} />
  );
}
