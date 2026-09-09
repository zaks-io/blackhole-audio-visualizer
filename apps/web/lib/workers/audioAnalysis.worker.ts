/**
 * Audio Analysis Web Worker
 * Runs all audio analysis off the main thread to prevent FPS drops.
 */

import type {
  WorkerInput,
  WorkerResultMessage,
  AudioEnergy,
  AudioOnsets,
  AudioPeaks,
  AudioRaw,
  AudioThresholds,
} from "./audioAnalysisTypes";

import {
  AdaptiveThreshold,
  OnsetDetector,
  SimpleEnvelope,
  Smoother,
  AutoNormalizer,
  MultiSmoother,
  computeSpectralFlux,
  computeHFC,
  extractBandEnergies,
  extractLogBandEnergies,
} from "../audio";
// ============================================================================
// Worker Implementation
// ============================================================================

// Gravity-well BPM: always outputs a usable BPM (never zero).
// Detection pulls toward real tempo; absence lets it drift back to 120 BPM baseline.
class GravityWellBPM {
  private effectiveBpm = 120;
  private detectedBpm = 0;
  private confidence = 0;
  private beatTimestamps: number[] = [];
  private lastBeatTimeMs = 0;

  private readonly BASELINE_BPM = 120;
  private readonly PULL_ALPHA = 0.08;
  private readonly DECAY_RATE = 0.002; // per-ms confidence decay
  private readonly windowMs = 8000;
  private readonly minBpm = 60;
  private readonly maxBpm = 200;
  private readonly binSizeMs = 10;

  addBeat(timestampMs: number): void {
    // Reject false positives when we have a decent read
    if (this.confidence > 0.3 && this.beatTimestamps.length > 0) {
      const expectedPeriod = 60000 / this.effectiveBpm;
      const sinceLastBeat = timestampMs - this.beatTimestamps[this.beatTimestamps.length - 1];
      if (sinceLastBeat < expectedPeriod * 0.4) return;
    }

    this.lastBeatTimeMs = timestampMs;
    this.beatTimestamps.push(timestampMs);
    const cutoff = timestampMs - this.windowMs;
    while (this.beatTimestamps.length > 0 && this.beatTimestamps[0] < cutoff) {
      this.beatTimestamps.shift();
    }
    if (this.beatTimestamps.length < 4) return;

    // IOI histogram with skip 1-3
    const minIOI = 60000 / this.maxBpm;
    const maxIOI = 60000 / this.minBpm;
    const iois: number[] = [];
    for (let skip = 1; skip <= 3; skip++) {
      for (let i = skip; i < this.beatTimestamps.length; i++) {
        const ioi = (this.beatTimestamps[i] - this.beatTimestamps[i - skip]) / skip;
        if (ioi >= minIOI && ioi <= maxIOI) iois.push(ioi);
      }
    }
    if (iois.length < 3) return;

    const numBins = Math.ceil((maxIOI - minIOI) / this.binSizeMs) + 1;
    const bins = new Uint8Array(numBins);
    for (const ioi of iois) {
      const bin = Math.floor((ioi - minIOI) / this.binSizeMs);
      if (bin >= 0 && bin < numBins) bins[bin]++;
    }

    let maxCount = 0;
    let dominantBin = 0;
    for (let i = 0; i < numBins; i++) {
      if (bins[i] > maxCount) {
        maxCount = bins[i];
        dominantBin = i;
      }
    }

    const dominantCenter = minIOI + dominantBin * this.binSizeMs;
    const tolerance = this.binSizeMs * 2;
    let weightedSum = 0;
    let clusterCount = 0;
    for (const ioi of iois) {
      if (Math.abs(ioi - dominantCenter) <= tolerance) {
        weightedSum += ioi;
        clusterCount++;
      }
    }
    if (clusterCount === 0) return;

    let rawBpm = 60000 / (weightedSum / clusterCount);

    // Octave correction against effectiveBpm
    const half = rawBpm * 0.5;
    const double = rawBpm * 2;
    const current = this.effectiveBpm;
    if (Math.abs(half - current) < Math.abs(rawBpm - current) && half >= this.minBpm) {
      rawBpm = half;
    } else if (Math.abs(double - current) < Math.abs(rawBpm - current) && double <= this.maxBpm) {
      rawBpm = double;
    }

    this.detectedBpm = rawBpm;
    this.confidence = clusterCount / iois.length;
  }

  update(timestampMs: number): void {
    // Decay confidence when no beats arrive
    if (this.lastBeatTimeMs > 0) {
      const expectedPeriod = 60000 / this.effectiveBpm;
      const elapsed = timestampMs - this.lastBeatTimeMs;
      if (elapsed > expectedPeriod * 2) {
        this.confidence = Math.max(
          0,
          this.confidence - this.DECAY_RATE * (elapsed - expectedPeriod * 2)
        );
      }
    }

    // Blend effectiveBpm toward target
    let target: number;
    let alpha: number;
    if (this.confidence > 0.1) {
      target = this.detectedBpm;
      alpha = this.PULL_ALPHA * this.confidence;
    } else {
      target = this.BASELINE_BPM;
      alpha = this.PULL_ALPHA * 0.3;
    }
    this.effectiveBpm += (target - this.effectiveBpm) * alpha;
  }

  getBpm(): number {
    return this.effectiveBpm;
  }

  getConfidence(): number {
    return this.confidence;
  }

  getNextBeatMs(currentTimestamp: number): number {
    if (this.confidence < 0.2 || this.lastBeatTimeMs === 0) return 0;
    const period = 60000 / this.effectiveBpm;
    const elapsed = currentTimestamp - this.lastBeatTimeMs;
    const beatsElapsed = Math.floor(elapsed / period);
    return this.lastBeatTimeMs + (beatsElapsed + 1) * period;
  }

  getBeatPhase(currentTimestamp: number): number {
    if (this.lastBeatTimeMs === 0) return 0;
    const period = 60000 / this.effectiveBpm;
    const elapsed = currentTimestamp - this.lastBeatTimeMs;
    return (((elapsed % period) + period) % period) / period; // 0-1, 0 = on beat
  }

  reset(): void {
    this.effectiveBpm = this.BASELINE_BPM;
    this.detectedBpm = 0;
    this.confidence = 0;
    this.beatTimestamps = [];
    this.lastBeatTimeMs = 0;
  }
}

const MAX_BANDS = 36;
const PEAK_HISTORY_DURATION_MS = 2000;
const PEAK_RING_BUFFER_SIZE = 32; // Max peaks in 2 seconds at typical beat rate

// Analysis state
let prevSpectrum: Float32Array | null = null;
let currentOnsetDecay = 0.92;
const smoothingFactor = 0.75;

// Ring buffer for peak history - avoids per-frame array allocation from filter()
type PeakType = "flux" | "hfc" | "bass" | "high";
const peakRingBuffer: Array<{ time: number; type: PeakType }> = [];
let peakWriteIndex = 0;
// Pre-allocate ring buffer entries
for (let i = 0; i < PEAK_RING_BUFFER_SIZE; i++) {
  peakRingBuffer.push({ time: 0, type: "flux" });
}
// Output array for valid peaks - reused each frame
const peakHistoryOutput: Array<{ time: number; type: PeakType }> = [];

// Reusable buffers
const bandEnergiesBuffer = new Float32Array(MAX_BANDS);
let prevBandEnergies = new Float32Array(MAX_BANDS);
// Pre-allocated output buffers to avoid per-frame allocations
let spectrumBuffer: Float32Array | null = null;
const bandOnsetsOutput = new Float32Array(MAX_BANDS);
const bandEnergiesOutput = new Float32Array(MAX_BANDS);

// Analysis utilities
const thresholds = {
  spectralFlux: new AdaptiveThreshold({
    alpha: 0.1,
    peakMultiplier: 1.5,
    minPeakDistanceMs: 50,
  }),
  hfc: new AdaptiveThreshold({ alpha: 0.1, peakMultiplier: 1.5, minPeakDistanceMs: 30 }),
};

// Band onsets fire on the attack of a hit, not on its level, and carry magnitude.
// Hats repeat faster than kicks and snares, so the high band gets a shorter refractory.
const onsetDetectors = {
  bass: new OnsetDetector({ minIntervalMs: 80 }),
  mid: new OnsetDetector({ minIntervalMs: 80 }),
  high: new OnsetDetector({ minIntervalMs: 50 }),
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
const gravityWellBpm = new GravityWellBPM();

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
  prevBandEnergies = new Float32Array(MAX_BANDS);

  // Reset ring buffer by zeroing timestamps (entries with time=0 will be filtered out)
  peakWriteIndex = 0;
  for (let i = 0; i < PEAK_RING_BUFFER_SIZE; i++) {
    peakRingBuffer[i].time = 0;
  }

  gravityWellBpm.reset();
  Object.values(thresholds).forEach((t) => t.reset());
  Object.values(onsetDetectors).forEach((d) => d.reset());
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

  // Reuse spectrum buffer (only reallocate if FFT size changes)
  if (!spectrumBuffer || spectrumBuffer.length !== numBins) {
    spectrumBuffer = new Float32Array(numBins);
  }
  // Convert to Float32Array for spectrum (normalized 0-1)
  for (let i = 0; i < numBins; i++) {
    spectrumBuffer[i] = frequencyData[i] / 255;
  }
  const spectrum = spectrumBuffer;

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

  // Per-band onsets: kick, snare, hats
  const onsets: AudioOnsets = {
    bass: onsetDetectors.bass.process(
      (rawBandEnergies.subBass + rawBandEnergies.bass) / 2,
      timestamp
    ),
    mid: onsetDetectors.mid.process((rawBandEnergies.lowMid + rawBandEnergies.mid) / 2, timestamp),
    high: onsetDetectors.high.process(
      (rawBandEnergies.highMid + rawBandEnergies.high) / 2,
      timestamp
    ),
  };
  const bassPeak = onsets.bass > 0;
  const highPeak = onsets.high > 0;

  // Feed bass peaks to gravity-well BPM and update
  if (bassPeak) gravityWellBpm.addBeat(timestamp);
  gravityWellBpm.update(timestamp);

  // Update peaks
  const peaks: AudioPeaks = {
    spectralFlux: fluxPeak,
    hfc: hfcPeak,
    bass: bassPeak,
    high: highPeak,
  };

  // Track peak history using ring buffer - avoids per-frame array allocation
  function addPeak(type: PeakType): void {
    const entry = peakRingBuffer[peakWriteIndex];
    entry.time = timestamp;
    entry.type = type;
    peakWriteIndex = (peakWriteIndex + 1) % PEAK_RING_BUFFER_SIZE;
  }
  if (fluxPeak) addPeak("flux");
  if (hfcPeak) addPeak("hfc");
  if (bassPeak) addPeak("bass");
  if (highPeak) addPeak("high");

  // Build output array from valid ring buffer entries (reuse output array)
  const cutoffTime = timestamp - PEAK_HISTORY_DURATION_MS;
  peakHistoryOutput.length = 0;
  for (let i = 0; i < PEAK_RING_BUFFER_SIZE; i++) {
    const entry = peakRingBuffer[i];
    if (entry.time > cutoffTime) {
      peakHistoryOutput.push(entry);
    }
  }

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
      mean: onsetDetectors.bass.getMean(),
      threshold: smoothers.thresholdDisplay.bass.process(onsetDetectors.bass.getThreshold()),
    },
    high: {
      mean: onsetDetectors.high.getMean(),
      threshold: smoothers.thresholdDisplay.high.process(onsetDetectors.high.getThreshold()),
    },
  };

  // Extract log-band energies for GPU
  extractLogBandEnergies(frequencyData, clampedBandCount, bandEnergiesBuffer, 255);

  // Apply envelope follower for onset detection on each band
  // Zero out the output buffers for unused bands
  bandOnsetsOutput.fill(0);
  bandEnergiesOutput.fill(0);

  for (let band = 0; band < clampedBandCount; band++) {
    const currentEnergy = bandEnergiesBuffer[band];
    const prevEnergy = prevBandEnergies[band];
    const onsetRaw = Math.max(0, currentEnergy - prevEnergy);
    bandOnsetsOutput[band] = bandEnvelopes[band].process(onsetRaw);
    bandEnergiesOutput[band] = currentEnergy;
  }

  // Update previous band energies
  prevBandEnergies.set(bandEnergiesBuffer);

  return {
    type: "result",
    timestamp,
    energy,
    peaks,
    onsets,
    raw,
    thresholds: audioThresholds,
    spectrum,
    bandOnsets: bandOnsetsOutput,
    bandEnergies: bandEnergiesOutput,
    bandCount: clampedBandCount,
    peakHistory: peakHistoryOutput,
    bpm: gravityWellBpm.getBpm(),
    bpmConfidence: gravityWellBpm.getConfidence(),
    beatPhase: gravityWellBpm.getBeatPhase(timestamp),
    nextBeatMs: gravityWellBpm.getNextBeatMs(timestamp),
    workerProcessMs: 0, // overwritten after analyze() returns
  };
}

// Message handler
onmessage = (e: MessageEvent<WorkerInput>) => {
  const message = e.data;

  switch (message.type) {
    case "analyze": {
      const workerStart = performance.now();
      const result = analyze(
        message.frequencyData,
        message.sampleRate,
        message.fftSize,
        message.bandCount,
        message.timestamp
      );
      result.workerProcessMs = performance.now() - workerStart;
      // Structured clone - we reuse buffers so can't transfer ownership
      postMessage(result);
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
