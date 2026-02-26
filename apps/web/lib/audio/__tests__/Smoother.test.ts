import { describe, it, expect } from "vitest";
import { Smoother, AutoNormalizer, MultiSmoother } from "../Smoother";

describe("Smoother", () => {
  it("initializes at 0", () => {
    const s = new Smoother();
    expect(s.getValue()).toBe(0);
  });

  it("moves toward target with each process call", () => {
    const s = new Smoother(0.5);
    const first = s.process(1.0);
    expect(first).toBeCloseTo(0.5, 5);
  });

  it("converges to stable input over many iterations", () => {
    const s = new Smoother(0.8);
    for (let i = 0; i < 100; i++) s.process(0.75);
    expect(s.getValue()).toBeCloseTo(0.75, 2);
  });

  it("process returns the updated value", () => {
    const s = new Smoother(0.5);
    const returned = s.process(1.0);
    expect(returned).toBe(s.getValue());
  });

  it("reset sets value to 0 by default", () => {
    const s = new Smoother(0.8);
    for (let i = 0; i < 10; i++) s.process(1.0);
    s.reset();
    expect(s.getValue()).toBe(0);
  });

  it("reset accepts a custom value", () => {
    const s = new Smoother(0.8);
    s.reset(0.42);
    expect(s.getValue()).toBe(0.42);
  });

  it("setLerpFactor changes smoothing speed", () => {
    const slow = new Smoother(0.1);
    const fast = new Smoother(0.9);
    slow.process(1.0);
    fast.process(1.0);
    expect(fast.getValue()).toBeGreaterThan(slow.getValue());
  });
});

describe("AutoNormalizer", () => {
  it("maps first value to 1 (it becomes the max)", () => {
    const an = new AutoNormalizer();
    const result = an.normalize(0.5);
    expect(result).toBeCloseTo(1.0, 5);
  });

  it("subsequent values higher than seen max return 1", () => {
    const an = new AutoNormalizer();
    an.normalize(0.5);
    const result = an.normalize(0.8);
    expect(result).toBeCloseTo(1.0, 5);
  });

  it("values below the running max return values in (0, 1)", () => {
    const an = new AutoNormalizer({ decay: 1.0 }); // no decay so max stays
    an.normalize(1.0); // establish max
    const result = an.normalize(0.5);
    expect(result).toBeCloseTo(0.5, 5);
  });

  it("output is capped at 1", () => {
    const an = new AutoNormalizer();
    an.normalize(0.1);
    const result = an.normalize(100);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("zero input does not produce NaN (minValue guard)", () => {
    const an = new AutoNormalizer();
    const result = an.normalize(0);
    expect(Number.isNaN(result)).toBe(false);
    expect(result).toBe(0);
  });

  it("getMax returns the tracked max", () => {
    const an = new AutoNormalizer({ decay: 1.0 });
    an.normalize(0.7);
    expect(an.getMax()).toBeCloseTo(0.7, 5);
  });

  it("reset returns max to minValue", () => {
    const an = new AutoNormalizer({ minValue: 0.001 });
    an.normalize(0.9);
    an.reset();
    expect(an.getMax()).toBeCloseTo(0.001, 5);
  });

  it("lower decay causes max to decay faster", () => {
    const fast = new AutoNormalizer({ decay: 0.5 });
    const slow = new AutoNormalizer({ decay: 0.999 });
    fast.normalize(1.0);
    slow.normalize(1.0);
    // 10 calls with 0 input
    for (let i = 0; i < 10; i++) {
      fast.normalize(0);
      slow.normalize(0);
    }
    expect(fast.getMax()).toBeLessThan(slow.getMax());
  });
});

describe("MultiSmoother", () => {
  it("initializes all values to 0", () => {
    const ms = new MultiSmoother(4);
    const values = ms.getValues();
    for (const v of values) expect(v).toBe(0);
  });

  it("processes all bands toward targets", () => {
    const ms = new MultiSmoother(3, 1.0); // lerpFactor 1 = instant
    const targets = new Float32Array([0.2, 0.5, 0.8]);
    const result = ms.process(targets);
    expect(result[0]).toBeCloseTo(0.2, 5);
    expect(result[1]).toBeCloseTo(0.5, 5);
    expect(result[2]).toBeCloseTo(0.8, 5);
  });

  it("converges each band to its target independently", () => {
    const ms = new MultiSmoother(2, 0.9);
    const targets = new Float32Array([0.3, 0.7]);
    for (let i = 0; i < 100; i++) ms.process(targets);
    const values = ms.getValues();
    expect(values[0]).toBeCloseTo(0.3, 2);
    expect(values[1]).toBeCloseTo(0.7, 2);
  });

  it("reset zeroes all bands", () => {
    const ms = new MultiSmoother(4, 0.8);
    ms.process(new Float32Array([1, 1, 1, 1]));
    ms.reset();
    for (const v of ms.getValues()) expect(v).toBe(0);
  });

  it("setLerpFactor changes convergence rate", () => {
    const ms = new MultiSmoother(2, 0.1);
    ms.process(new Float32Array([1, 1]));
    const slow = ms.getValues()[0];
    ms.reset();
    ms.setLerpFactor(0.9);
    ms.process(new Float32Array([1, 1]));
    const fast = ms.getValues()[0];
    expect(fast).toBeGreaterThan(slow);
  });

  it("handles array targets as well as Float32Array", () => {
    const ms = new MultiSmoother(3, 1.0);
    const result = ms.process([0.1, 0.2, 0.3]);
    expect(result[0]).toBeCloseTo(0.1, 5);
    expect(result[1]).toBeCloseTo(0.2, 5);
    expect(result[2]).toBeCloseTo(0.3, 5);
  });

  it("extra target elements beyond count are ignored", () => {
    const ms = new MultiSmoother(2, 1.0);
    // Targets has 4 elements but MultiSmoother only has 2 slots
    ms.process(new Float32Array([0.5, 0.6, 0.7, 0.8]));
    expect(ms.getValues()).toHaveLength(2);
  });
});
