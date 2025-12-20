/**
 * Audio Analysis Web Worker
 * Runs all audio analysis off the main thread to prevent FPS drops.
 */

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
} from "../audio";
import type {
  WorkerInput,
  WorkerResultMessage,
  AudioEnergy,
  AudioPeaks,
  AudioRaw,
  AudioThresholds,
} from "./audioAnalysisTypes";

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

const bandSmoother = new MultiSmoother(MAX_BANDS, smoothingFactor);

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
