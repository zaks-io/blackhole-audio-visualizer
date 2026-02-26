/**
 * Centralized audio and particle type definitions for non-GPU components.
 * GPU/shader types remain in their respective component files.
 */

export type {
  AudioEnergy,
  AudioPeaks,
  AudioRaw,
  AudioThresholds,
  WorkerAnalyzeMessage,
  WorkerResetMessage,
  WorkerSetDecayMessage,
  WorkerInput,
  WorkerResultMessage,
  WorkerOutput,
} from "@/lib/workers/audioAnalysisTypes";

// Shared audio analysis data shape passed from useAudioAnalyzer to consumers
export interface AudioAnalyzerData {
  bandEnergies: Float32Array;
  bandOnsets: Float32Array;
  energy: {
    overall: number;
    subBass: number;
    bass: number;
    lowMid: number;
    mid: number;
    highMid: number;
    high: number;
  };
  peaks: {
    spectralFlux: boolean;
    hfc: boolean;
    bass: boolean;
    high: boolean;
  };
}
