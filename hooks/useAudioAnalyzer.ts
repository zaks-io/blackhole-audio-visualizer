"use client";

import { useRef, useCallback, useEffect } from "react";
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

export function useAudioAnalyzer(options: UseAudioAnalyzerOptions = {}) {
  const { onsetDecay = 0.92, fftSize = 512 } = options;

  // Audio nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Worker
  const workerRef = useRef<Worker | null>(null);

  // Analysis state - cached result from worker
  const isConnectedRef = useRef(false);
  const analysisRef = useRef<AnalyzedAudio>({ ...DEFAULT_ANALYSIS });

  // Reusable buffer for FFT data
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  // Animation frame for sending data to worker
  const rafIdRef = useRef<number | null>(null);
  const onsetDecayRef = useRef(onsetDecay);

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../lib/workers/audioAnalysis.worker.ts", import.meta.url)
    );

    workerRef.current.onmessage = (e: MessageEvent<WorkerOutput>) => {
      if (e.data.type === "result") {
        // Update cached analysis with worker result
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

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  // Animation loop to send data to worker
  const startAnalysisLoop = useCallback(() => {
    const loop = () => {
      const analyser = analyserRef.current;
      const frequencyData = frequencyDataRef.current;
      const worker = workerRef.current;

      if (analyser && frequencyData && worker && isConnectedRef.current) {
        // Get FFT data from AnalyserNode
        analyser.getByteFrequencyData(frequencyData);

        // Get band count from store
        const bandCount = Math.floor(useVisualizationControls.getState().emitterCount);

        // Send to worker for analysis
        // Copy the data to avoid issues with buffer detachment
        const dataCopy = new Uint8Array(frequencyData);
        const message: WorkerInput = {
          type: "analyze",
          frequencyData: dataCopy,
          sampleRate: audioContextRef.current?.sampleRate ?? 48000,
          fftSize: analyser.fftSize,
          bandCount,
          onsetDecay: onsetDecayRef.current,
          timestamp: performance.now(),
        };
        worker.postMessage(message);
      }

      if (isConnectedRef.current) {
        rafIdRef.current = requestAnimationFrame(loop);
      }
    };

    rafIdRef.current = requestAnimationFrame(loop);
  }, []);

  const stopAnalysisLoop = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  // Update onset decay
  const setOnsetDecay = useCallback((decay: number) => {
    onsetDecayRef.current = decay;
    workerRef.current?.postMessage({ type: "setDecay", decay });
  }, []);

  // Connect to audio source
  const connect = useCallback(
    async (externalStream?: MediaStream) => {
      if (isConnectedRef.current) return;

      let stream: MediaStream;
      try {
        stream =
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

      streamRef.current = stream;
      const audioContext = new AudioContext();

      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = fftSize;
      analyser.smoothingTimeConstant = 0.8;

      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);

      isConnectedRef.current = true;

      // Start sending data to worker
      startAnalysisLoop();
    },
    [fftSize, startAnalysisLoop]
  );

  // Disconnect from audio source
  const disconnect = useCallback(() => {
    stopAnalysisLoop();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    frequencyDataRef.current = null;
    isConnectedRef.current = false;

    // Reset worker state
    workerRef.current?.postMessage({ type: "reset" });

    analysisRef.current = { ...DEFAULT_ANALYSIS };
  }, [stopAnalysisLoop]);

  // Get current analysis - just returns cached result, no computation
  const getAnalysis = useCallback((): AnalyzedAudio => {
    return analysisRef.current;
  }, []);

  const getStream = useCallback(() => streamRef.current, []);

  const isConnected = useCallback(() => isConnectedRef.current, []);

  return {
    connect,
    disconnect,
    getAnalysis,
    getStream,
    isConnected,
    setOnsetDecay,
    analysisRef,
  };
}
