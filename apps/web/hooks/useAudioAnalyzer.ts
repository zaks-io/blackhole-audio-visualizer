"use client";

import { useCallback, useEffect, useRef } from "react";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import type { AudioTiming, WorkerInput, WorkerOutput } from "@/lib/workers/audioAnalysisTypes";

export interface AnalyzedAudio {
  timestamp: number;
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
  raw: {
    spectralFlux: number;
    hfc: number;
    rms: number;
    spectralCentroid: number;
    spectralFlatness: number;
    spectralRolloff: number;
    zcr: number;
    perceptualSharpness: number;
  };
  thresholds: {
    spectralFlux: { mean: number; threshold: number };
    hfc: { mean: number; threshold: number };
    bass: { mean: number; threshold: number };
    high: { mean: number; threshold: number };
  };
  spectrum: Float32Array;
  bandOnsets: Float32Array;
  bandEnergies: Float32Array;
  bandCount: number;
  peakHistory: Array<{ time: number; type: "flux" | "hfc" | "bass" | "high" }>;
  bpm: number;
  bpmConfidence: number;
  beatPhase: number;
  nextBeatMs: number;
  pipelineLatencyMs: number;
  timing: AudioTiming;
}

const MAX_BANDS = 36;

const DEFAULT_ANALYSIS: AnalyzedAudio = {
  timestamp: 0,
  energy: {
    overall: 0,
    subBass: 0,
    bass: 0,
    lowMid: 0,
    mid: 0,
    highMid: 0,
    high: 0,
  },
  peaks: {
    spectralFlux: false,
    hfc: false,
    bass: false,
    high: false,
  },
  raw: {
    spectralFlux: 0,
    hfc: 0,
    rms: 0,
    spectralCentroid: 0,
    spectralFlatness: 0,
    spectralRolloff: 0,
    zcr: 0,
    perceptualSharpness: 0,
  },
  thresholds: {
    spectralFlux: { mean: 0, threshold: 0 },
    hfc: { mean: 0, threshold: 0 },
    bass: { mean: 0, threshold: 0 },
    high: { mean: 0, threshold: 0 },
  },
  spectrum: new Float32Array(256),
  bandOnsets: new Float32Array(MAX_BANDS),
  bandEnergies: new Float32Array(MAX_BANDS),
  bandCount: MAX_BANDS,
  peakHistory: [],
  bpm: 80,
  bpmConfidence: 0,
  beatPhase: 0,
  nextBeatMs: 0,
  pipelineLatencyMs: 0,
  timing: { workerProcessMs: 0, roundTripMs: 0, totalLatencyMs: 0, pipelineLatencyMs: 0 },
};

export interface UseAudioAnalyzerOptions {
  onsetDecay?: number;
  fftSize?: number;
}

// Module-level singletons - shared across all hook instances
let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let stream: MediaStream | null = null;
let worker: Worker | null = null;
let isConnected = false;
let frequencyData: Uint8Array<ArrayBuffer> | null = null;
let rafId: number | null = null;
let onsetDecay = 0.92;
let workerInitialized = false;
let pipelineLatencyMs = 0;

// Pre-allocated buffers for worker output - copied in place to avoid GC pressure
const analysisBuffers = {
  spectrum: new Float32Array(256),
  bandOnsets: new Float32Array(MAX_BANDS),
  bandEnergies: new Float32Array(MAX_BANDS),
};

// Shared analysis ref - all components read from here
// Use the pre-allocated buffers for typed arrays
const analysisRef = {
  current: {
    ...DEFAULT_ANALYSIS,
    spectrum: analysisBuffers.spectrum,
    bandOnsets: analysisBuffers.bandOnsets,
    bandEnergies: analysisBuffers.bandEnergies,
  } as AnalyzedAudio,
};

function initWorker() {
  if (workerInitialized || typeof window === "undefined") return;

  worker = new Worker(new URL("../lib/workers/audioAnalysis.worker.ts", import.meta.url));

  worker.onerror = (e) => {
    console.error("[AudioWorker] Worker error:", e.message, e);
  };

  worker.onmessage = (e: MessageEvent<WorkerOutput>) => {
    if (e.data.type === "result") {
      const result = e.data;
      const current = analysisRef.current;

      // Mutate in-place to avoid per-frame object allocations
      current.timestamp = result.timestamp;

      // Energy (nested object)
      current.energy.overall = result.energy.overall;
      current.energy.subBass = result.energy.subBass;
      current.energy.bass = result.energy.bass;
      current.energy.lowMid = result.energy.lowMid;
      current.energy.mid = result.energy.mid;
      current.energy.highMid = result.energy.highMid;
      current.energy.high = result.energy.high;

      // Peaks (nested object)
      current.peaks.spectralFlux = result.peaks.spectralFlux;
      current.peaks.hfc = result.peaks.hfc;
      current.peaks.bass = result.peaks.bass;
      current.peaks.high = result.peaks.high;

      // Raw (nested object)
      current.raw.spectralFlux = result.raw.spectralFlux;
      current.raw.hfc = result.raw.hfc;
      current.raw.rms = result.raw.rms;
      current.raw.spectralCentroid = result.raw.spectralCentroid;
      current.raw.spectralFlatness = result.raw.spectralFlatness;
      current.raw.spectralRolloff = result.raw.spectralRolloff;
      current.raw.zcr = result.raw.zcr;
      current.raw.perceptualSharpness = result.raw.perceptualSharpness;

      // Thresholds (nested object with sub-objects)
      current.thresholds.spectralFlux.mean = result.thresholds.spectralFlux.mean;
      current.thresholds.spectralFlux.threshold = result.thresholds.spectralFlux.threshold;
      current.thresholds.hfc.mean = result.thresholds.hfc.mean;
      current.thresholds.hfc.threshold = result.thresholds.hfc.threshold;
      current.thresholds.bass.mean = result.thresholds.bass.mean;
      current.thresholds.bass.threshold = result.thresholds.bass.threshold;
      current.thresholds.high.mean = result.thresholds.high.mean;
      current.thresholds.high.threshold = result.thresholds.high.threshold;

      // Typed arrays - copy into pre-allocated buffers
      const specLen = Math.min(result.spectrum.length, analysisBuffers.spectrum.length);
      for (let i = 0; i < specLen; i++) {
        analysisBuffers.spectrum[i] = result.spectrum[i];
      }
      const bandLen = Math.min(result.bandOnsets.length, MAX_BANDS);
      for (let i = 0; i < bandLen; i++) {
        analysisBuffers.bandOnsets[i] = result.bandOnsets[i];
        analysisBuffers.bandEnergies[i] = result.bandEnergies[i];
      }

      current.bandCount = result.bandCount;
      current.peakHistory = result.peakHistory;
      current.bpm = result.bpm;
      current.bpmConfidence = result.bpmConfidence;
      current.beatPhase = result.beatPhase;
      current.nextBeatMs = result.nextBeatMs;
      current.pipelineLatencyMs = pipelineLatencyMs;

      // Timing instrumentation
      const resultReceivedAt = performance.now();
      current.timing.workerProcessMs = result.workerProcessMs;
      current.timing.roundTripMs = resultReceivedAt - result.timestamp;
      current.timing.pipelineLatencyMs = pipelineLatencyMs;
    }
  };

  workerInitialized = true;
}

function startAnalysisLoop() {
  const loop = () => {
    if (analyserNode && frequencyData && worker && isConnected) {
      analyserNode.getByteFrequencyData(frequencyData);

      const bandCount = Math.floor(useVisualizationControls.getState().emitterCount);

      const message: WorkerInput = {
        type: "analyze",
        frequencyData: frequencyData, // postMessage will clone this
        sampleRate: audioContext?.sampleRate ?? 48000,
        fftSize: analyserNode.fftSize,
        bandCount,
        onsetDecay,
        timestamp: performance.now(),
      };
      worker.postMessage(message);
    }

    if (isConnected) {
      rafId = requestAnimationFrame(loop);
    }
  };

  rafId = requestAnimationFrame(loop);
}

function stopAnalysisLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

export function useAudioAnalyzer(options: UseAudioAnalyzerOptions = {}) {
  const { onsetDecay: initialOnsetDecay = 0.92, fftSize = 512 } = options;
  const fftSizeRef = useRef(fftSize);

  // Initialize worker once
  useEffect(() => {
    initWorker();
  }, []);

  const setOnsetDecayValue = useCallback((decay: number) => {
    onsetDecay = decay;
    worker?.postMessage({ type: "setDecay", decay });
  }, []);

  const connect = useCallback(
    async (externalStream?: MediaStream) => {
      if (isConnected) return;

      initWorker();

      let mediaStream: MediaStream;
      try {
        mediaStream =
          externalStream ??
          (await navigator.mediaDevices.getUserMedia({
            audio: {
              sampleRate: 48000,
              channelCount: 2,
              echoCancellation: false,
              noiseSuppression: false,
              autoGainControl: false,
            },
          }));
      } catch (err) {
        throw err;
      }

      stream = mediaStream;
      audioContext = new AudioContext();

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(mediaStream);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = fftSizeRef.current;
      analyser.smoothingTimeConstant = 0.3;

      source.connect(analyser);

      // Measure pipeline latency for beat sync compensation
      // Hardware: audio device buffer + FFT window
      // Software: ~1 frame for RAF scheduling + worker round-trip
      // Mic capture: outputLatency is irrelevant (no playback), only baseLatency + FFT window matter
      const hardwareLatencyMs =
        (audioContext.baseLatency ?? 0) * 1000 +
        (analyser.fftSize / audioContext.sampleRate) * 1000;
      const softwareLatencyMs = 16; // ~1 frame at 60fps for RAF + worker round-trip
      pipelineLatencyMs = hardwareLatencyMs + softwareLatencyMs;

      analyserNode = analyser;
      frequencyData = new Uint8Array(analyser.frequencyBinCount);
      isConnected = true;
      onsetDecay = initialOnsetDecay;

      startAnalysisLoop();
    },
    [initialOnsetDecay]
  );

  const disconnect = useCallback(() => {
    stopAnalysisLoop();

    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    if (audioContext) {
      audioContext.close();
      audioContext = null;
    }
    analyserNode = null;
    frequencyData = null;
    isConnected = false;

    worker?.postMessage({ type: "reset" });
    analysisRef.current = {
      ...DEFAULT_ANALYSIS,
      spectrum: analysisBuffers.spectrum,
      bandOnsets: analysisBuffers.bandOnsets,
      bandEnergies: analysisBuffers.bandEnergies,
    };
    analysisBuffers.spectrum.fill(0);
    analysisBuffers.bandOnsets.fill(0);
    analysisBuffers.bandEnergies.fill(0);
  }, []);

  const getAnalysis = useCallback((): AnalyzedAudio => {
    return analysisRef.current;
  }, []);

  const getStream = useCallback(() => stream, []);

  const isConnectedFn = useCallback(() => isConnected, []);

  return {
    connect,
    disconnect,
    getAnalysis,
    getStream,
    isConnected: isConnectedFn,
    setOnsetDecay: setOnsetDecayValue,
    analysisRef,
  };
}
