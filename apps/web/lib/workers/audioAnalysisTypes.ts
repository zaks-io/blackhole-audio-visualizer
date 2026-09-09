/**
 * Types for audio analysis Web Worker communication.
 */

export interface AudioEnergy {
  overall: number;
  subBass: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  high: number;
}

export interface AudioPeaks {
  spectralFlux: boolean;
  hfc: boolean;
  bass: boolean;
  high: boolean;
}

export interface AudioRaw {
  spectralFlux: number;
  hfc: number;
  rms: number;
  spectralCentroid: number;
  spectralFlatness: number;
  spectralRolloff: number;
  zcr: number;
  perceptualSharpness: number;
}

export interface AudioThresholds {
  spectralFlux: { mean: number; threshold: number };
  hfc: { mean: number; threshold: number };
  bass: { mean: number; threshold: number };
  high: { mean: number; threshold: number };
}

export interface WorkerAnalyzeMessage {
  type: "analyze";
  frequencyData: Uint8Array;
  sampleRate: number;
  fftSize: number;
  bandCount: number;
  onsetDecay: number;
  timestamp: number;
}

export interface WorkerResetMessage {
  type: "reset";
}

export interface WorkerSetDecayMessage {
  type: "setDecay";
  decay: number;
}

export type WorkerInput = WorkerAnalyzeMessage | WorkerResetMessage | WorkerSetDecayMessage;

export interface AudioTiming {
  workerProcessMs: number;
  roundTripMs: number;
  totalLatencyMs: number;
  pipelineLatencyMs: number;
}

export interface WorkerResultMessage {
  type: "result";
  timestamp: number;
  energy: AudioEnergy;
  peaks: AudioPeaks;
  /** Normalized strength (0-1) of a bass onset on this frame, 0 when none */
  bassOnset: number;
  raw: AudioRaw;
  thresholds: AudioThresholds;
  spectrum: Float32Array;
  bandOnsets: Float32Array;
  bandEnergies: Float32Array;
  bandCount: number;
  peakHistory: Array<{ time: number; type: "flux" | "hfc" | "bass" | "high" }>;
  bpm: number;
  bpmConfidence: number;
  beatPhase: number;
  nextBeatMs: number;
  workerProcessMs: number;
}

export type WorkerOutput = WorkerResultMessage;
