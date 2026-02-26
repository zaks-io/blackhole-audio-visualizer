import { describe, it, expect } from "vitest";
import {
  computeSpectralFlux,
  computeHFC,
  extractBandEnergies,
  extractLogBandEnergies,
  getLogBandBoundaries,
} from "../SpectralAnalysis";

describe("computeSpectralFlux", () => {
  it("returns 0 for identical spectra", () => {
    const spectrum = new Float32Array([0.1, 0.5, 0.3, 0.8, 0.2]);
    expect(computeSpectralFlux(spectrum, spectrum)).toBe(0);
  });

  it("returns 0 for identical spectra (copy)", () => {
    const a = new Float32Array([0.1, 0.5, 0.3]);
    const b = new Float32Array([0.1, 0.5, 0.3]);
    expect(computeSpectralFlux(a, b)).toBe(0);
  });

  it("returns positive flux when energy increases", () => {
    const prev = new Float32Array([0.1, 0.1, 0.1]);
    const curr = new Float32Array([0.5, 0.5, 0.5]);
    expect(computeSpectralFlux(curr, prev)).toBeGreaterThan(0);
  });

  it("returns 0 when energy only decreases (half-wave rectification)", () => {
    const prev = new Float32Array([0.9, 0.8, 0.7]);
    const curr = new Float32Array([0.1, 0.1, 0.1]);
    expect(computeSpectralFlux(curr, prev)).toBe(0);
  });

  it("returns 0 for mismatched lengths", () => {
    const a = new Float32Array([0.1, 0.2]);
    const b = new Float32Array([0.1, 0.2, 0.3]);
    expect(computeSpectralFlux(a, b)).toBe(0);
  });

  it("returns 0 for empty arrays", () => {
    expect(computeSpectralFlux(new Float32Array(0), new Float32Array(0))).toBe(0);
  });

  it("applies log compression when flag is true", () => {
    const prev = new Float32Array([0.1, 0.1]);
    const curr = new Float32Array([0.5, 0.5]);
    const withLog = computeSpectralFlux(curr, prev, true);
    const withoutLog = computeSpectralFlux(curr, prev, false);
    // Log compression squashes large values, so flux should differ
    expect(withLog).not.toBeCloseTo(withoutLog, 5);
    expect(withLog).toBeGreaterThan(0);
  });

  it("handles single-element spectra", () => {
    const prev = new Float32Array([0.2]);
    const curr = new Float32Array([0.8]);
    const flux = computeSpectralFlux(curr, prev);
    // diff = 0.6, flux = sqrt(0.6^2) = 0.6
    expect(flux).toBeCloseTo(0.6, 5);
  });
});

describe("computeHFC", () => {
  it("returns 0 for a zero spectrum", () => {
    const spectrum = new Float32Array(8);
    expect(computeHFC(spectrum)).toBe(0);
  });

  it("weights higher bins more than lower bins", () => {
    const lowEnergy = new Float32Array(8);
    const highEnergy = new Float32Array(8);
    // Same magnitude, but in different bins
    lowEnergy[1] = 1.0;
    highEnergy[6] = 1.0;
    expect(computeHFC(highEnergy)).toBeGreaterThan(computeHFC(lowEnergy));
  });

  it("bin 0 contributes nothing regardless of magnitude", () => {
    const spectrum = new Float32Array(4);
    spectrum[0] = 100;
    expect(computeHFC(spectrum)).toBe(0);
  });

  it("single non-zero bin produces k * mag^2", () => {
    const spectrum = new Float32Array(5);
    spectrum[3] = 2.0;
    // hfc = 3 * 2^2 = 12
    expect(computeHFC(spectrum)).toBeCloseTo(12, 5);
  });

  it("handles empty spectrum", () => {
    expect(computeHFC(new Float32Array(0))).toBe(0);
  });
});

describe("extractBandEnergies", () => {
  const SAMPLE_RATE = 44100;
  const FFT_SIZE = 2048;

  it("returns zeroed bands for a zero spectrum", () => {
    const spectrum = new Float32Array(FFT_SIZE / 2);
    const bands = extractBandEnergies(spectrum, SAMPLE_RATE, FFT_SIZE);
    expect(bands.subBass).toBe(0);
    expect(bands.bass).toBe(0);
    expect(bands.lowMid).toBe(0);
    expect(bands.mid).toBe(0);
    expect(bands.highMid).toBe(0);
    expect(bands.high).toBe(0);
  });

  it("returns all 6 expected band keys", () => {
    const spectrum = new Float32Array(FFT_SIZE / 2).fill(0.5);
    const bands = extractBandEnergies(spectrum, SAMPLE_RATE, FFT_SIZE);
    expect(Object.keys(bands)).toEqual(
      expect.arrayContaining(["subBass", "bass", "lowMid", "mid", "highMid", "high"])
    );
  });

  it("produces positive RMS for non-zero spectrum", () => {
    const spectrum = new Float32Array(FFT_SIZE / 2).fill(0.5);
    const bands = extractBandEnergies(spectrum, SAMPLE_RATE, FFT_SIZE);
    expect(bands.subBass).toBeGreaterThan(0);
    expect(bands.bass).toBeGreaterThan(0);
    expect(bands.mid).toBeGreaterThan(0);
  });

  it("outputs are clamped to non-negative values", () => {
    const spectrum = new Float32Array(FFT_SIZE / 2).fill(1.0);
    const bands = extractBandEnergies(spectrum, SAMPLE_RATE, FFT_SIZE);
    for (const value of Object.values(bands)) {
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("getLogBandBoundaries", () => {
  it("returns bandCount + 1 boundaries", () => {
    const boundaries = getLogBandBoundaries(512, 8);
    expect(boundaries).toHaveLength(9);
  });

  it("starts at 0", () => {
    const boundaries = getLogBandBoundaries(512, 8);
    expect(boundaries[0]).toBe(0);
  });

  it("last boundary does not exceed binCount", () => {
    const boundaries = getLogBandBoundaries(512, 16);
    expect(boundaries[boundaries.length - 1]).toBeLessThanOrEqual(512);
  });

  it("boundaries are non-decreasing", () => {
    const boundaries = getLogBandBoundaries(1024, 32);
    for (let i = 1; i < boundaries.length; i++) {
      expect(boundaries[i]).toBeGreaterThanOrEqual(boundaries[i - 1]);
    }
  });

  it("caches results - returns same reference on second call", () => {
    const first = getLogBandBoundaries(256, 8);
    const second = getLogBandBoundaries(256, 8);
    expect(first).toBe(second);
  });
});

describe("extractLogBandEnergies", () => {
  it("fills output array with one value per band", () => {
    const spectrum = new Float32Array(512).fill(128);
    const output = new Float32Array(16);
    extractLogBandEnergies(spectrum, 16, output, 255);
    expect(output).toHaveLength(16);
  });

  it("outputs are in [0, 1] range for valid inputs", () => {
    const spectrum = new Float32Array(512).fill(200);
    const output = new Float32Array(8);
    extractLogBandEnergies(spectrum, 8, output, 255);
    for (const val of output) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });

  it("zero spectrum produces zero output", () => {
    const spectrum = new Float32Array(512);
    const output = new Float32Array(8);
    extractLogBandEnergies(spectrum, 8, output, 255);
    for (const val of output) {
      expect(val).toBe(0);
    }
  });

  it("higher maxValue produces lower normalized output for same spectrum", () => {
    const spectrum = new Float32Array(512).fill(128);
    const outputLow = new Float32Array(8);
    const outputHigh = new Float32Array(8);
    extractLogBandEnergies(spectrum, 8, outputLow, 128);
    extractLogBandEnergies(spectrum, 8, outputHigh, 255);
    // Same spectrum energy, higher max → lower normalized value
    expect(outputLow[4]).toBeGreaterThan(outputHigh[4]);
  });
});
