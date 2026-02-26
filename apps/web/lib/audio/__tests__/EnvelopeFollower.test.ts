import { describe, it, expect } from "vitest";
import { EnvelopeFollower, SimpleEnvelope } from "../EnvelopeFollower";

describe("EnvelopeFollower", () => {
  it("initializes at 0", () => {
    const env = new EnvelopeFollower();
    expect(env.getValue()).toBe(0);
  });

  it("rises toward input during attack (fast attack config)", () => {
    // Very fast attack: attackMs near 0 means coef near 0, so (1 - coef) * input dominates
    const env = new EnvelopeFollower({ attackMs: 0.001, releaseMs: 500, sampleRate: 48000 });
    const result = env.process(1.0);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThanOrEqual(1.0);
  });

  it("decays slower than it attacks", () => {
    const env = new EnvelopeFollower({ attackMs: 1, releaseMs: 200, sampleRate: 48000 });

    // Drive envelope up
    for (let i = 0; i < 50; i++) env.process(1.0);
    const peak = env.getValue();

    // Single step down toward 0
    env.process(0);
    const afterDecay = env.getValue();

    // Single step up from 0 starting fresh instance
    const env2 = new EnvelopeFollower({ attackMs: 1, releaseMs: 200, sampleRate: 48000 });
    env2.process(0); // stays at 0
    const attackStep = env2.process(1.0);

    // Attack rise from 0 should be larger than one release step from peak
    // (release is slower)
    expect(peak - afterDecay).toBeLessThan(attackStep);
  });

  it("sustains near input level given continuous identical input", () => {
    const env = new EnvelopeFollower({ attackMs: 1, releaseMs: 100, sampleRate: 48000 });
    // Drive envelope to converge
    for (let i = 0; i < 200; i++) env.process(0.5);
    expect(env.getValue()).toBeCloseTo(0.5, 1);
  });

  it("reset returns value to 0", () => {
    const env = new EnvelopeFollower();
    for (let i = 0; i < 10; i++) env.process(1.0);
    expect(env.getValue()).toBeGreaterThan(0);
    env.reset();
    expect(env.getValue()).toBe(0);
  });

  it("takes absolute value of negative input", () => {
    const pos = new EnvelopeFollower({ attackMs: 0.001 });
    const neg = new EnvelopeFollower({ attackMs: 0.001 });
    const posResult = pos.process(0.5);
    const negResult = neg.process(-0.5);
    expect(posResult).toBeCloseTo(negResult, 10);
  });

  it("process returns the envelope value", () => {
    const env = new EnvelopeFollower();
    const returned = env.process(0.7);
    expect(returned).toBe(env.getValue());
  });
});

describe("SimpleEnvelope", () => {
  it("initializes at 0", () => {
    const env = new SimpleEnvelope();
    expect(env.getValue()).toBe(0);
  });

  it("instantly attacks to input value", () => {
    const env = new SimpleEnvelope(0.9);
    const result = env.process(0.8);
    expect(result).toBeCloseTo(0.8, 5);
  });

  it("decays after peak input is removed", () => {
    const env = new SimpleEnvelope(0.9);
    env.process(1.0);
    const decayed = env.process(0);
    expect(decayed).toBeCloseTo(0.9, 5);
  });

  it("decays fully to zero over many frames", () => {
    const env = new SimpleEnvelope(0.5);
    env.process(1.0);
    for (let i = 0; i < 200; i++) env.process(0);
    expect(env.getValue()).toBeCloseTo(0, 2);
  });

  it("clamps input above 1.0 to 1.0", () => {
    const env = new SimpleEnvelope(0.9);
    env.process(5.0);
    expect(env.getValue()).toBeCloseTo(1.0, 5);
  });

  it("faster decay (lower factor) drops faster", () => {
    const fast = new SimpleEnvelope(0.5);
    const slow = new SimpleEnvelope(0.95);
    fast.process(1.0);
    slow.process(1.0);
    for (let i = 0; i < 10; i++) {
      fast.process(0);
      slow.process(0);
    }
    expect(fast.getValue()).toBeLessThan(slow.getValue());
  });

  it("reset returns value to 0", () => {
    const env = new SimpleEnvelope(0.9);
    env.process(1.0);
    expect(env.getValue()).toBeGreaterThan(0);
    env.reset();
    expect(env.getValue()).toBe(0);
  });

  it("setDecay changes decay behavior", () => {
    const env = new SimpleEnvelope(0.9);
    env.process(1.0);
    env.setDecay(0.1);
    const result = env.process(0);
    // With decay 0.1, value should be 1.0 * 0.1 = 0.1
    expect(result).toBeCloseTo(0.1, 5);
  });
});
