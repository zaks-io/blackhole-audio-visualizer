"use client";

import { useRef, useCallback, useEffect } from "react";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import type { WorkerInput, WorkerOutput } from "@/lib/workers/audioAnalysisTypes";
import type { AnalyzedAudio } from "./useAudioAnalyzer";

const MAX_BANDS = 36;

// Cache AudioContext per audio element - an element can only have one MediaElementAudioSourceNode
const audioContextCache = new WeakMap<
  HTMLAudioElement,
  {
    context: AudioContext;
    source: MediaElementAudioSourceNode;
    analyser: AnalyserNode;
    mediaStreamDestination: MediaStreamAudioDestinationNode;
  }
>();

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
      if (isConnectedRef.current) {
        stopAnalysisLoop();
        isConnectedRef.current = false;
      }

      try {
        // Check cache for existing AudioContext, source, and analyser
        const cached = audioContextCache.get(element);
        let audioContext: AudioContext;
        let source: MediaElementAudioSourceNode;
        let analyser: AnalyserNode;

        if (cached) {
          // Reuse cached context, source, and analyser
          audioContext = cached.context;
          source = cached.source;
          analyser = cached.analyser;
        } else {
          // First time connecting this element - create and cache
          audioContext = new AudioContext();
          source = audioContext.createMediaElementSource(element);
          analyser = audioContext.createAnalyser();
          analyser.fftSize = fftSize;
          analyser.smoothingTimeConstant = 0.8;
          source.connect(analyser);
          analyser.connect(audioContext.destination);
          // Create MediaStreamDestination for recording
          const mediaStreamDestination = audioContext.createMediaStreamDestination();
          source.connect(mediaStreamDestination);
          audioContextCache.set(element, {
            context: audioContext,
            source,
            analyser,
            mediaStreamDestination,
          });
        }

        if (audioContext.state === "suspended") {
          await audioContext.resume();
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

  // Note: We don't close AudioContext on unmount because it's cached in the WeakMap.
  // The WeakMap handles cleanup when the audio element is garbage collected.

  const getAnalysis = useCallback((): AnalyzedAudio => {
    return analysisRef.current;
  }, []);

  const isConnected = useCallback(() => isConnectedRef.current, []);

  const getRecordingStream = useCallback((): MediaStream | null => {
    if (connectedElementRef.current) {
      const cached = audioContextCache.get(connectedElementRef.current);
      return cached?.mediaStreamDestination?.stream ?? null;
    }
    return null;
  }, []);

  return {
    getAnalysis,
    isConnected,
    getRecordingStream,
  };
}
