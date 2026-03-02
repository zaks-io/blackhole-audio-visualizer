"use client";

import { useMemo, useRef, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, ChromaticAberration, Vignette, ToneMapping } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { Vector2 } from "three";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import { runtimeState } from "@/lib/runtimeStateRegistry";
import { InvertEffect } from "@/lib/effects/InvertEffect";
import type { AnalyzedAudio } from "@/hooks/useAudioAnalyzer";

interface AudioReactiveEffectsProps {
  getAnalysis: () => AnalyzedAudio;
  isAudioConnected: boolean;
}

class EnvelopeFollower {
  private value = 0;
  private attackCoef: number;
  private releaseCoef: number;

  constructor(attackMs: number, releaseMs: number, sampleRate = 60) {
    this.attackCoef = Math.exp(-1 / ((attackMs / 1000) * sampleRate));
    this.releaseCoef = Math.exp(-1 / ((releaseMs / 1000) * sampleRate));
  }

  process(input: number): number {
    if (input > this.value) {
      this.value = this.attackCoef * this.value + (1 - this.attackCoef) * input;
    } else {
      this.value = this.releaseCoef * this.value + (1 - this.releaseCoef) * input;
    }
    return this.value;
  }

  reset() {
    this.value = 0;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveBloomEffect(instance: unknown): any | null {
  if (!instance) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maybe = instance as any;
  if (typeof maybe.intensity === "number") return maybe;
  if (maybe.effect && typeof maybe.effect.intensity === "number") return maybe.effect;
  if (Array.isArray(maybe.effects)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const effect = maybe.effects.find((e: any) => e && typeof e.intensity === "number");
    if (effect) return effect;
  }
  return null;
}

export function AudioReactiveEffects({ getAnalysis, isAudioConnected }: AudioReactiveEffectsProps) {
  const invertEffect = useMemo(() => new InvertEffect({ intensity: 0 }), []);

  // Envelope follower for smooth chromatic aberration response
  const chromaticEnvelope = useRef(new EnvelopeFollower(0, 80));

  // Reusable vector for chromatic offset
  const chromaticOffset = useRef(new Vector2(0, 0));

  const chromaticPeak = 0.025;
  const bloomInstanceRef = useRef<unknown>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chromaticInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vignetteInstanceRef = useRef<any>(null);
  const invertInstanceRef = useRef<InvertEffect | null>(null);

  // Callback refs to capture effect instances without storing in React state
  const bloomRefCallback = useCallback((effect: unknown) => {
    bloomInstanceRef.current = effect;
  }, []);

  const chromaticRefCallback = useCallback((effect: unknown) => {
    chromaticInstanceRef.current = effect;
  }, []);

  const vignetteRefCallback = useCallback((effect: unknown) => {
    vignetteInstanceRef.current = effect;
  }, []);

  const invertRefCallback = useCallback((effect: unknown) => {
    invertInstanceRef.current = effect as InvertEffect | null;
  }, []);

  useFrame(() => {
    const controls = useVisualizationControls.getState();
    const chromaticEnabledNow = controls.chromaticEnabled;
    const vignetteEnabledNow = controls.vignetteEnabled;

    // Read from runtimeState instead of store for performance during tweens
    const { vignetteOffset, vignetteDarkness, bloomBaseIntensity, chromaticAudioReactivity } =
      runtimeState;

    // Vignette - always update from controls (before any early returns)
    if (vignetteInstanceRef.current) {
      vignetteInstanceRef.current.offset = vignetteOffset;
      vignetteInstanceRef.current.darkness = vignetteEnabledNow ? vignetteDarkness : 0;
    }

    if (invertInstanceRef.current) {
      invertInstanceRef.current.intensity = useVisualizationControls.getState().invertColors
        ? 1.0
        : 0.0;
    }

    const bloomBase = bloomBaseIntensity;
    const chromaticReactivity = chromaticAudioReactivity;

    const bloomEffect = resolveBloomEffect(bloomInstanceRef.current);

    if (!isAudioConnected) {
      // Keep base bloom active even without audio input.
      if (bloomEffect) {
        bloomEffect.intensity = bloomBase;
      }
      if (chromaticInstanceRef.current) {
        chromaticOffset.current.set(0, 0);
        chromaticInstanceRef.current.offset = chromaticOffset.current;
      }
      return;
    }

    const analysis = getAnalysis();

    if (bloomEffect) {
      bloomEffect.intensity = bloomBase;
    }

    // Chromatic aberration responds to HFC peaks with radial modulation
    if (chromaticEnabledNow && chromaticInstanceRef.current) {
      const hfcTarget = analysis.peaks.hfc ? 1 : 0;
      const hfcEnvValue = chromaticEnvelope.current.process(hfcTarget);
      const chromaticAmount = hfcEnvValue * chromaticPeak * chromaticReactivity;
      chromaticOffset.current.set(chromaticAmount, chromaticAmount * 0.5);
      chromaticInstanceRef.current.offset = chromaticOffset.current;

      // Animate modulation offset - pulses outward on peaks
      const baseModulation = 0.15;
      const modulationPulse = hfcEnvValue * 0.4 * chromaticReactivity;
      chromaticInstanceRef.current.modulationOffset = baseModulation + modulationPulse;
    } else if (chromaticInstanceRef.current) {
      chromaticOffset.current.set(0, 0);
      chromaticInstanceRef.current.offset = chromaticOffset.current;
      chromaticInstanceRef.current.modulationOffset = 0.15;
    }
  });

  // Get initial values for props to prevent flicker
  const initialBloomIntensity = useVisualizationControls.getState().bloomBaseIntensity;

  return (
    <>
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <Bloom
        ref={bloomRefCallback}
        blendFunction={BlendFunction.ADD}
        opacity={1}
        intensity={initialBloomIntensity}
        luminanceThreshold={0.42}
        luminanceSmoothing={0.9}
        mipmapBlur
        levels={2}
      />
      <ChromaticAberration
        ref={chromaticRefCallback}
        blendFunction={BlendFunction.NORMAL}
        offset={[0, 0]}
        radialModulation={true}
        modulationOffset={0.15}
      />
      <Vignette ref={vignetteRefCallback} offset={0.5} darkness={0.5} />
      <primitive ref={invertRefCallback} object={invertEffect} />
    </>
  );
}
