'use client';

import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import type { Variable } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import * as THREE from 'three';
import {
  TEXTURE_SIZE,
  createOrbitalElementsTexture,
  createPhaseTexture,
  createInitialPositionTexture,
} from '@/lib/gpu/keplerianPhysics';
import positionFragmentShader from '@/shaders/simulation/positionFragment.glsl';

export function useGPUCompute() {
  const { gl } = useThree();
  const gpuComputeRef = useRef<GPUComputationRenderer | null>(null);
  const positionVariableRef = useRef<Variable | null>(null);
  const timeScaleRef = useRef(0.5);

  const textures = useMemo(() => {
    const orbitalElements = createOrbitalElementsTexture();
    const phase = createPhaseTexture();
    const initialPosition = createInitialPositionTexture(orbitalElements, phase);
    return { orbitalElements, phase, initialPosition };
  }, []);

  useEffect(() => {
    const gpuCompute = new GPUComputationRenderer(TEXTURE_SIZE, TEXTURE_SIZE, gl);

    if (!gl.capabilities.isWebGL2) {
      const ext = gl.extensions.get('OES_texture_float');
      if (!ext) {
        console.error('Float textures not supported');
        return;
      }
    }

    const positionTexture = gpuCompute.createTexture();
    const posData = positionTexture.image.data as Float32Array;
    const initData = textures.initialPosition.image.data as Float32Array;
    // Copy xyz from initial positions, set w to -1 (not captured)
    for (let i = 0; i < initData.length; i += 4) {
      posData[i] = initData[i];
      posData[i + 1] = initData[i + 1];
      posData[i + 2] = initData[i + 2];
      posData[i + 3] = -1.0; // Not captured yet
    }

    const positionVariable = gpuCompute.addVariable(
      'texturePosition',
      positionFragmentShader,
      positionTexture
    );

    positionVariable.material.uniforms.uTime = { value: 0 };
    positionVariable.material.uniforms.textureOrbitalElements = {
      value: textures.orbitalElements,
    };
    positionVariable.material.uniforms.textureOrbitalPhase = {
      value: textures.phase,
    };
    positionVariable.material.uniforms.uGravitationalParameter = { value: 100.0 };
    positionVariable.material.uniforms.uEventHorizon = { value: 1.5 };
    positionVariable.material.uniforms.uIscoRadius = { value: 4.5 };
    positionVariable.material.uniforms.uDecayRate = { value: 0.1 };

    // Position depends on itself to read previous state (capture time)
    gpuCompute.setVariableDependencies(positionVariable, [positionVariable]);

    const error = gpuCompute.init();
    if (error !== null) {
      console.error('GPUComputationRenderer error:', error);
      return;
    }

    gpuComputeRef.current = gpuCompute;
    positionVariableRef.current = positionVariable;

    return () => {
      textures.orbitalElements.dispose();
      textures.phase.dispose();
      textures.initialPosition.dispose();
    };
  }, [gl, textures]);

  useFrame((state) => {
    if (!gpuComputeRef.current || !positionVariableRef.current) return;

    positionVariableRef.current.material.uniforms.uTime.value =
      state.clock.elapsedTime * timeScaleRef.current;

    gpuComputeRef.current.compute();
  });

  const getPositionTexture = useCallback((): THREE.Texture | null => {
    if (!gpuComputeRef.current || !positionVariableRef.current) return null;
    return gpuComputeRef.current.getCurrentRenderTarget(positionVariableRef.current)
      .texture;
  }, []);

  const setGravitationalParameter = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uGravitationalParameter.value = value;
    }
  }, []);

  const setTimeScale = useCallback((value: number) => {
    timeScaleRef.current = value;
  }, []);

  const setEventHorizon = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uEventHorizon.value = value;
      positionVariableRef.current.material.uniforms.uIscoRadius.value = value * 3;
    }
  }, []);

  const setDecayRate = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uDecayRate.value = value;
    }
  }, []);

  return { getPositionTexture, setGravitationalParameter, setTimeScale, setEventHorizon, setDecayRate };
}
