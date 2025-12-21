"use client";

import { useCallback, useEffect, useRef } from "react";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";
import { useAudioConnectionState } from "./useAudioConnectionState";
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

// Module-level singletons for scene audio - shared across all hook instances
let sceneAudioContext: AudioContext | null = null;
let sceneAnalyserNode: AnalyserNode | null = null;
let sceneWorker: Worker | null = null;
let sceneIsConnected = false;
let sceneFrequencyData: Uint8Array<ArrayBuffer> | null = null;
let sceneRafId: number | null = null;
let sceneConnectedElement: HTMLAudioElement | null = null;
let sceneWorkerInitialized = false;

// Shared analysis ref for scene mode
const sceneAnalysisRef = { current: { ...DEFAULT_ANALYSIS } as AnalyzedAudio };

function initSceneWorker() {
  if (sceneWorkerInitialized || typeof window === "undefined") return;

  sceneWorker = new Worker(new URL("../lib/workers/audioAnalysis.worker.ts", import.meta.url));

  sceneWorker.onmessage = (e: MessageEvent<WorkerOutput>) => {
    if (e.data.type === "result") {
      const result = e.data;
      sceneAnalysisRef.current = {
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

  sceneWorkerInitialized = true;
}

function startSceneAnalysisLoop() {
  const loop = () => {
    if (sceneAnalyserNode && sceneFrequencyData && sceneWorker && sceneIsConnected) {
      sceneAnalyserNode.getByteFrequencyData(sceneFrequencyData);

      const bandCount = Math.floor(useVisualizationControls.getState().emitterCount);

      const dataCopy = new Uint8Array(sceneFrequencyData);
      const message: WorkerInput = {
        type: "analyze",
        frequencyData: dataCopy,
        sampleRate: sceneAudioContext?.sampleRate ?? 48000,
        fftSize: sceneAnalyserNode.fftSize,
        bandCount,
        onsetDecay: 0.92,
        timestamp: performance.now(),
      };
      sceneWorker.postMessage(message);
    }

    if (sceneIsConnected) {
      sceneRafId = requestAnimationFrame(loop);
    }
  };

  sceneRafId = requestAnimationFrame(loop);
}

function stopSceneAnalysisLoop() {
  if (sceneRafId !== null) {
    cancelAnimationFrame(sceneRafId);
    sceneRafId = null;
  }
}

export function useAudioElementAnalyzer(
  audioElement: HTMLAudioElement | null,
  options: UseAudioElementAnalyzerOptions = {}
) {
  const { fftSize = 512 } = options;
  const fftSizeRef = useRef(fftSize);
  const setSceneConnected = useAudioConnectionState((s) => s.setSceneConnected);

  // Initialize worker once
  useEffect(() => {
    initSceneWorker();
  }, []);

  const disconnect = useCallback(() => {
    stopSceneAnalysisLoop();

    // Don't close the AudioContext - once an element is connected via
    // createMediaElementSource, closing the context breaks the element forever.
    sceneAnalyserNode = null;
    sceneFrequencyData = null;
    sceneIsConnected = false;
    sceneConnectedElement = null;

    sceneWorker?.postMessage({ type: "reset" });
    sceneAnalysisRef.current = { ...DEFAULT_ANALYSIS };
    setSceneConnected(false);
  }, [setSceneConnected]);

  const connect = useCallback(
    async (element: HTMLAudioElement) => {
      // Already connected to this element
      if (sceneConnectedElement === element && sceneIsConnected) {
        return;
      }

      // If we have an existing connection to a different element, just stop the loop
      if (sceneIsConnected) {
        stopSceneAnalysisLoop();
        sceneIsConnected = false;
      }

      initSceneWorker();

      try {
        // Check cache for existing AudioContext, source, and analyser
        const cached = audioContextCache.get(element);
        let audioContext: AudioContext;
        let analyser: AnalyserNode;

        if (cached) {
          // Reuse cached context, source, and analyser
          audioContext = cached.context;
          analyser = cached.analyser;
        } else {
          // First time connecting this element - create and cache
          audioContext = new AudioContext();
          const source = audioContext.createMediaElementSource(element);
          analyser = audioContext.createAnalyser();
          analyser.fftSize = fftSizeRef.current;
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

        sceneAudioContext = audioContext;
        sceneAnalyserNode = analyser;
        sceneFrequencyData = new Uint8Array(analyser.frequencyBinCount);
        sceneIsConnected = true;
        sceneConnectedElement = element;
        setSceneConnected(true);

        startSceneAnalysisLoop();
      } catch (error) {
        console.error("Failed to connect audio element to analyzer:", error);
      }
    },
    [setSceneConnected]
  );

  // Connect when audio element changes
  useEffect(() => {
    if (audioElement) {
      connect(audioElement);
    }
    // Don't disconnect when called with null - another component might own the singleton

    return () => {
      // Only disconnect on unmount if we were the one who connected
      if (audioElement) {
        disconnect();
      }
    };
  }, [audioElement, connect, disconnect]);

  const getAnalysis = useCallback((): AnalyzedAudio => {
    return sceneAnalysisRef.current;
  }, []);

  const isConnected = useCallback(() => sceneIsConnected, []);

  const getRecordingStream = useCallback((): MediaStream | null => {
    if (sceneConnectedElement) {
      const cached = audioContextCache.get(sceneConnectedElement);
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
