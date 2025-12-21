"use client";

import { useRef, useCallback } from "react";
import { useFrame } from "@react-three/fiber";
import { Bloom, ChromaticAberration, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Vector2 } from "three";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import { useUIState } from "@/hooks/useUIState";
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

// Store effect instances outside React state to avoid serialization issues
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let bloomInstance: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let chromaticInstance: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let vignetteInstance: any = null;

export function AudioReactiveEffects({ getAnalysis, isAudioConnected }: AudioReactiveEffectsProps) {
  const controls = useVisualizationControls();
  const { bassStrobeEnabled } = useUIState();

  // Envelope followers for smooth audio response
  const bloomEnvelope = useRef(new EnvelopeFollower(5, 200));
  const chromaticEnvelope = useRef(new EnvelopeFollower(0, 80));

  // Reusable vector for chromatic offset
  const chromaticOffset = useRef(new Vector2(0, 0));

  // Cache previous bloom threshold to avoid unnecessary updates
  const prevBloomThreshold = useRef(0.3);

  const chromaticPeak = 0.012;

  // Callback refs to capture effect instances without storing in React state
  const bloomRefCallback = useCallback((effect: unknown) => {
    bloomInstance = effect;
  }, []);

  const chromaticRefCallback = useCallback((effect: unknown) => {
    chromaticInstance = effect;
  }, []);

  const vignetteRefCallback = useCallback((effect: unknown) => {
    vignetteInstance = effect;
  }, []);

  useFrame(() => {
    // Vignette - always update from controls (before any early returns)
    if (vignetteInstance) {
      vignetteInstance.offset = controls.vignetteOffset;
      vignetteInstance.darkness = controls.vignetteEnabled ? controls.vignetteDarkness : 0;
    }

    const bloomBase = controls.bloomBaseIntensity;
    const bloomReactivity = controls.bloomAudioReactivity;
    const chromaticReactivity = controls.chromaticAudioReactivity;

    if (!isAudioConnected || !controls.bloomEnabled) {
      // Reset to defaults when not connected or disabled
      if (bloomInstance) {
        bloomInstance.intensity = controls.bloomEnabled ? bloomBase : 0;
      }
      if (chromaticInstance) {
        chromaticOffset.current.set(0, 0);
        chromaticInstance.offset = chromaticOffset.current;
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

    if (bloomInstance) {
      bloomInstance.intensity = bloomIntensity;

      // Only update threshold when it changes significantly (and strobe is enabled)
      if (bassStrobeEnabled) {
        const centroidInfluence = analysis.raw.spectralCentroid * 0.15 * bloomReactivity;
        const newThreshold = 0.3 - centroidInfluence;
        if (Math.abs(newThreshold - prevBloomThreshold.current) > 0.001) {
          prevBloomThreshold.current = newThreshold;
          bloomInstance.luminanceMaterial.threshold = newThreshold;
        }
      }
    }

    // Chromatic aberration responds to HFC peaks with radial modulation
    if (controls.chromaticEnabled && chromaticInstance) {
      const hfcTarget = analysis.peaks.hfc ? 1 : 0;
      const hfcEnvValue = chromaticEnvelope.current.process(hfcTarget);
      const chromaticAmount = hfcEnvValue * chromaticPeak * chromaticReactivity;
      chromaticOffset.current.set(chromaticAmount, chromaticAmount * 0.5);
      chromaticInstance.offset = chromaticOffset.current;

      // Animate modulation offset - pulses outward on peaks
      const baseModulation = 0.15;
      const modulationPulse = hfcEnvValue * 0.4 * chromaticReactivity;
      chromaticInstance.modulationOffset = baseModulation + modulationPulse;
    } else if (chromaticInstance) {
      chromaticOffset.current.set(0, 0);
      chromaticInstance.offset = chromaticOffset.current;
      chromaticInstance.modulationOffset = 0.15;
    }
  });

  return (
    <>
      <Bloom
        ref={bloomRefCallback}
        intensity={controls.bloomEnabled ? controls.bloomBaseIntensity : 0}
        luminanceThreshold={0.3}
        luminanceSmoothing={0.9}
        mipmapBlur
        levels={5}
      />
      <ChromaticAberration
        ref={chromaticRefCallback}
        blendFunction={BlendFunction.NORMAL}
        offset={[0, 0]}
        radialModulation={true}
        modulationOffset={0.15}
      />
      <Vignette ref={vignetteRefCallback} offset={0.5} darkness={0.5} />
    </>
  );
}
