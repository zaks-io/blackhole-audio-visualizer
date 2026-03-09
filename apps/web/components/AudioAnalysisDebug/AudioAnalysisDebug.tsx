"use client";

import type { RefObject } from "react";
import { useState, useEffect, useCallback } from "react";
import type { AnalyzedAudio } from "@/hooks/useAudioAnalyzer";
import { EnergyBar } from "./EnergyBar";
import { SpectrumView } from "./SpectrumView";
import { PeakTimeline } from "./PeakTimeline";

interface AudioAnalysisDebugProps {
  analysisRef: RefObject<AnalyzedAudio | null>;
}

export function AudioAnalysisDebug({ analysisRef }: AudioAnalysisDebugProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [analysis, setAnalysis] = useState<AnalyzedAudio | null>(null);

  // Poll the ref at 10Hz for UI updates
  // Must create new object references so React detects changes
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      const current = analysisRef.current;
      if (current) {
        setAnalysis({
          timestamp: current.timestamp,
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
          bpm: current.bpm,
          bpmConfidence: current.bpmConfidence,
          beatPhase: current.beatPhase,
          nextBeatMs: current.nextBeatMs,
          pipelineLatencyMs: current.pipelineLatencyMs,
          timing: { ...current.timing },
        });
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, analysisRef]);

  const togglePanel = useCallback(() => {
    setIsVisible((v) => !v);
  }, []);

  if (!isVisible) {
    return (
      <button
        onClick={togglePanel}
        className="fixed left-6 top-6 z-50 rounded-lg border border-gray-700 bg-gray-900/90 px-3 py-2 text-sm text-white shadow-xl backdrop-blur-sm hover:bg-gray-800"
      >
        Audio
      </button>
    );
  }

  const energy = analysis?.energy;
  const raw = analysis?.raw;
  const peaks = analysis?.peaks;
  const thresholds = analysis?.thresholds;
  const spectrum = analysis?.spectrum ?? new Float32Array(128);
  const peakHistory = analysis?.peakHistory ?? [];

  return (
    <div className="fixed left-6 top-6 z-50 w-80 rounded-lg border border-gray-700 bg-gray-900/95 shadow-xl backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 p-3">
        <h3 className="text-sm font-semibold text-white">Audio Analysis</h3>
        <button onClick={togglePanel} className="text-gray-400 hover:text-white" title="Hide panel">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="max-h-[calc(100vh-120px)] overflow-y-auto p-3 space-y-4">
        {/* Spectrum */}
        <div>
          <div className="mb-2 text-xs font-medium text-gray-300">Spectrum</div>
          <SpectrumView spectrum={spectrum} barCount={32} height={48} />
        </div>

        {/* Energy Bands */}
        <div>
          <div className="mb-2 text-xs font-medium text-gray-300">Energy Bands</div>
          <EnergyBar
            label="Sub-Bass"
            value={energy?.subBass ?? 0}
            isPeak={peaks?.bass}
            color="red"
          />
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
          <div className="mb-2 text-xs font-medium text-gray-300">Detection</div>
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
          <div className="mb-2 text-xs font-medium text-gray-300">Spectral</div>
          <EnergyBar label="RMS" value={raw?.rms ?? 0} color="blue" />
          <EnergyBar label="Centroid" value={raw?.spectralCentroid ?? 0} color="yellow" />
          <EnergyBar label="Flatness" value={raw?.spectralFlatness ?? 0} color="purple" />
        </div>

        {/* BPM */}
        <div>
          <div className="mb-2 text-xs font-medium text-gray-300">Tempo</div>
          <div className="flex items-baseline gap-2 font-mono text-sm">
            <span className="text-white">{analysis?.bpm ? analysis.bpm.toFixed(1) : "—"} BPM</span>
            <span className="text-xs text-gray-400">
              conf: {((analysis?.bpmConfidence ?? 0) * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* Peak Timeline */}
        <div>
          <div className="mb-2 text-xs font-medium text-gray-300">Peaks (2s)</div>
          <PeakTimeline peaks={peakHistory} windowSeconds={2} height={24} />
        </div>

        {/* Pipeline Timing */}
        {analysis?.timing && (
          <div>
            <div className="mb-2 text-xs font-medium text-gray-300">Pipeline Timing</div>
            <div className="space-y-1 font-mono text-xs">
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Worker</span>
                <span>{analysis.timing.workerProcessMs.toFixed(1)}ms</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Round-trip</span>
                <span>{analysis.timing.roundTripMs.toFixed(1)}ms</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">Capture → render</span>
                <span className={analysis.timing.totalLatencyMs > 33 ? "text-red-400" : ""}>
                  {analysis.timing.totalLatencyMs.toFixed(1)}ms
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-gray-400">HW latency</span>
                <span>{analysis.timing.pipelineLatencyMs.toFixed(1)}ms</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
