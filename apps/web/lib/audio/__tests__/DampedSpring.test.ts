import { describe, it, expect } from "vitest";
import { DampedSpring } from "../DampedSpring";

const DT = 1 / 60;

function simulate(spring: DampedSpring, seconds: number): number[] {
  const positions: number[] = [];
  for (let t = 0; t < seconds; t += DT) positions.push(spring.step(DT));
  return positions;
}

describe("DampedSpring", () => {
  it("rests at zero without input", () => {
    const spring = new DampedSpring({ frequencyHz: 4, dampingRatio: 0.6 });
    expect(simulate(spring, 1).every((p) => p === 0)).toBe(true);
  });

  it("rises quickly after an impulse, then settles back to rest", () => {
    const spring = new DampedSpring({ frequencyHz: 4, dampingRatio: 0.6 });
    spring.impulse(20);
    const positions = simulate(spring, 1);
    const peakIndex = positions.indexOf(Math.max(...positions));
    // Peak within ~60ms of the hit, near +40%
    expect(peakIndex * DT).toBeLessThan(0.06);
    expect(positions[peakIndex]).toBeGreaterThan(0.3);
    expect(positions[peakIndex]).toBeLessThan(0.5);
    // Settled by one second
    expect(Math.abs(positions[positions.length - 1])).toBeLessThan(0.01);
  });

  it("rebounds below rest only slightly when underdamped", () => {
    const spring = new DampedSpring({ frequencyHz: 4, dampingRatio: 0.6 });
    spring.impulse(20);
    const positions = simulate(spring, 1);
    const trough = Math.min(...positions);
    expect(trough).toBeLessThan(0);
    expect(trough).toBeGreaterThan(-0.1);
  });

  it("scales linearly with impulse strength", () => {
    const a = new DampedSpring({ frequencyHz: 4, dampingRatio: 0.6 });
    const b = new DampedSpring({ frequencyHz: 4, dampingRatio: 0.6 });
    a.impulse(10);
    b.impulse(20);
    const peakA = Math.max(...simulate(a, 0.5));
    const peakB = Math.max(...simulate(b, 0.5));
    expect(peakB / peakA).toBeCloseTo(2, 5);
  });

  it("gives the same response at 60 and 120 fps", () => {
    const a = new DampedSpring({ frequencyHz: 4, dampingRatio: 0.6 });
    const b = new DampedSpring({ frequencyHz: 4, dampingRatio: 0.6 });
    a.impulse(20);
    b.impulse(20);
    for (let i = 0; i < 30; i++) {
      a.step(1 / 60);
      b.step(1 / 120);
      b.step(1 / 120);
      expect(b.getPosition()).toBeCloseTo(a.getPosition(), 10);
    }
  });

  it("settles through a long stalled frame", () => {
    const spring = new DampedSpring({ frequencyHz: 4, dampingRatio: 0.6 });
    spring.impulse(20);
    expect(Math.abs(spring.step(2))).toBeLessThan(0.001);
  });

  it("rejects damping ratios outside (0, 1)", () => {
    expect(() => new DampedSpring({ frequencyHz: 4, dampingRatio: 1 })).toThrow();
    expect(() => new DampedSpring({ frequencyHz: 4, dampingRatio: 0 })).toThrow();
  });
});
