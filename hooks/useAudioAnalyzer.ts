"use client";

import { useCallback, useEffect, useRef } from "react";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import type { WorkerInput, WorkerOutput } from "@/lib/workers/audioAnalysisTypes";

export interface AnalyzedAudio {
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
}

const MAX_BANDS = 36;

const DEFAULT_ANALYSIS: AnalyzedAudio = {
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
  spectrum: new Float32Array(128),
  bandOnsets: new Float32Array(MAX_BANDS),
  bandEnergies: new Float32Array(MAX_BANDS),
  bandCount: MAX_BANDS,
  peakHistory: [],
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

// Shared analysis ref - all components read from here
const analysisRef = { current: { ...DEFAULT_ANALYSIS } as AnalyzedAudio };

function initWorker() {
  if (workerInitialized || typeof window === "undefined") return;

  worker = new Worker(new URL("../lib/workers/audioAnalysis.worker.ts", import.meta.url));

  worker.onmessage = (e: MessageEvent<WorkerOutput>) => {
    if (e.data.type === "result") {
      const result = e.data;
      analysisRef.current = {
        energy: result.energy,
        peaks: result.peaks,
        raw: result.raw,
        thresholds: result.thresholds,
        spectrum: result.spectrum,
        bandOnsets: result.bandOnsets,
        bandEnergies: result.bandEnergies,
        bandCount: result.bandCount,
        peakHistory: result.peakHistory,
      };
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
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);

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
    analysisRef.current = { ...DEFAULT_ANALYSIS };
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
