"use client";

import { useRef, useCallback, useMemo } from "react";
import Meyda from "meyda";
import {
  AdaptiveThreshold,
  SimpleEnvelope,
  Smoother,
  AutoNormalizer,
  MultiSmoother,
  computeSpectralFlux,
  computeHFC,
  extractBandEnergies,
  extractLogBandEnergies,
} from "@/lib/audio";
import { useVisualizationControls } from "@/hooks/useVisualizationControls";

type MeydaAnalyzer = ReturnType<typeof Meyda.createMeydaAnalyzer>;

interface MeydaFeatures {
  rms?: number;
  spectralCentroid?: number;
  spectralFlatness?: number;
  spectralRolloff?: number;
  zcr?: number;
  amplitudeSpectrum?: Float32Array;
  loudness?: { specific: Float32Array; total: number };
  perceptualSharpness?: number;
}

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
const PEAK_HISTORY_DURATION_MS = 2000;

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
  smoothingFactor?: number;
  fftSize?: number;
}

export function useAudioAnalyzer(options: UseAudioAnalyzerOptions = {}) {
  const { onsetDecay = 0.92, smoothingFactor = 0.75, fftSize = 512 } = options;

  // Audio nodes
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const meydaAnalyzerRef = useRef<MeydaAnalyzer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Analysis state
  const isConnectedRef = useRef(false);
  const analysisRef = useRef<AnalyzedAudio>({ ...DEFAULT_ANALYSIS });
  const prevSpectrumRef = useRef<Float32Array | null>(null);
  const peakHistoryRef = useRef<Array<{ time: number; type: "flux" | "hfc" | "bass" | "high" }>>(
    []
  );

  // Reusable buffers
  const frequencyDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const bandEnergiesRef = useRef<Float32Array>(new Float32Array(MAX_BANDS));
  const bandOnsetsRef = useRef<Float32Array>(new Float32Array(MAX_BANDS));

  // Frame-based cache to avoid recomputing multiple times per frame
  const lastComputeTimeRef = useRef<number>(0);

  // Meyda features storage
  const meydaFeaturesRef = useRef<MeydaFeatures | null>(null);

  // Analysis utilities - created once
  const utils = useMemo(() => {
    const bandEnvelopes: SimpleEnvelope[] = [];
    for (let i = 0; i < MAX_BANDS; i++) {
      bandEnvelopes.push(new SimpleEnvelope(onsetDecay));
    }

    return {
      thresholds: {
        spectralFlux: new AdaptiveThreshold({
          alpha: 0.1,
          peakMultiplier: 1.5,
          minPeakDistanceMs: 50,
        }),
        hfc: new AdaptiveThreshold({ alpha: 0.1, peakMultiplier: 1.5, minPeakDistanceMs: 30 }),
        bass: new AdaptiveThreshold({ alpha: 0.08, peakMultiplier: 1.8, minPeakDistanceMs: 100 }),
        high: new AdaptiveThreshold({ alpha: 0.12, peakMultiplier: 1.4, minPeakDistanceMs: 30 }),
      },
      smoothers: {
        energy: {
          overall: new Smoother(smoothingFactor),
          subBass: new Smoother(smoothingFactor),
          bass: new Smoother(smoothingFactor),
          lowMid: new Smoother(smoothingFactor),
          mid: new Smoother(smoothingFactor),
          highMid: new Smoother(smoothingFactor),
          high: new Smoother(smoothingFactor),
        },
        spectralFlux: new Smoother(0.8),
        hfc: new Smoother(0.8),
        // Envelope followers for threshold display - instant attack, very slow decay
        // 0.997 = takes ~5 seconds to decay to half
        thresholdDisplay: {
          spectralFlux: new SimpleEnvelope(0.997),
          hfc: new SimpleEnvelope(0.997),
          bass: new SimpleEnvelope(0.997),
          high: new SimpleEnvelope(0.997),
        },
      },
      normalizers: {
        spectralFlux: new AutoNormalizer({ decay: 0.99, minValue: 0.01 }),
        hfc: new AutoNormalizer({ decay: 0.99, minValue: 0.01 }),
        rms: new AutoNormalizer({ decay: 0.995, minValue: 0.01 }),
      },
      bandEnvelopes,
      bandSmoother: new MultiSmoother(MAX_BANDS, smoothingFactor),
    };
  }, [onsetDecay, smoothingFactor]);

  // Update onset decay for all band envelopes
  const setOnsetDecay = useCallback(
    (decay: number) => {
      utils.bandEnvelopes.forEach((env) => env.setDecay(decay));
    },
    [utils]
  );

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

      // Initialize Meyda analyzer
      const meydaAnalyzer = Meyda.createMeydaAnalyzer({
        audioContext,
        source,
        bufferSize: 512,
        featureExtractors: [
          "rms",
          "spectralCentroid",
          "spectralFlatness",
          "spectralRolloff",
          "zcr",
          "amplitudeSpectrum",
          "loudness",
          "perceptualSharpness",
        ],
        callback: (features: MeydaFeatures | null) => {
          if (features) {
            meydaFeaturesRef.current = features;
          }
        },
      });
      meydaAnalyzer.start();
      meydaAnalyzerRef.current = meydaAnalyzer;

      isConnectedRef.current = true;
    },
    [fftSize]
  );

  // Disconnect from audio source
  const disconnect = useCallback(() => {
    if (meydaAnalyzerRef.current) {
      meydaAnalyzerRef.current.stop();
      meydaAnalyzerRef.current = null;
    }
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
    prevSpectrumRef.current = null;
    meydaFeaturesRef.current = null;
    isConnectedRef.current = false;
    peakHistoryRef.current = [];
    lastComputeTimeRef.current = 0;

    // Reset all utilities
    Object.values(utils.thresholds).forEach((t) => t.reset());
    Object.values(utils.smoothers.energy).forEach((s) => s.reset());
    utils.smoothers.spectralFlux.reset();
    utils.smoothers.hfc.reset();
    Object.values(utils.normalizers).forEach((n) => n.reset());
    utils.bandEnvelopes.forEach((e) => e.reset());
    utils.bandSmoother.reset();

    analysisRef.current = { ...DEFAULT_ANALYSIS };
  }, [utils]);

  // Get current analysis (called each frame)
  // Reads emitterCount directly from store to ensure all callers use same value
  const getAnalysis = useCallback((): AnalyzedAudio => {
    const analyser = analyserRef.current;
    const frequencyData = frequencyDataRef.current;
    const meydaFeatures = meydaFeaturesRef.current;

    if (!analyser || !frequencyData || !isConnectedRef.current) {
      return analysisRef.current;
    }

    const currentTime = performance.now();

    // Frame-based cache: skip computation if already done this frame (4ms = 240Hz max)
    if (currentTime - lastComputeTimeRef.current < 4) {
      return analysisRef.current;
    }
    lastComputeTimeRef.current = currentTime;

    // Read emitterCount directly from store - ensures all callers get same value
    // Floor to handle fractional values from GSAP tweens
    const bandCount = Math.floor(useVisualizationControls.getState().emitterCount);
    const clampedBandCount = Math.min(Math.max(1, bandCount), MAX_BANDS);
    const analysis = analysisRef.current;
    const numBins = analyser.frequencyBinCount;
    const sampleRate = audioContextRef.current?.sampleRate ?? 48000;

    // Get FFT data
    analyser.getByteFrequencyData(frequencyData);

    // Convert to Float32Array for spectrum (normalized 0-1)
    if (analysis.spectrum.length !== numBins) {
      analysis.spectrum = new Float32Array(numBins);
    }
    for (let i = 0; i < numBins; i++) {
      analysis.spectrum[i] = frequencyData[i] / 255;
    }

    // Compute spectral flux
    let spectralFluxRaw = 0;
    if (prevSpectrumRef.current) {
      spectralFluxRaw = computeSpectralFlux(analysis.spectrum, prevSpectrumRef.current, true);
    }
    // Reuse buffer to avoid GC pressure
    if (!prevSpectrumRef.current || prevSpectrumRef.current.length !== analysis.spectrum.length) {
      prevSpectrumRef.current = new Float32Array(analysis.spectrum.length);
    }
    prevSpectrumRef.current.set(analysis.spectrum);

    // Compute HFC
    const hfcRaw = computeHFC(analysis.spectrum);

    // Normalize detection values
    const spectralFluxNorm = utils.normalizers.spectralFlux.normalize(spectralFluxRaw);
    const hfcNorm = utils.normalizers.hfc.normalize(hfcRaw);

    // Update adaptive thresholds
    utils.thresholds.spectralFlux.update(spectralFluxNorm);
    utils.thresholds.hfc.update(hfcNorm);

    // Check for peaks
    const fluxPeak = utils.thresholds.spectralFlux.isPeak(spectralFluxNorm, currentTime);
    const hfcPeak = utils.thresholds.hfc.isPeak(hfcNorm, currentTime);

    // Extract band energies (for 6-band display)
    const bandEnergies = extractBandEnergies(analysis.spectrum, sampleRate, analyser.fftSize);

    // Smooth band energies
    analysis.energy.overall = utils.smoothers.energy.overall.process(meydaFeatures?.rms ?? 0);
    analysis.energy.subBass = utils.smoothers.energy.subBass.process(bandEnergies.subBass);
    analysis.energy.bass = utils.smoothers.energy.bass.process(bandEnergies.bass);
    analysis.energy.lowMid = utils.smoothers.energy.lowMid.process(bandEnergies.lowMid);
    analysis.energy.mid = utils.smoothers.energy.mid.process(bandEnergies.mid);
    analysis.energy.highMid = utils.smoothers.energy.highMid.process(bandEnergies.highMid);
    analysis.energy.high = utils.smoothers.energy.high.process(bandEnergies.high);

    // Update bass/high thresholds and check peaks
    const bassEnergy = (bandEnergies.subBass + bandEnergies.bass) / 2;
    const highEnergy = (bandEnergies.highMid + bandEnergies.high) / 2;
    utils.thresholds.bass.update(bassEnergy);
    utils.thresholds.high.update(highEnergy);
    const bassPeak = utils.thresholds.bass.isPeak(bassEnergy, currentTime);
    const highPeak = utils.thresholds.high.isPeak(highEnergy, currentTime);

    // Update peaks
    analysis.peaks.spectralFlux = fluxPeak;
    analysis.peaks.hfc = hfcPeak;
    analysis.peaks.bass = bassPeak;
    analysis.peaks.high = highPeak;

    // Track peak history for timeline visualization
    if (fluxPeak) peakHistoryRef.current.push({ time: currentTime, type: "flux" });
    if (hfcPeak) peakHistoryRef.current.push({ time: currentTime, type: "hfc" });
    if (bassPeak) peakHistoryRef.current.push({ time: currentTime, type: "bass" });
    if (highPeak) peakHistoryRef.current.push({ time: currentTime, type: "high" });

    // Prune old peaks (in-place to avoid GC pressure)
    const cutoffTime = currentTime - PEAK_HISTORY_DURATION_MS;
    let writeIndex = 0;
    for (let i = 0; i < peakHistoryRef.current.length; i++) {
      if (peakHistoryRef.current[i].time > cutoffTime) {
        peakHistoryRef.current[writeIndex++] = peakHistoryRef.current[i];
      }
    }
    peakHistoryRef.current.length = writeIndex;
    analysis.peakHistory = peakHistoryRef.current;

    // Store raw values (smoothed for visualization, but after normalization)
    // Guard against NaN values when audio is silent
    const smoothedFlux = utils.smoothers.spectralFlux.process(spectralFluxNorm);
    const smoothedHfc = utils.smoothers.hfc.process(hfcNorm);
    const rawRms = meydaFeatures?.rms ?? 0;
    const normalizedRms = utils.normalizers.rms.normalize(Number.isNaN(rawRms) ? 0 : rawRms);
    analysis.raw.spectralFlux = Number.isNaN(smoothedFlux) ? 0 : smoothedFlux;
    analysis.raw.hfc = Number.isNaN(smoothedHfc) ? 0 : smoothedHfc;
    analysis.raw.rms = Number.isNaN(normalizedRms) ? 0 : normalizedRms;
    const rawCentroid = meydaFeatures?.spectralCentroid ?? 0;
    const rawFlatness = meydaFeatures?.spectralFlatness ?? 0;
    analysis.raw.spectralCentroid = Number.isNaN(rawCentroid)
      ? 0
      : Math.min(1, rawCentroid / numBins);
    analysis.raw.spectralFlatness = Number.isNaN(rawFlatness) ? 0 : rawFlatness;
    const rawRolloff = meydaFeatures?.spectralRolloff ?? 0;
    const rawZcr = meydaFeatures?.zcr ?? 0;
    const rawSharpness = meydaFeatures?.perceptualSharpness ?? 0;
    analysis.raw.spectralRolloff = Number.isNaN(rawRolloff) ? 0 : Math.min(1, rawRolloff / numBins);
    analysis.raw.zcr = Number.isNaN(rawZcr) ? 0 : Math.min(1, rawZcr * 2);
    analysis.raw.perceptualSharpness = Number.isNaN(rawSharpness) ? 0 : rawSharpness;

    // Store threshold info for debug visualization (with slow smoothing for readability)
    analysis.thresholds.spectralFlux = {
      mean: utils.thresholds.spectralFlux.getMean(),
      threshold: utils.smoothers.thresholdDisplay.spectralFlux.process(
        utils.thresholds.spectralFlux.getThreshold()
      ),
    };
    analysis.thresholds.hfc = {
      mean: utils.thresholds.hfc.getMean(),
      threshold: utils.smoothers.thresholdDisplay.hfc.process(utils.thresholds.hfc.getThreshold()),
    };
    analysis.thresholds.bass = {
      mean: utils.thresholds.bass.getMean(),
      threshold: utils.smoothers.thresholdDisplay.bass.process(
        utils.thresholds.bass.getThreshold()
      ),
    };
    analysis.thresholds.high = {
      mean: utils.thresholds.high.getMean(),
      threshold: utils.smoothers.thresholdDisplay.high.process(
        utils.thresholds.high.getThreshold()
      ),
    };

    // Extract log-band energies for GPU (same as before for compatibility)
    extractLogBandEnergies(frequencyData, clampedBandCount, bandEnergiesRef.current, 255);

    // Apply envelope follower for onset detection on each band
    for (let band = 0; band < clampedBandCount; band++) {
      const energy = bandEnergiesRef.current[band];
      const prevEnergy = analysis.bandEnergies[band];
      const onsetRaw = Math.max(0, energy - prevEnergy);
      bandOnsetsRef.current[band] = utils.bandEnvelopes[band].process(onsetRaw);
    }

    // Zero out unused bands
    for (let band = clampedBandCount; band < MAX_BANDS; band++) {
      bandEnergiesRef.current[band] = 0;
      bandOnsetsRef.current[band] = 0;
    }

    // Copy to analysis object
    analysis.bandEnergies.set(bandEnergiesRef.current);
    analysis.bandOnsets.set(bandOnsetsRef.current);
    analysis.bandCount = clampedBandCount;

    return analysis;
  }, [utils]);

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
