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

// Shared AudioContext singleton for resuming during user gestures
let sharedAudioContext: AudioContext | null = null;

export function getSharedAudioContext(): AudioContext {
  if (!sharedAudioContext) {
    sharedAudioContext = new AudioContext();
  }
  return sharedAudioContext;
}

export async function resumeAudioContext(): Promise<void> {
  const ctx = getSharedAudioContext();
  if (ctx.state === "suspended") {
    await ctx.resume();
  }
}

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
  spectrum: new Float32Array(128),
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
let scenePipelineLatencyMs = 0;

// Pre-allocated buffers for worker output - copied in place to avoid GC pressure
const sceneAnalysisBuffers = {
  spectrum: new Float32Array(128),
  bandOnsets: new Float32Array(MAX_BANDS),
  bandEnergies: new Float32Array(MAX_BANDS),
};

// Shared analysis ref for scene mode - use pre-allocated buffers
const sceneAnalysisRef = {
  current: {
    ...DEFAULT_ANALYSIS,
    spectrum: sceneAnalysisBuffers.spectrum,
    bandOnsets: sceneAnalysisBuffers.bandOnsets,
    bandEnergies: sceneAnalysisBuffers.bandEnergies,
  } as AnalyzedAudio,
};

function initSceneWorker() {
  if (sceneWorkerInitialized || typeof window === "undefined") return;

  sceneWorker = new Worker(new URL("../lib/workers/audioAnalysis.worker.ts", import.meta.url));

  sceneWorker.onmessage = (e: MessageEvent<WorkerOutput>) => {
    if (e.data.type === "result") {
      const result = e.data;
      const current = sceneAnalysisRef.current;

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
      const specLen = Math.min(result.spectrum.length, sceneAnalysisBuffers.spectrum.length);
      for (let i = 0; i < specLen; i++) {
        sceneAnalysisBuffers.spectrum[i] = result.spectrum[i];
      }
      const bandLen = Math.min(result.bandOnsets.length, MAX_BANDS);
      for (let i = 0; i < bandLen; i++) {
        sceneAnalysisBuffers.bandOnsets[i] = result.bandOnsets[i];
        sceneAnalysisBuffers.bandEnergies[i] = result.bandEnergies[i];
      }

      current.bandCount = result.bandCount;
      current.peakHistory = result.peakHistory;
      current.bpm = result.bpm;
      current.bpmConfidence = result.bpmConfidence;
      current.beatPhase = result.beatPhase;
      current.nextBeatMs = result.nextBeatMs;
      current.pipelineLatencyMs = scenePipelineLatencyMs;

      const resultReceivedAt = performance.now();
      current.timing.workerProcessMs = result.workerProcessMs;
      current.timing.roundTripMs = resultReceivedAt - result.timestamp;
      current.timing.pipelineLatencyMs = scenePipelineLatencyMs;
    }
  };

  sceneWorkerInitialized = true;
}

function startSceneAnalysisLoop() {
  const loop = () => {
    if (sceneAnalyserNode && sceneFrequencyData && sceneWorker && sceneIsConnected) {
      sceneAnalyserNode.getByteFrequencyData(sceneFrequencyData);

      const bandCount = Math.floor(useVisualizationControls.getState().emitterCount);

      const message: WorkerInput = {
        type: "analyze",
        frequencyData: sceneFrequencyData, // postMessage structured clone handles copying
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
    sceneAnalysisRef.current = {
      ...DEFAULT_ANALYSIS,
      spectrum: sceneAnalysisBuffers.spectrum,
      bandOnsets: sceneAnalysisBuffers.bandOnsets,
      bandEnergies: sceneAnalysisBuffers.bandEnergies,
    };
    sceneAnalysisBuffers.spectrum.fill(0);
    sceneAnalysisBuffers.bandOnsets.fill(0);
    sceneAnalysisBuffers.bandEnergies.fill(0);
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
          audioContext = getSharedAudioContext();
          const source = audioContext.createMediaElementSource(element);
          analyser = audioContext.createAnalyser();
          analyser.fftSize = fftSizeRef.current;
          analyser.smoothingTimeConstant = 0.3;
          source.connect(analyser);
          analyser.connect(audioContext.destination);
          // Measure pipeline latency for beat sync compensation
          const hardwareLatencyMs =
            ((audioContext.baseLatency ?? 0) +
              ((audioContext as unknown as { outputLatency?: number }).outputLatency ?? 0)) *
              1000 +
            (analyser.fftSize / audioContext.sampleRate) * 1000;
          scenePipelineLatencyMs = hardwareLatencyMs + 16;
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
    analysisRef: sceneAnalysisRef,
  };
}
