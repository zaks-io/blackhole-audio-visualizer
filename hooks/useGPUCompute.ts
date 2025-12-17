'use client';

import { useRef, useMemo, useEffect, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { GPUComputationRenderer } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import type { Variable } from 'three/examples/jsm/misc/GPUComputationRenderer.js';
import * as THREE from 'three';
import {
  TEXTURE_SIZE,
  EMISSION_RADIUS,
  DEFAULT_GM,
  DEFAULT_SOFTENING,
  createInitialPositionTexture,
  createInitialVelocityTexture,
} from '@/lib/gpu/verletPhysics';
import positionFragmentShader from '@/shaders/simulation/positionFragment.glsl';
import velocityFragmentShader from '@/shaders/simulation/velocityFragment.glsl';

export function useGPUCompute() {
  const { gl } = useThree();
  const gpuComputeRef = useRef<GPUComputationRenderer | null>(null);
  const positionVariableRef = useRef<Variable | null>(null);
  const velocityVariableRef = useRef<Variable | null>(null);
  const timeScaleRef = useRef(0.5);

  const textures = useMemo(() => {
    const initialPosition = createInitialPositionTexture(EMISSION_RADIUS);
    const initialVelocity = createInitialVelocityTexture(initialPosition, DEFAULT_GM);
    return { initialPosition, initialVelocity };
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

    // Create position texture
    const positionTexture = gpuCompute.createTexture();
    const posData = positionTexture.image.data as Float32Array;
    const initPosData = textures.initialPosition.image.data as Float32Array;
    for (let i = 0; i < initPosData.length; i++) {
      posData[i] = initPosData[i];
    }

    // Create velocity texture
    const velocityTexture = gpuCompute.createTexture();
    const velData = velocityTexture.image.data as Float32Array;
    const initVelData = textures.initialVelocity.image.data as Float32Array;
    for (let i = 0; i < initVelData.length; i++) {
      velData[i] = initVelData[i];
    }

    // Add velocity variable FIRST so it runs before position
    // Both shaders need to see the same state to detect spawn condition
    const velocityVariable = gpuCompute.addVariable(
      'textureVelocity',
      velocityFragmentShader,
      velocityTexture
    );

    // Add position variable second
    const positionVariable = gpuCompute.addVariable(
      'texturePosition',
      positionFragmentShader,
      positionTexture
    );

    // Set up uniforms for position shader
    positionVariable.material.uniforms.uTime = { value: 0 };
    positionVariable.material.uniforms.uDeltaTime = { value: 0.016 };
    positionVariable.material.uniforms.uGM = { value: DEFAULT_GM };
    positionVariable.material.uniforms.uSoftening = { value: DEFAULT_SOFTENING };
    positionVariable.material.uniforms.uEventHorizon = { value: 3.0 };
    positionVariable.material.uniforms.uEmissionRadius = { value: EMISSION_RADIUS };
    positionVariable.material.uniforms.uEmitterCount = { value: 12.0 };

    // Set up uniforms for velocity shader
    velocityVariable.material.uniforms.uTime = { value: 0 };
    velocityVariable.material.uniforms.uDeltaTime = { value: 0.016 };
    velocityVariable.material.uniforms.uGM = { value: DEFAULT_GM };
    velocityVariable.material.uniforms.uSoftening = { value: DEFAULT_SOFTENING };
    velocityVariable.material.uniforms.uEventHorizon = { value: 3.0 };
    velocityVariable.material.uniforms.uEmissionRadius = { value: EMISSION_RADIUS };
    velocityVariable.material.uniforms.uEmitterCount = { value: 12.0 };
    velocityVariable.material.uniforms.uDrag = { value: 0.1 };

    // Set dependencies: position and velocity both depend on each other
    gpuCompute.setVariableDependencies(positionVariable, [positionVariable, velocityVariable]);
    gpuCompute.setVariableDependencies(velocityVariable, [positionVariable, velocityVariable]);

    const error = gpuCompute.init();
    if (error !== null) {
      console.error('GPUComputationRenderer error:', error);
      return;
    }

    gpuComputeRef.current = gpuCompute;
    positionVariableRef.current = positionVariable;
    velocityVariableRef.current = velocityVariable;

    return () => {
      textures.initialPosition.dispose();
      textures.initialVelocity.dispose();
    };
  }, [gl, textures]);

  useFrame((state, delta) => {
    if (!gpuComputeRef.current || !positionVariableRef.current || !velocityVariableRef.current) {
      return;
    }

    const scaledTime = state.clock.elapsedTime * timeScaleRef.current;
    const scaledDelta = Math.min(delta * timeScaleRef.current, 0.05); // Cap at 50ms

    // Update position shader uniforms
    positionVariableRef.current.material.uniforms.uTime.value = scaledTime;
    positionVariableRef.current.material.uniforms.uDeltaTime.value = scaledDelta;

    // Update velocity shader uniforms
    velocityVariableRef.current.material.uniforms.uTime.value = scaledTime;
    velocityVariableRef.current.material.uniforms.uDeltaTime.value = scaledDelta;

    gpuComputeRef.current.compute();
  });

  const getPositionTexture = useCallback((): THREE.Texture | null => {
    if (!gpuComputeRef.current || !positionVariableRef.current) return null;
    return gpuComputeRef.current.getCurrentRenderTarget(positionVariableRef.current).texture;
  }, []);

  const getVelocityTexture = useCallback((): THREE.Texture | null => {
    if (!gpuComputeRef.current || !velocityVariableRef.current) return null;
    return gpuComputeRef.current.getCurrentRenderTarget(velocityVariableRef.current).texture;
  }, []);

  const setGravitationalParameter = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uGM.value = value;
    }
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uGM.value = value;
    }
  }, []);

  const setTimeScale = useCallback((value: number) => {
    timeScaleRef.current = value;
  }, []);

  const setEventHorizon = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uEventHorizon.value = value;
    }
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uEventHorizon.value = value;
    }
  }, []);

  const setSoftening = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uSoftening.value = value;
    }
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uSoftening.value = value;
    }
  }, []);

  const setEmissionRadius = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uEmissionRadius.value = value;
    }
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uEmissionRadius.value = value;
    }
  }, []);

  const setEmitterCount = useCallback((value: number) => {
    if (positionVariableRef.current) {
      positionVariableRef.current.material.uniforms.uEmitterCount.value = value;
    }
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uEmitterCount.value = value;
    }
  }, []);

  const setDrag = useCallback((value: number) => {
    if (velocityVariableRef.current) {
      velocityVariableRef.current.material.uniforms.uDrag.value = value;
    }
  }, []);

  return {
    getPositionTexture,
    getVelocityTexture,
    setGravitationalParameter,
    setTimeScale,
    setEventHorizon,
    setSoftening,
    setEmissionRadius,
    setEmitterCount,
    setDrag,
  };
}
