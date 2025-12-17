'use client';

import { useRef, useMemo } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const trailVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const trailFragmentShader = `
uniform sampler2D uPreviousFrame;
uniform float uAttenuation;
varying vec2 vUv;

void main() {
    vec4 previous = texture2D(uPreviousFrame, vUv);
    gl_FragColor = previous * uAttenuation;
}
`;

export function useTrailFBO(width: number, height: number, attenuation = 0.96) {
  const { gl, scene, camera } = useThree();
  const currentTargetRef = useRef(0);

  const { renderTargets, fadeMaterial, fadeScene, fadeCamera, fadeMesh } = useMemo(() => {
    const targets = [
      new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
      }),
      new THREE.WebGLRenderTarget(width, height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
      }),
    ];

    const material = new THREE.ShaderMaterial({
      vertexShader: trailVertexShader,
      fragmentShader: trailFragmentShader,
      uniforms: {
        uPreviousFrame: { value: null },
        uAttenuation: { value: attenuation },
      },
      transparent: true,
    });

    const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    const fadeSceneObj = new THREE.Scene();
    fadeSceneObj.add(mesh);

    return {
      renderTargets: targets,
      fadeMaterial: material,
      fadeScene: fadeSceneObj,
      fadeCamera: orthoCamera,
      fadeMesh: mesh,
    };
  }, [width, height, attenuation]);

  const render = (renderParticles: () => void) => {
    const currentIndex = currentTargetRef.current;
    const previousIndex = 1 - currentIndex;
    const currentTarget = renderTargets[currentIndex];
    const previousTarget = renderTargets[previousIndex];

    fadeMaterial.uniforms.uPreviousFrame.value = previousTarget.texture;
    gl.setRenderTarget(currentTarget);
    gl.render(fadeScene, fadeCamera);

    renderParticles();

    gl.setRenderTarget(null);

    currentTargetRef.current = previousIndex;
  };

  const getCurrentTexture = () => {
    return renderTargets[currentTargetRef.current].texture;
  };

  return { render, getCurrentTexture, renderTargets };
}
