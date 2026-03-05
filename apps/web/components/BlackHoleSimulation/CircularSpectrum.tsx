"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import { PALETTES } from "@/components/ColorModeSystem";

// Max possible FFT bins we'd ever see (typically 256 or 512)
const MAX_BINS = 512;
const MAX_REPEATS = 8;
const VERTS_PER_BAR = 6;
const MAX_VERTS = MAX_BINS * MAX_REPEATS * VERTS_PER_BAR;

const tmpColor = new THREE.Color();

interface ParticleAudioData {
  bandEnergies: Float32Array;
  bandOnsets: Float32Array;
  bandCount: number;
  spectrum?: Float32Array;
  hfcBoost: number;
  spawnBurst: number;
  beatIntensity: number;
  beatTimePulse: number;
}

interface CircularSpectrumProps {
  getAudioData: () => ParticleAudioData;
  audioEnabled: boolean;
}

export function CircularSpectrum({ getAudioData, audioEnabled }: CircularSpectrumProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const smoothedRef = useRef(new Float32Array(MAX_BINS));
  const cachedPaletteId = useRef("");
  const cachedPaletteRGB = useRef<Array<[number, number, number]>>([]);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_VERTS * 3);
    const colors = new Float32Array(MAX_VERTS * 3);
    const pAttr = new THREE.BufferAttribute(positions, 3);
    const cAttr = new THREE.BufferAttribute(colors, 3);
    pAttr.setUsage(THREE.DynamicDrawUsage);
    cAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", pAttr);
    geo.setAttribute("color", cAttr);
    geo.setDrawRange(0, 0);
    return geo;
  }, []);

  useFrame(() => {
    if (!meshRef.current) return;

    const {
      spectrumEnabled,
      spectrumRadius: radius,
      spectrumHeight: height,
      spectrumRepeats: repeats,
      spectrumAlpha: alpha,
      spectrumSmoothing: smoothing,
      spectrumBarGap: barGapDeg,
      colorPalette,
    } = useVisualizationControls.getState();

    if (!spectrumEnabled) {
      meshRef.current.visible = false;
      return;
    }
    meshRef.current.visible = true;

    const audioData = getAudioData();
    const spectrum = audioData.spectrum;
    if (!spectrum || spectrum.length === 0) return;

    // One bar per FFT bin (skip DC at index 0)
    const binCount = Math.min(spectrum.length - 1, MAX_BINS);
    const smoothed = smoothedRef.current;

    const lerpFactor = audioEnabled ? smoothing : 0.98;
    for (let i = 0; i < binCount; i++) {
      const target = audioEnabled ? spectrum[i + 1] : 0;
      smoothed[i] = smoothed[i] * lerpFactor + target * (1 - lerpFactor);
    }

    // Update cached palette colors if palette changed
    if (cachedPaletteId.current !== colorPalette) {
      const palette = PALETTES[colorPalette] ?? PALETTES.default;
      cachedPaletteRGB.current = palette.colors.map((hex) => {
        tmpColor.set(hex);
        return [tmpColor.r, tmpColor.g, tmpColor.b] as [number, number, number];
      });
      cachedPaletteId.current = colorPalette;
    }
    const paletteRGB = cachedPaletteRGB.current;
    const paletteLen = paletteRGB.length;

    const mat = meshRef.current.material as THREE.ShaderMaterial;
    mat.uniforms.uAlpha.value = alpha;

    // Bar gap in radians — this is the space between bars
    const gapAngle = (barGapDeg * Math.PI) / 180;
    // Total angular span of one repeat = binCount * gapAngle (gap is center-to-center)
    // Bar width is a fraction of the gap
    const barAngle = gapAngle * 0.3;

    const posAttr = geometry.getAttribute("position") as THREE.BufferAttribute;
    const colorAttr = geometry.getAttribute("color") as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const colors = colorAttr.array as Float32Array;
    let vi = 0;
    let ci = 0;
    let totalBars = 0;

    for (let r = 0; r < repeats; r++) {
      const repeatOffset = (r / repeats) * Math.PI * 2;
      const reversed = r % 2 === 1;
      for (let i = 0; i < binCount; i++) {
        const angle = repeatOffset + i * gapAngle;
        const a0 = angle - barAngle / 2;
        const a1 = angle + barAngle / 2;

        // Reversed repeats skip first and last bins to avoid duplicating seams
        const barIndex = reversed ? Math.min(binCount - 1, Math.max(0, binCount - 2 - i)) : i;
        const energy = smoothed[barIndex];
        const halfH = (energy * height) / 2;

        const colorIdx = Math.floor((barIndex / binCount) * paletteLen) % paletteLen;
        const [cr, cg, cb] = paletteRGB[colorIdx];

        const x0 = Math.cos(a0) * radius;
        const z0 = Math.sin(a0) * radius;
        const x1 = Math.cos(a1) * radius;
        const z1 = Math.sin(a1) * radius;

        positions[vi++] = x0;
        positions[vi++] = -halfH;
        positions[vi++] = z0;
        positions[vi++] = x0;
        positions[vi++] = halfH;
        positions[vi++] = z0;
        positions[vi++] = x1;
        positions[vi++] = halfH;
        positions[vi++] = z1;
        positions[vi++] = x0;
        positions[vi++] = -halfH;
        positions[vi++] = z0;
        positions[vi++] = x1;
        positions[vi++] = halfH;
        positions[vi++] = z1;
        positions[vi++] = x1;
        positions[vi++] = -halfH;
        positions[vi++] = z1;

        for (let v = 0; v < VERTS_PER_BAR; v++) {
          colors[ci++] = cr;
          colors[ci++] = cg;
          colors[ci++] = cb;
        }
        totalBars++;
      }
    }

    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    geometry.setDrawRange(0, totalBars * VERTS_PER_BAR);
  });

  return (
    <mesh ref={meshRef} frustumCulled={false} geometry={geometry}>
      <shaderMaterial
        vertexShader={`
          attribute vec3 color;
          varying vec3 vColor;
          void main() {
            vColor = color;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float uAlpha;
          varying vec3 vColor;
          void main() {
            gl_FragColor = vec4(vColor, uAlpha);
          }
        `}
        uniforms={{ uAlpha: { value: 0.3 } }}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}
