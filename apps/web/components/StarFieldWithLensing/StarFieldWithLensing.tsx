"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useFBO } from "@react-three/drei";
import * as THREE from "three";
import { StarField } from "@/components/StarField";
import { blackHoleScreenData } from "@/components/GravitationalLensing";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";

const lensingVertexShader = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = uv;
  // Place at far plane (z=1) so it renders behind everything
  gl_Position = vec4(position.xy, 0.9999, 1.0);
}
`;

const lensingFragmentShader = /* glsl */ `
uniform sampler2D uTexture;
uniform vec4 uBlackHoles[4];
uniform int uBlackHoleCount;
uniform float uStrength;
uniform float uMaxMass;
uniform vec2 uResolution;

varying vec2 vUv;

void main() {
  if (uStrength <= 0.0 || uBlackHoleCount <= 0) {
    gl_FragColor = texture2D(uTexture, vUv);
    return;
  }

  vec2 warpedUv = vUv;
  float aspect = uResolution.x / uResolution.y;

  for (int i = 0; i < 4; i++) {
    if (i >= uBlackHoleCount) break;

    vec2 bhPos = uBlackHoles[i].xy;
    float bhRadius = uBlackHoles[i].z;
    float bhMass = uBlackHoles[i].w;
    if (bhRadius <= 0.0 || bhMass <= 0.0) continue;

    vec2 delta = vUv - bhPos;
    delta.x *= aspect;

    float dist = length(delta);
    float edgeRadius = max(bhRadius * aspect, 1e-4);
    if (dist <= edgeRadius || dist <= 1e-5) continue;

    float normalizedMass = clamp(bhMass / max(uMaxMass, 1e-5), 0.0, 1.0);

    float distFromEdge = max(dist - edgeRadius, 1e-5);
    float falloff = edgeRadius / (distFromEdge + edgeRadius);

    // Keep the look tied to apparent lens size while preserving punch near edges.
    float radiusScale = clamp(edgeRadius / 0.04, 0.35, 1.4);
    float distortion = uStrength * normalizedMass * falloff * falloff * 0.12 * radiusScale;
    distortion = min(distortion, edgeRadius * 0.9);

    // Sample toward the lens center so apparent star positions shift outward.
    vec2 dir = delta / dist;
    warpedUv -= vec2(dir.x / aspect, dir.y) * distortion;
  }

  gl_FragColor = texture2D(uTexture, warpedUv);
}
`;

interface StarFieldWithLensingProps {
  beatIntensityRef: React.MutableRefObject<number>;
  starCount?: number;
  brightnessBoost?: number;
  sizeBoost?: number;
  resolutionScale?: number;
}

export function StarFieldWithLensing({
  beatIntensityRef,
  starCount = 30000,
  brightnessBoost = 0.2,
  sizeBoost = 0.3,
  resolutionScale = 1,
}: StarFieldWithLensingProps) {
  const { gl, size } = useThree();
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Create a separate scene and camera for the starfield
  // Camera is created via useMemo but mutated in useFrame (which is fine - mutations happen outside render)
  const starfieldScene = useMemo(() => new THREE.Scene(), []);
  const starfieldCamera = useMemo(() => new THREE.PerspectiveCamera(75, 1, 0.1, 1000), []);

  // Create FBO for rendering starfield (key forces recreation on resize)
  const fbo = useFBO(size.width, size.height, {
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
    type: THREE.HalfFloatType,
  });

  // Resize FBO when viewport changes
  useEffect(() => {
    fbo.setSize(size.width, size.height);
  }, [fbo, size.width, size.height]);

  // Fullscreen quad geometry
  const quadGeometry = useMemo(() => {
    return new THREE.PlaneGeometry(2, 2);
  }, []);

  // Lensing material - renders at far plane, can be occluded by closer objects
  const lensingMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader: lensingVertexShader,
      fragmentShader: lensingFragmentShader,
      uniforms: {
        uTexture: { value: null },
        uBlackHoles: {
          value: [
            new THREE.Vector4(0, 0, 0, 0),
            new THREE.Vector4(0, 0, 0, 0),
            new THREE.Vector4(0, 0, 0, 0),
            new THREE.Vector4(0, 0, 0, 0),
          ],
        },
        uBlackHoleCount: { value: 0 },
        uStrength: { value: 0.5 },
        uMaxMass: { value: 100000 },
        uResolution: { value: new THREE.Vector2(size.width, size.height) },
      },
      transparent: false,
      depthTest: true,
      depthWrite: true,
    });
  }, [size.width, size.height]);

  useFrame(({ camera: mainCamera }) => {
    /* eslint-disable react-hooks/immutability -- Three.js objects are meant to be mutated in useFrame */
    // Copy main camera state to starfield camera
    starfieldCamera.position.copy(mainCamera.position);
    starfieldCamera.quaternion.copy(mainCamera.quaternion);
    starfieldCamera.up.copy(mainCamera.up);
    const perspectiveMainCamera = mainCamera as THREE.PerspectiveCamera;
    if (perspectiveMainCamera.isPerspectiveCamera) {
      starfieldCamera.fov = perspectiveMainCamera.fov;
      starfieldCamera.near = perspectiveMainCamera.near;
      starfieldCamera.far = perspectiveMainCamera.far;
      starfieldCamera.zoom = perspectiveMainCamera.zoom;
    }
    starfieldCamera.aspect = size.width / size.height;
    starfieldCamera.updateProjectionMatrix();
    /* eslint-enable react-hooks/immutability */

    // Render starfield to FBO
    gl.setRenderTarget(fbo);
    gl.clear();
    gl.render(starfieldScene, starfieldCamera);
    gl.setRenderTarget(null);

    // Update lensing uniforms
    const mat = materialRef.current;
    if (mat) {
      mat.uniforms.uTexture.value = fbo.texture;
      mat.uniforms.uStrength.value = useVisualizationControls.getState().starLensingStrength;
      mat.uniforms.uMaxMass.value = blackHoleScreenData.maxMass;
      mat.uniforms.uResolution.value.set(size.width, size.height);
      mat.uniforms.uBlackHoleCount.value = blackHoleScreenData.count;

      const blackHoles = mat.uniforms.uBlackHoles.value as THREE.Vector4[];
      for (let i = 0; i < 4; i++) {
        if (i < blackHoleScreenData.count) {
          blackHoles[i].set(
            blackHoleScreenData.positions[i].x,
            blackHoleScreenData.positions[i].y,
            blackHoleScreenData.radii[i],
            blackHoleScreenData.masses[i]
          );
        } else {
          blackHoles[i].set(0, 0, 0, 0);
        }
      }
    }
  }, 2);

  return (
    <>
      {/* Portal the StarField to our separate scene */}
      {createPortal(
        <StarField
          beatIntensityRef={beatIntensityRef}
          starCount={starCount}
          brightnessBoost={brightnessBoost}
          sizeBoost={sizeBoost}
          resolutionScale={resolutionScale}
        />,
        starfieldScene
      )}

      {/* Fullscreen quad with lensed starfield */}
      <mesh geometry={quadGeometry} renderOrder={-1000} frustumCulled={false}>
        <primitive ref={materialRef} object={lensingMaterial} attach="material" />
      </mesh>
    </>
  );
}
