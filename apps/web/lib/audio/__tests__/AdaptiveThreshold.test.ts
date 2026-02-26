import { describe, it, expect } from "vitest";
import { AdaptiveThreshold } from "../AdaptiveThreshold";

describe("AdaptiveThreshold", () => {
  it("initializes with mean and variance at 0", () => {
    const at = new AdaptiveThreshold();
    expect(at.getMean()).toBe(0);
    expect(at.getVariance()).toBe(0);
  });

  it("running mean tracks input over time", () => {
    const at = new AdaptiveThreshold({ alpha: 0.5 });
    // After many updates with a constant value the mean should converge to it
    for (let i = 0; i < 50; i++) at.update(1.0);
    expect(at.getMean()).toBeCloseTo(1.0, 1);
  });

  it("mean moves toward new value after a step change", () => {
    const at = new AdaptiveThreshold({ alpha: 0.5 });
    for (let i = 0; i < 20; i++) at.update(0.0);
    const meanBefore = at.getMean();
    at.update(1.0);
    expect(at.getMean()).toBeGreaterThan(meanBefore);
  });

  it("variance tracks spread of signal", () => {
    const at = new AdaptiveThreshold({ alpha: 0.2 });
    // Alternating values should produce nonzero variance
    for (let i = 0; i < 40; i++) at.update(i % 2 === 0 ? 0 : 1);
    expect(at.getVariance()).toBeGreaterThan(0);
  });

  it("stddev is sqrt of variance", () => {
    const at = new AdaptiveThreshold({ alpha: 0.2 });
    for (let i = 0; i < 20; i++) at.update(i % 2 === 0 ? 0 : 1);
    expect(at.getStdDev()).toBeCloseTo(Math.sqrt(at.getVariance()), 10);
  });

  it("threshold equals mean + multiplier * stddev", () => {
    const multiplier = 2.0;
    const at = new AdaptiveThreshold({ alpha: 0.2, peakMultiplier: multiplier });
    for (let i = 0; i < 30; i++) at.update(Math.random());
    expect(at.getThreshold()).toBeCloseTo(at.getMean() + multiplier * at.getStdDev(), 10);
  });

  it("isPeak returns true for value exceeding threshold with sufficient distance", () => {
    const at = new AdaptiveThreshold({ alpha: 0.3, peakMultiplier: 1.0, minPeakDistanceMs: 10 });
    // Establish baseline
    for (let i = 0; i < 30; i++) at.update(0.1);
    // Very large value should exceed adaptive threshold
    const result = at.isPeak(100, 1000);
    expect(result).toBe(true);
  });

  it("isPeak returns false when minimum distance has not elapsed", () => {
    const at = new AdaptiveThreshold({ minPeakDistanceMs: 100 });
    for (let i = 0; i < 30; i++) at.update(0.1);
    // First peak at t=1000
    at.isPeak(100, 1000);
    // Second peak before 100ms have passed
    const tooSoon = at.isPeak(100, 1050);
    expect(tooSoon).toBe(false);
  });

  it("isPeak returns true again after minimum distance has elapsed", () => {
    const at = new AdaptiveThreshold({ minPeakDistanceMs: 100, peakMultiplier: 0.5 });
    for (let i = 0; i < 30; i++) at.update(0.1);
    at.isPeak(100, 1000);
    const afterWait = at.isPeak(100, 1200);
    expect(afterWait).toBe(true);
  });

  it("isPeak returns false when value is below threshold", () => {
    const at = new AdaptiveThreshold({ alpha: 0.5, peakMultiplier: 1.5 });
    // Drive mean high so threshold is also high
    for (let i = 0; i < 50; i++) at.update(1.0);
    // Low value should be below threshold
    const result = at.isPeak(0.0, 9999);
    expect(result).toBe(false);
  });

  it("reset clears mean, variance, and lastPeakTime", () => {
    const at = new AdaptiveThreshold({ minPeakDistanceMs: 500 });
    for (let i = 0; i < 20; i++) at.update(0.8);
    at.isPeak(10, 1000);
    at.reset();
    expect(at.getMean()).toBe(0);
    expect(at.getVariance()).toBe(0);
    // After reset, peak at t=0 should work (distance respected from t=0)
    // t=50 is 50ms which is < 500ms default, but lastPeakTime reset to 0
    // isPeak at t=600 should work if value exceeds threshold (which is 0 after reset)
    const afterReset = at.isPeak(1.0, 600);
    expect(afterReset).toBe(true);
  });
});
