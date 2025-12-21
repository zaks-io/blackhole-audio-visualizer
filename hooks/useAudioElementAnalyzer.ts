"use client";

import { useRef, useCallback, useEffect } from "react";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import type { WorkerInput, WorkerOutput } from "@/lib/workers/audioAnalysisTypes";
import type { AnalyzedAudio } from "./useAudioAnalyzer";

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

export interface UseAudioElementAnalyzerOptions {
  fftSize?: number;
}

export function useAudioElementAnalyzer(
  audioElement: HTMLAudioElement | null,
  options: UseAudioElementAnalyzerOptions = {}
) {
  const { fftSize = 512 } = options;

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const isConnectedRef = useRef(false);
  const analysisRef = useRef<AnalyzedAudio>({ ...DEFAULT_ANALYSIS });
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const connectedElementRef = useRef<HTMLAudioElement | null>(null);

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(
      new URL("../lib/workers/audioAnalysis.worker.ts", import.meta.url)
    );

    workerRef.current.onmessage = (e: MessageEvent<WorkerOutput>) => {
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

    return () => {
      workerRef.current?.terminate();
      workerRef.current = null;
    };
  }, []);

  const startAnalysisLoop = useCallback(() => {
    const loop = () => {
      const analyser = analyserRef.current;
      const frequencyData = frequencyDataRef.current;
      const worker = workerRef.current;

      if (analyser && frequencyData && worker && isConnectedRef.current) {
        analyser.getByteFrequencyData(frequencyData);

        const bandCount = Math.floor(useVisualizationControls.getState().emitterCount);

        const dataCopy = new Uint8Array(frequencyData);
        const message: WorkerInput = {
          type: "analyze",
          frequencyData: dataCopy,
          sampleRate: audioContextRef.current?.sampleRate ?? 48000,
          fftSize: analyser.fftSize,
          bandCount,
          onsetDecay: 0.92,
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

  const disconnect = useCallback(() => {
    stopAnalysisLoop();

    // Don't close the AudioContext - once an element is connected via
    // createMediaElementSource, closing the context breaks the element forever.
    // We just stop the analysis loop and reset state.
    sourceRef.current = null;
    analyserRef.current = null;
    frequencyDataRef.current = null;
    isConnectedRef.current = false;
    connectedElementRef.current = null;

    workerRef.current?.postMessage({ type: "reset" });
    analysisRef.current = { ...DEFAULT_ANALYSIS };
  }, [stopAnalysisLoop]);

  const connect = useCallback(
    async (element: HTMLAudioElement) => {
      // Already connected to this element
      if (connectedElementRef.current === element && isConnectedRef.current) {
        return;
      }

      // If we have an existing connection to a different element, just stop the loop
      // but keep the context (it can't be reused for the new element anyway)
      if (isConnectedRef.current) {
        stopAnalysisLoop();
        isConnectedRef.current = false;
      }

      try {
        // Create new AudioContext for this element
        const audioContext = new AudioContext();

        if (audioContext.state === "suspended") {
          await audioContext.resume();
        }

        const source = audioContext.createMediaElementSource(element);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = fftSize;
        analyser.smoothingTimeConstant = 0.8;

        source.connect(analyser);
        analyser.connect(audioContext.destination);

        // Close old context if exists
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }

        audioContextRef.current = audioContext;
        sourceRef.current = source;
        analyserRef.current = analyser;
        frequencyDataRef.current = new Uint8Array(analyser.frequencyBinCount);
        isConnectedRef.current = true;
        connectedElementRef.current = element;

        startAnalysisLoop();
      } catch (error) {
        console.error("Failed to connect audio element to analyzer:", error);
      }
    },
    [fftSize, stopAnalysisLoop, startAnalysisLoop]
  );

  // Connect when audio element changes
  useEffect(() => {
    if (audioElement) {
      connect(audioElement);
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [audioElement, connect, disconnect]);

  // Close AudioContext on unmount only
  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  const getAnalysis = useCallback((): AnalyzedAudio => {
    return analysisRef.current;
  }, []);

  const isConnected = useCallback(() => isConnectedRef.current, []);

  return {
    getAnalysis,
    isConnected,
  };
}
