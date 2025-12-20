/**
 * Audio Analysis Web Worker
 * Runs all audio analysis off the main thread to prevent FPS drops.
 *
 * NOTE: All audio utility classes/functions are inlined here because web workers
 * need to be self-contained. The Next.js bundler copies workers to a different
 * location, breaking relative imports.
 */

import type {
  WorkerInput,
  WorkerResultMessage,
  AudioEnergy,
  AudioPeaks,
  AudioRaw,
  AudioThresholds,
} from "./audioAnalysisTypes";

// ============================================================================
// Inlined Audio Utilities (from lib/audio/*)
// ============================================================================

/**
 * Adaptive peak detection using exponential moving average statistics.
 */
class AdaptiveThreshold {
  private mean: number = 0;
  private variance: number = 0;
  private alpha: number;
  private peakMultiplier: number;
  private lastPeakTime: number = 0;
  private minPeakDistance: number;

  constructor(
    options: {
      alpha?: number;
      peakMultiplier?: number;
      minPeakDistanceMs?: number;
    } = {}
  ) {
    this.alpha = options.alpha ?? 0.1;
    this.peakMultiplier = options.peakMultiplier ?? 1.5;
    this.minPeakDistance = options.minPeakDistanceMs ?? 50;
  }

  update(value: number): void {
    this.mean = this.alpha * value + (1 - this.alpha) * this.mean;
    const diff = value - this.mean;
    this.variance = this.alpha * diff * diff + (1 - this.alpha) * this.variance;
  }

  isPeak(value: number, currentTimeMs: number): boolean {
    const threshold = this.getThreshold();
    const exceedsThreshold = value > threshold;
    const respectsDistance = currentTimeMs - this.lastPeakTime >= this.minPeakDistance;

    if (exceedsThreshold && respectsDistance) {
      this.lastPeakTime = currentTimeMs;
      return true;
    }
    return false;
  }

  getThreshold(): number {
    return this.mean + this.peakMultiplier * Math.sqrt(this.variance);
  }

  getMean(): number {
    return this.mean;
  }

  reset(): void {
    this.mean = 0;
    this.variance = 0;
    this.lastPeakTime = 0;
  }
}

/**
 * Simple envelope follower with instant attack and configurable decay.
 */
class SimpleEnvelope {
  private value: number = 0;
  private decay: number;

  constructor(decay: number = 0.92) {
    this.decay = decay;
  }

  process(input: number): number {
    this.value = Math.max(input, this.value * this.decay);
    return this.value;
  }

  setDecay(decay: number): void {
    this.decay = decay;
  }

  reset(): void {
    this.value = 0;
  }
}

/**
 * Linear interpolation smoother.
 */
class Smoother {
  private value: number = 0;
  private lerpFactor: number;

  constructor(lerpFactor: number = 0.75) {
    this.lerpFactor = lerpFactor;
  }

  process(target: number): number {
    this.value = this.value + (target - this.value) * this.lerpFactor;
    return this.value;
  }

  reset(): void {
    this.value = 0;
  }
}

/**
 * Auto-normalizing scaler that tracks recent maximum.
 */
class AutoNormalizer {
  private recentMax: number;
  private decay: number;
  private minValue: number;

  constructor(options: { decay?: number; minValue?: number } = {}) {
    this.decay = options.decay ?? 0.995;
    this.minValue = options.minValue ?? 0.001;
    this.recentMax = this.minValue;
  }

  normalize(value: number): number {
    this.recentMax = Math.max(value, this.recentMax * this.decay);
    const effectiveMax = Math.max(this.recentMax, this.minValue);
    return Math.min(1, value / effectiveMax);
  }

  reset(): void {
    this.recentMax = this.minValue;
  }
}

/**
 * Multi-value smoother for smoothing multiple related values efficiently.
 */
class MultiSmoother {
  private values: Float32Array;

  constructor(count: number) {
    this.values = new Float32Array(count);
  }

  reset(): void {
    this.values.fill(0);
  }
}

/**
 * Compute spectral flux between two consecutive spectra.
 */
function computeSpectralFlux(
  currentSpectrum: Float32Array,
  previousSpectrum: Float32Array
): number {
  if (currentSpectrum.length !== previousSpectrum.length) {
    return 0;
  }

  let flux = 0;
  for (let i = 0; i < currentSpectrum.length; i++) {
    const diff = currentSpectrum[i] - previousSpectrum[i];
    if (diff > 0) {
      flux += diff * diff;
    }
  }
  return Math.sqrt(flux);
}

/**
 * High Frequency Content (HFC) - weights bins by their frequency index.
 */
function computeHFC(magnitudeSpectrum: Float32Array): number {
  let hfc = 0;
  for (let k = 0; k < magnitudeSpectrum.length; k++) {
    hfc += k * magnitudeSpectrum[k] * magnitudeSpectrum[k];
  }
  return hfc;
}

interface BandEnergies {
  subBass: number;
  bass: number;
  lowMid: number;
  mid: number;
  highMid: number;
  high: number;
}

const BAND_RANGES: Record<keyof BandEnergies, [number, number]> = {
  subBass: [20, 60],
  bass: [60, 250],
  lowMid: [250, 500],
  mid: [500, 2000],
  highMid: [2000, 4000],
  high: [4000, 20000],
};

function frequencyToBin(frequency: number, sampleRate: number, fftSize: number): number {
  return Math.round((frequency * fftSize) / sampleRate);
}

/**
 * Extract energy for each frequency band from the magnitude spectrum.
 */
function extractBandEnergies(
  spectrum: Float32Array,
  sampleRate: number,
  fftSize: number
): BandEnergies {
  const nyquist = sampleRate / 2;
  const result: BandEnergies = {
    subBass: 0,
    bass: 0,
    lowMid: 0,
    mid: 0,
    highMid: 0,
    high: 0,
  };

  for (const [band, [lowHz, highHz]] of Object.entries(BAND_RANGES) as [
    keyof BandEnergies,
    [number, number],
  ][]) {
    const clampedHigh = Math.min(highHz, nyquist);
    const startBin = frequencyToBin(lowHz, sampleRate, fftSize);
    const endBin = frequencyToBin(clampedHigh, sampleRate, fftSize);

    let energy = 0;
    let count = 0;

    for (let i = startBin; i <= endBin && i < spectrum.length; i++) {
      energy += spectrum[i] * spectrum[i];
      count++;
    }

    result[band] = count > 0 ? Math.sqrt(energy / count) : 0;
  }

  return result;
}

const boundariesCache = new Map<string, number[]>();

function getLogBandBoundaries(binCount: number, bandCount: number): number[] {
  const key = `${binCount}-${bandCount}`;
  let boundaries = boundariesCache.get(key);
  if (!boundaries) {
    boundaries = [0];
    const logMin = Math.log(1);
    const logMax = Math.log(binCount);

    for (let i = 1; i <= bandCount; i++) {
      const logVal = logMin + ((logMax - logMin) * i) / bandCount;
      boundaries.push(Math.round(Math.exp(logVal)));
    }
    boundariesCache.set(key, boundaries);
  }
  return boundaries;
}

/**
 * Extract energies for logarithmically-spaced bands.
 */
function extractLogBandEnergies(
  spectrum: ArrayLike<number>,
  bandCount: number,
  outputEnergies: Float32Array,
  maxValue: number = 255
): void {
  const binCount = spectrum.length;
  const boundaries = getLogBandBoundaries(binCount, bandCount);

  for (let band = 0; band < bandCount; band++) {
    const startBin = boundaries[band];
    const endBin = boundaries[band + 1];
    const binRange = Math.max(1, endBin - startBin);

    let sum = 0;
    for (let i = startBin; i < endBin && i < binCount; i++) {
      sum += spectrum[i];
    }

    outputEnergies[band] = sum / binRange / maxValue;
  }
}

// ============================================================================
// Worker Implementation
// ============================================================================

const MAX_BANDS = 36;
const PEAK_HISTORY_DURATION_MS = 2000;

// Analysis state
let prevSpectrum: Float32Array | null = null;
let peakHistory: Array<{ time: number; type: "flux" | "hfc" | "bass" | "high" }> = [];
let currentOnsetDecay = 0.92;
const smoothingFactor = 0.75;

// Reusable buffers
const bandEnergiesBuffer = new Float32Array(MAX_BANDS);
let prevBandEnergies = new Float32Array(MAX_BANDS);

// Analysis utilities
const thresholds = {
  spectralFlux: new AdaptiveThreshold({
    alpha: 0.1,
    peakMultiplier: 1.5,
    minPeakDistanceMs: 50,
  }),
  hfc: new AdaptiveThreshold({ alpha: 0.1, peakMultiplier: 1.5, minPeakDistanceMs: 30 }),
  bass: new AdaptiveThreshold({ alpha: 0.08, peakMultiplier: 1.8, minPeakDistanceMs: 100 }),
  high: new AdaptiveThreshold({ alpha: 0.12, peakMultiplier: 1.4, minPeakDistanceMs: 30 }),
};

const smoothers = {
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
  thresholdDisplay: {
    spectralFlux: new SimpleEnvelope(0.997),
    hfc: new SimpleEnvelope(0.997),
    bass: new SimpleEnvelope(0.997),
    high: new SimpleEnvelope(0.997),
  },
};

const normalizers = {
  spectralFlux: new AutoNormalizer({ decay: 0.99, minValue: 0.01 }),
  hfc: new AutoNormalizer({ decay: 0.99, minValue: 0.01 }),
  rms: new AutoNormalizer({ decay: 0.995, minValue: 0.01 }),
};

// Band envelope followers
const bandEnvelopes: SimpleEnvelope[] = [];
for (let i = 0; i < MAX_BANDS; i++) {
  bandEnvelopes.push(new SimpleEnvelope(currentOnsetDecay));
}

const bandSmoother = new MultiSmoother(MAX_BANDS);

function computeRMS(frequencyData: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < frequencyData.length; i++) {
    const normalized = frequencyData[i] / 255;
    sum += normalized * normalized;
  }
  return Math.sqrt(sum / frequencyData.length);
}

function reset(): void {
  prevSpectrum = null;
  peakHistory = [];
  prevBandEnergies = new Float32Array(MAX_BANDS);

  Object.values(thresholds).forEach((t) => t.reset());
  Object.values(smoothers.energy).forEach((s) => s.reset());
  smoothers.spectralFlux.reset();
  smoothers.hfc.reset();
  Object.values(smoothers.thresholdDisplay).forEach((e) => e.reset());
  Object.values(normalizers).forEach((n) => n.reset());
  bandEnvelopes.forEach((e) => e.reset());
  bandSmoother.reset();
}

function analyze(
  frequencyData: Uint8Array,
  sampleRate: number,
  fftSize: number,
  bandCount: number,
  timestamp: number
): WorkerResultMessage {
  const numBins = frequencyData.length;
  const clampedBandCount = Math.min(Math.max(1, bandCount), MAX_BANDS);

  // Convert to Float32Array for spectrum (normalized 0-1)
  const spectrum = new Float32Array(numBins);
  for (let i = 0; i < numBins; i++) {
    spectrum[i] = frequencyData[i] / 255;
  }

  // Compute spectral flux
  let spectralFluxRaw = 0;
  if (prevSpectrum && prevSpectrum.length === spectrum.length) {
    spectralFluxRaw = computeSpectralFlux(spectrum, prevSpectrum);
  }
  // Store current spectrum for next frame
  if (!prevSpectrum || prevSpectrum.length !== spectrum.length) {
    prevSpectrum = new Float32Array(spectrum.length);
  }
  prevSpectrum.set(spectrum);

  // Compute HFC
  const hfcRaw = computeHFC(spectrum);

  // Compute RMS (replacing Meyda)
  const rmsRaw = computeRMS(frequencyData);

  // Normalize detection values
  const spectralFluxNorm = normalizers.spectralFlux.normalize(spectralFluxRaw);
  const hfcNorm = normalizers.hfc.normalize(hfcRaw);
  const rmsNorm = normalizers.rms.normalize(rmsRaw);

  // Update adaptive thresholds
  thresholds.spectralFlux.update(spectralFluxNorm);
  thresholds.hfc.update(hfcNorm);

  // Check for peaks
  const fluxPeak = thresholds.spectralFlux.isPeak(spectralFluxNorm, timestamp);
  const hfcPeak = thresholds.hfc.isPeak(hfcNorm, timestamp);

  // Extract band energies (for 6-band display)
  const rawBandEnergies = extractBandEnergies(spectrum, sampleRate, fftSize);

  // Smooth band energies
  const energy: AudioEnergy = {
    overall: smoothers.energy.overall.process(rmsNorm),
    subBass: smoothers.energy.subBass.process(rawBandEnergies.subBass),
    bass: smoothers.energy.bass.process(rawBandEnergies.bass),
    lowMid: smoothers.energy.lowMid.process(rawBandEnergies.lowMid),
    mid: smoothers.energy.mid.process(rawBandEnergies.mid),
    highMid: smoothers.energy.highMid.process(rawBandEnergies.highMid),
    high: smoothers.energy.high.process(rawBandEnergies.high),
  };

  // Update bass/high thresholds and check peaks
  const bassEnergy = (rawBandEnergies.subBass + rawBandEnergies.bass) / 2;
  const highEnergy = (rawBandEnergies.highMid + rawBandEnergies.high) / 2;
  thresholds.bass.update(bassEnergy);
  thresholds.high.update(highEnergy);
  const bassPeak = thresholds.bass.isPeak(bassEnergy, timestamp);
  const highPeak = thresholds.high.isPeak(highEnergy, timestamp);

  // Update peaks
  const peaks: AudioPeaks = {
    spectralFlux: fluxPeak,
    hfc: hfcPeak,
    bass: bassPeak,
    high: highPeak,
  };

  // Track peak history
  if (fluxPeak) peakHistory.push({ time: timestamp, type: "flux" });
  if (hfcPeak) peakHistory.push({ time: timestamp, type: "hfc" });
  if (bassPeak) peakHistory.push({ time: timestamp, type: "bass" });
  if (highPeak) peakHistory.push({ time: timestamp, type: "high" });

  // Prune old peaks
  const cutoffTime = timestamp - PEAK_HISTORY_DURATION_MS;
  peakHistory = peakHistory.filter((p) => p.time > cutoffTime);

  // Store raw values
  const smoothedFlux = smoothers.spectralFlux.process(spectralFluxNorm);
  const smoothedHfc = smoothers.hfc.process(hfcNorm);

  // Compute spectral centroid and flatness from spectrum
  let centroidSum = 0;
  let magnitudeSum = 0;
  let geometricMean = 0;
  let arithmeticMean = 0;

  for (let i = 0; i < spectrum.length; i++) {
    centroidSum += i * spectrum[i];
    magnitudeSum += spectrum[i];
    if (spectrum[i] > 0) {
      geometricMean += Math.log(spectrum[i]);
    }
  }

  const spectralCentroid = magnitudeSum > 0 ? centroidSum / magnitudeSum / numBins : 0;
  geometricMean = Math.exp(geometricMean / spectrum.length);
  arithmeticMean = magnitudeSum / spectrum.length;
  const spectralFlatness = arithmeticMean > 0 ? geometricMean / arithmeticMean : 0;

  const raw: AudioRaw = {
    spectralFlux: Number.isNaN(smoothedFlux) ? 0 : smoothedFlux,
    hfc: Number.isNaN(smoothedHfc) ? 0 : smoothedHfc,
    rms: Number.isNaN(rmsNorm) ? 0 : rmsNorm,
    spectralCentroid: Number.isNaN(spectralCentroid) ? 0 : Math.min(1, spectralCentroid),
    spectralFlatness: Number.isNaN(spectralFlatness) ? 0 : spectralFlatness,
    spectralRolloff: 0,
    zcr: 0,
    perceptualSharpness: 0,
  };

  // Store threshold info
  const audioThresholds: AudioThresholds = {
    spectralFlux: {
      mean: thresholds.spectralFlux.getMean(),
      threshold: smoothers.thresholdDisplay.spectralFlux.process(
        thresholds.spectralFlux.getThreshold()
      ),
    },
    hfc: {
      mean: thresholds.hfc.getMean(),
      threshold: smoothers.thresholdDisplay.hfc.process(thresholds.hfc.getThreshold()),
    },
    bass: {
      mean: thresholds.bass.getMean(),
      threshold: smoothers.thresholdDisplay.bass.process(thresholds.bass.getThreshold()),
    },
    high: {
      mean: thresholds.high.getMean(),
      threshold: smoothers.thresholdDisplay.high.process(thresholds.high.getThreshold()),
    },
  };

  // Extract log-band energies for GPU
  extractLogBandEnergies(frequencyData, clampedBandCount, bandEnergiesBuffer, 255);

  // Apply envelope follower for onset detection on each band
  const bandOnsets = new Float32Array(MAX_BANDS);
  const bandEnergies = new Float32Array(MAX_BANDS);

  for (let band = 0; band < clampedBandCount; band++) {
    const currentEnergy = bandEnergiesBuffer[band];
    const prevEnergy = prevBandEnergies[band];
    const onsetRaw = Math.max(0, currentEnergy - prevEnergy);
    bandOnsets[band] = bandEnvelopes[band].process(onsetRaw);
    bandEnergies[band] = currentEnergy;
  }

  // Update previous band energies
  prevBandEnergies.set(bandEnergiesBuffer);

  return {
    type: "result",
    energy,
    peaks,
    raw,
    thresholds: audioThresholds,
    spectrum,
    bandOnsets,
    bandEnergies,
    bandCount: clampedBandCount,
    peakHistory: [...peakHistory],
  };
}

// Message handler
onmessage = (e: MessageEvent<WorkerInput>) => {
  const message = e.data;

  switch (message.type) {
    case "analyze": {
      const result = analyze(
        message.frequencyData,
        message.sampleRate,
        message.fftSize,
        message.bandCount,
        message.timestamp
      );
      // Transfer ownership of typed arrays for zero-copy
      postMessage(result, {
        transfer: [
          result.spectrum.buffer as ArrayBuffer,
          result.bandOnsets.buffer as ArrayBuffer,
          result.bandEnergies.buffer as ArrayBuffer,
        ],
      });
      break;
    }
    case "reset":
      reset();
      break;
    case "setDecay":
      currentOnsetDecay = message.decay;
      bandEnvelopes.forEach((env) => env.setDecay(message.decay));
      break;
  }
};
