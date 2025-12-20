"use client";

import type { RefObject } from "react";
import { useState, useEffect } from "react";
import type { AnalyzedAudio } from "@/hooks/useAudioAnalyzer";
import { EnergyBar } from "@/components/AudioAnalysisDebug/EnergyBar";
import { SpectrumView } from "@/components/AudioAnalysisDebug/SpectrumView";
import { PeakTimeline } from "@/components/AudioAnalysisDebug/PeakTimeline";

interface AudioDebugTabProps {
  analysisRef: RefObject<AnalyzedAudio | null>;
}

export function AudioDebugTab({ analysisRef }: AudioDebugTabProps) {
  const [analysis, setAnalysis] = useState<AnalyzedAudio | null>(null);

  // Poll the ref at 10Hz for UI updates
  useEffect(() => {
    const interval = setInterval(() => {
      const current = analysisRef.current;
      if (current) {
        setAnalysis({
          energy: { ...current.energy },
          peaks: { ...current.peaks },
          raw: { ...current.raw },
          thresholds: {
            spectralFlux: { ...current.thresholds.spectralFlux },
            hfc: { ...current.thresholds.hfc },
            bass: { ...current.thresholds.bass },
            high: { ...current.thresholds.high },
          },
          spectrum: new Float32Array(current.spectrum),
          bandOnsets: new Float32Array(current.bandOnsets),
          bandEnergies: new Float32Array(current.bandEnergies),
          bandCount: current.bandCount,
          peakHistory: [...current.peakHistory],
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [analysisRef]);

  const energy = analysis?.energy;
  const raw = analysis?.raw;
  const peaks = analysis?.peaks;
  const spectrum = analysis?.spectrum ?? new Float32Array(128);
  const peakHistory = analysis?.peakHistory ?? [];

  return (
    <div className="space-y-4">
      {/* Spectrum */}
      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">Spectrum</div>
        <SpectrumView spectrum={spectrum} barCount={32} height={48} />
      </div>

      {/* Energy Bands */}
      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">Energy Bands</div>
        <EnergyBar label="Sub-Bass" value={energy?.subBass ?? 0} isPeak={peaks?.bass} color="red" />
        <EnergyBar label="Bass" value={energy?.bass ?? 0} isPeak={peaks?.bass} color="orange" />
        <EnergyBar label="Low Mid" value={energy?.lowMid ?? 0} color="yellow" />
        <EnergyBar label="Mid" value={energy?.mid ?? 0} color="green" />
        <EnergyBar
          label="High Mid"
          value={energy?.highMid ?? 0}
          isPeak={peaks?.high}
          color="cyan"
        />
        <EnergyBar label="High" value={energy?.high ?? 0} isPeak={peaks?.high} color="blue" />
      </div>

      {/* Detection */}
      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">Detection</div>
        <EnergyBar
          label="Spectral Flux"
          value={raw?.spectralFlux ?? 0}
          isPeak={peaks?.spectralFlux}
          color="cyan"
        />
        <EnergyBar label="HFC" value={raw?.hfc ?? 0} isPeak={peaks?.hfc} color="purple" />
      </div>

      {/* Spectral Features */}
      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">Spectral</div>
        <EnergyBar label="RMS" value={raw?.rms ?? 0} color="blue" />
        <EnergyBar label="Centroid" value={raw?.spectralCentroid ?? 0} color="yellow" />
        <EnergyBar label="Flatness" value={raw?.spectralFlatness ?? 0} color="purple" />
      </div>

      {/* Peak Timeline */}
      <div>
        <div className="mb-2 text-xs font-medium text-muted-foreground">Peaks (2s)</div>
        <PeakTimeline peaks={peakHistory} windowSeconds={2} height={24} />
      </div>
    </div>
  );
}
