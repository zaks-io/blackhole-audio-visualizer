import { describe, it, expect } from "vitest";
import { OnsetDetector } from "../OnsetDetector";

const FRAME_MS = 16;

function run(detector: OnsetDetector, energies: number[]): number[] {
  return energies.map((e, i) => detector.process(e, i * FRAME_MS));
}

describe("OnsetDetector", () => {
  it("fires once on the rising edge of a sustained note, not on its level", () => {
    const detector = new OnsetDetector();
    const strengths = run(detector, [0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5]);
    expect(strengths[3]).toBeGreaterThan(0);
    expect(strengths.slice(4).every((s) => s === 0)).toBe(true);
  });

  it("reports a softer hit as weaker than the loudest recent hit", () => {
    const detector = new OnsetDetector({ minIntervalMs: 0 });
    const loud = run(detector, [0, 0.8, 0, 0, 0, 0, 0, 0, 0, 0])[1];
    const soft = run(detector, [0, 0.3, 0])[1];
    expect(loud).toBeCloseTo(1, 5);
    expect(soft).toBeGreaterThan(0);
    expect(soft).toBeLessThan(loud);
  });

  it("respects the refractory interval", () => {
    const detector = new OnsetDetector({ minIntervalMs: 100 });
    // Two onsets 32ms apart: only the first counts
    const strengths = run(detector, [0, 0.8, 0, 0.8, 0]);
    expect(strengths[1]).toBeGreaterThan(0);
    expect(strengths[3]).toBe(0);
  });

  it("stays silent on a flat signal", () => {
    const detector = new OnsetDetector();
    const strengths = run(detector, new Array(60).fill(0.4));
    expect(strengths.slice(1).every((s) => s === 0)).toBe(true);
  });

  it("reset clears state", () => {
    const detector = new OnsetDetector();
    run(detector, [0, 0.8, 0.8]);
    detector.reset();
    expect(detector.getMean()).toBe(0);
    expect(detector.process(0.8, 5000)).toBeGreaterThan(0);
  });
});
