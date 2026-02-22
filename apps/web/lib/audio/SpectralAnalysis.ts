/**
 * Spectral analysis functions for audio visualization.
 * Implements spectral flux, HFC, and multi-band energy extraction.
 */

/**
 * Compute spectral flux between two consecutive spectra.
 * Uses half-wave rectification (only positive differences count).
 * Log compression disabled by default for performance (512 Math.log calls per frame).
 */
export function computeSpectralFlux(
  currentSpectrum: Float32Array,
  previousSpectrum: Float32Array,
  useLogCompression: boolean = false
): number {
  if (currentSpectrum.length !== previousSpectrum.length) {
    return 0;
  }

  let flux = 0;
  const compressionFactor = 100;

  for (let i = 0; i < currentSpectrum.length; i++) {
    let current = currentSpectrum[i];
    let previous = previousSpectrum[i];

    if (useLogCompression) {
      current = Math.log(1 + compressionFactor * current);
      previous = Math.log(1 + compressionFactor * previous);
    }

    const diff = current - previous;
    // Half-wave rectification: only count positive differences (energy increases)
    if (diff > 0) {
      flux += diff * diff;
    }
  }

  return Math.sqrt(flux);
}

/**
 * High Frequency Content (HFC) - weights bins by their frequency index.
 * Highly sensitive to percussive transients (hi-hats, snares, attacks).
 */
export function computeHFC(magnitudeSpectrum: Float32Array): number {
  let hfc = 0;
  for (let k = 0; k < magnitudeSpectrum.length; k++) {
    // Weight by bin index (higher frequencies weighted more)
    hfc += k * magnitudeSpectrum[k] * magnitudeSpectrum[k];
  }
  return hfc;
}

/**
 * Band energy extraction with standard audio engineering frequency bands.
 */
export interface BandEnergies {
  subBass: number; // 20-60Hz
  bass: number; // 60-250Hz
  lowMid: number; // 250-500Hz
  mid: number; // 500-2000Hz
  highMid: number; // 2000-4000Hz
  high: number; // 4000-20000Hz
}

/**
 * Frequency ranges for each band in Hz.
 */
const BAND_RANGES: Record<keyof BandEnergies, [number, number]> = {
  subBass: [20, 60],
  bass: [60, 250],
  lowMid: [250, 500],
  mid: [500, 2000],
  highMid: [2000, 4000],
  high: [4000, 20000],
};

/**
 * Convert frequency in Hz to FFT bin index.
 */
function frequencyToBin(frequency: number, sampleRate: number, fftSize: number): number {
  return Math.round((frequency * fftSize) / sampleRate);
}

/**
 * Extract energy for each frequency band from the magnitude spectrum.
 */
export function extractBandEnergies(
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
    // Clamp to nyquist frequency
    const clampedHigh = Math.min(highHz, nyquist);
    const startBin = frequencyToBin(lowHz, sampleRate, fftSize);
    const endBin = frequencyToBin(clampedHigh, sampleRate, fftSize);

    let energy = 0;
    let count = 0;

    for (let i = startBin; i <= endBin && i < spectrum.length; i++) {
      energy += spectrum[i] * spectrum[i];
      count++;
    }

    // RMS energy for the band
    result[band] = count > 0 ? Math.sqrt(energy / count) : 0;
  }

  return result;
}

/**
 * Cache for band boundaries to avoid recalculating every frame.
 */
const boundariesCache = new Map<string, number[]>();

/**
 * Get logarithmically-spaced band boundaries for FFT visualization.
 * Returns bin indices for each band boundary.
 * Results are cached to avoid expensive Math.log/exp calculations every frame.
 */
export function getLogBandBoundaries(binCount: number, bandCount: number): number[] {
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
 * Extract energies for logarithmically-spaced bands (for GPU/visualization).
 * Returns normalized 0-1 values.
 */
export function extractLogBandEnergies(
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

    // Use RMS to preserve energy regardless of band width
    let sumSquared = 0;
    for (let i = startBin; i < endBin && i < binCount; i++) {
      sumSquared += spectrum[i] * spectrum[i];
    }

    outputEnergies[band] = Math.sqrt(sumSquared / binRange) / maxValue;
  }
}
