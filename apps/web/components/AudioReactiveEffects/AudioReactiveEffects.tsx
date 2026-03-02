"use client";

import { useMemo, useRef, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, ChromaticAberration, Vignette, ToneMapping } from "@react-three/postprocessing";
import { BlendFunction, ToneMappingMode } from "postprocessing";
import { Vector2 } from "three";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import { runtimeState } from "@/lib/runtimeStateRegistry";
import { useUIState } from "@/hooks/useUIState";
import { useFPSStore } from "@/hooks/useFPSMonitor";
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
  const bassStrobeEnabled = useUIState((s) => s.bassStrobeEnabled);
  const invertEffect = useMemo(() => new InvertEffect({ intensity: 0 }), []);

  // Envelope followers for smooth audio response
  const bloomEnvelope = useRef(new EnvelopeFollower(5, 200));
  const chromaticEnvelope = useRef(new EnvelopeFollower(0, 80));

  // Reusable vector for chromatic offset
  const chromaticOffset = useRef(new Vector2(0, 0));

  // Cache bloom tuning state to avoid noisy frame-to-frame changes.
  const prevBloomThreshold = useRef(0.42);
  const prevBloomLevels = useRef(2);
  const bloomDownCounter = useRef(0);
  const bloomUpCounter = useRef(0);

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

  // Two bloom quality tiers with hysteresis to prevent rapid quality flapping.
  const computeBloomLevels = (fps: number, postGpuMs: number): number => {
    const shouldDrop = fps < 54 || postGpuMs > 3.2;
    const canRaise = fps > 58 && postGpuMs < 2.4;

    if (shouldDrop) {
      bloomDownCounter.current += 1;
      bloomUpCounter.current = 0;
      if (bloomDownCounter.current >= 8) return 1;
      return prevBloomLevels.current;
    }

    if (canRaise) {
      bloomUpCounter.current += 1;
      bloomDownCounter.current = 0;
      if (bloomUpCounter.current >= 24) return 2;
      return prevBloomLevels.current;
    }

    bloomDownCounter.current = 0;
    bloomUpCounter.current = 0;
    return prevBloomLevels.current;
  };

  useFrame(() => {
    const controls = useVisualizationControls.getState();
    const chromaticEnabledNow = controls.chromaticEnabled;
    const vignetteEnabledNow = controls.vignetteEnabled;

    // Read from runtimeState instead of store for performance during tweens
    const {
      vignetteOffset,
      vignetteDarkness,
      bloomBaseIntensity,
      bloomAudioReactivity,
      chromaticAudioReactivity,
    } = runtimeState;

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
    const bloomReactivity = bloomAudioReactivity;
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

    // Bloom responds to bass peaks (when bass strobe is enabled)
    let bloomIntensity = bloomBase;
    if (bassStrobeEnabled) {
      const bassTarget = analysis.peaks.bass ? 1 : 0;
      const bassEnvValue = bloomEnvelope.current.process(bassTarget);
      const bloomPeak = bloomBase + bloomReactivity;
      bloomIntensity = bloomBase + bassEnvValue * (bloomPeak - bloomBase);
    }

    if (bloomEffect) {
      bloomEffect.intensity = bloomIntensity;

      // Keep threshold relatively high for dense additive clusters and modulate gently.
      const baseThreshold = 0.42;
      const targetThreshold = bassStrobeEnabled
        ? Math.max(0.34, baseThreshold - analysis.raw.spectralCentroid * 0.08 * bloomReactivity)
        : baseThreshold;
      const smoothedThreshold =
        prevBloomThreshold.current + (targetThreshold - prevBloomThreshold.current) * 0.2;

      if (Math.abs(smoothedThreshold - prevBloomThreshold.current) > 0.001) {
        prevBloomThreshold.current = smoothedThreshold;
        if (bloomEffect.luminanceMaterial) {
          bloomEffect.luminanceMaterial.threshold = smoothedThreshold;
        }
      }

      // Adapt bloom mip levels from measured post-FX cost with hysteresis.
      const { fps, postGpuMs } = useFPSStore.getState();
      const targetLevels = computeBloomLevels(fps, postGpuMs);
      if (targetLevels !== prevBloomLevels.current) {
        prevBloomLevels.current = targetLevels;
        if (bloomEffect.mipmapBlurPass) {
          bloomEffect.mipmapBlurPass.levels = targetLevels;
        }
      }
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
