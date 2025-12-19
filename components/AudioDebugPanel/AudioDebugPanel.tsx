"use client";

import type { RefObject } from "react";
import { useState, useEffect } from "react";
import type { AudioAnalysis } from "@/hooks/useAudioTriggers";

interface AudioDebugPanelProps {
  analysisRef: RefObject<AudioAnalysis | null>;
}

function ProgressBar({
  value,
  label,
  color = "blue",
}: {
  value: number;
  label: string;
  color?: string;
}) {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
    purple: "bg-purple-500",
    cyan: "bg-cyan-500",
  };

  return (
    <div className="mb-2">
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className="font-mono text-white">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-700">
        <div
          className={`h-full transition-all duration-75 ${colorClasses[color] || colorClasses.blue}`}
          style={{ width: `${Math.min(100, value * 100)}%` }}
        />
      </div>
    </div>
  );
}

export function AudioDebugPanel({ analysisRef }: AudioDebugPanelProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [analysis, setAnalysis] = useState<AudioAnalysis | null>(null);

  // Poll the ref at 10Hz for UI updates (debug panel doesn't need 60fps)
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setAnalysis(analysisRef.current);
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, analysisRef]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed left-6 top-20 z-50 rounded-lg border border-gray-700 bg-gray-900/90 px-3 py-2 text-sm text-white shadow-xl backdrop-blur-sm hover:bg-gray-800"
      >
        Audio
      </button>
    );
  }

  const spectral = analysis?.spectral;

  return (
    <div className="fixed left-6 top-6 z-50 w-72 rounded-lg border border-gray-700 bg-gray-900/90 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-gray-700 p-3">
        <h3 className="text-sm font-semibold text-white">Audio Analysis</h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-400 hover:text-white"
          title="Hide panel"
        >
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

      <div className="max-h-[calc(100vh-120px)] overflow-y-auto p-3">
        {/* Continuous Values */}
        <div className="mb-4">
          <div className="mb-2 text-xs font-medium text-gray-300">Continuous Values</div>
          <ProgressBar value={analysis?.intensity || 0} label="Intensity (RMS)" color="blue" />
          <ProgressBar value={analysis?.brightness || 0} label="Brightness" color="yellow" />
          <ProgressBar value={analysis?.density || 0} label="Density" color="cyan" />
        </div>

        {/* Spectral Features */}
        <div className="mb-4">
          <div className="mb-2 text-xs font-medium text-gray-300">Spectral Features</div>
          <ProgressBar value={spectral?.rms || 0} label="RMS (Loudness)" color="blue" />
          <ProgressBar
            value={spectral?.spectralCentroid || 0}
            label="Centroid (Brightness)"
            color="yellow"
          />
          <ProgressBar value={spectral?.spectralFlux || 0} label="Flux (Onset)" color="cyan" />
          <ProgressBar value={spectral?.bassEnergy || 0} label="Bass Energy" color="red" />
          <ProgressBar value={spectral?.subBassRatio || 0} label="Sub-Bass Ratio" color="red" />
          <ProgressBar
            value={spectral?.perceptualSharpness || 0}
            label="Sharpness"
            color="purple"
          />
        </div>
      </div>
    </div>
  );
}
