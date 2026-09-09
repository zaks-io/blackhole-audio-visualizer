import { describe, it, expect } from "vitest";
import { BeatResponse, type BeatAnalysis } from "../beatResponse";

const DT = 1 / 60;

function analysis(overrides: Partial<BeatAnalysis> = {}): BeatAnalysis {
  return {
    timestamp: 1,
    onsets: { bass: 0, mid: 0, high: 0 },
    energy: { overall: 0, subBass: 0, bass: 0, lowMid: 0, mid: 0, highMid: 0, high: 0 },
    ...overrides,
  };
}

function run(response: BeatResponse, frames: BeatAnalysis[], beatPulse = 1): void {
  for (const frame of frames) response.update(frame, DT, beatPulse);
}

describe("BeatResponse", () => {
  it("rests at 1 without audio", () => {
    const response = new BeatResponse();
    run(
      response,
      Array.from({ length: 30 }, (_, i) => analysis({ timestamp: i + 1 }))
    );
    for (let i = 0; i < 4; i++) {
      expect(response.sizePulse(i)).toBe(1);
      expect(response.massPulse(i, 1)).toBe(1);
    }
  });

  it("routes a bass onset to the kick sphere only", () => {
    const response = new BeatResponse();
    run(response, [analysis({ onsets: { bass: 1, mid: 0, high: 0 } })]);
    run(
      response,
      Array.from({ length: 3 }, (_, i) => analysis({ timestamp: i + 2 }))
    );
    expect(response.sizePulse(0)).toBeGreaterThan(1.1);
    expect(response.sizePulse(3)).toBeGreaterThan(1.1);
    expect(response.sizePulse(1)).toBe(1);
    expect(response.sizePulse(2)).toBe(1);
  });

  it("routes mid and high onsets to the snare and hat spheres", () => {
    const response = new BeatResponse();
    run(response, [analysis({ onsets: { bass: 0, mid: 1, high: 0.5 } })]);
    run(
      response,
      Array.from({ length: 3 }, (_, i) => analysis({ timestamp: i + 2 }))
    );
    expect(response.sizePulse(0)).toBe(1);
    expect(response.sizePulse(1)).toBeGreaterThan(response.sizePulse(2));
    expect(response.sizePulse(2)).toBeGreaterThan(1);
  });

  it("applies one analysis frame once even when rendered twice", () => {
    const once = new BeatResponse();
    const twice = new BeatResponse();
    const hit = analysis({ onsets: { bass: 1, mid: 0, high: 0 } });
    run(once, [hit, analysis({ timestamp: 2 })]);
    run(twice, [hit, hit]);
    expect(twice.sizePulse(0)).toBeCloseTo(once.sizePulse(0), 6);
  });

  it("swells with sustained band energy and settles when it drops", () => {
    const response = new BeatResponse();
    const loud = { overall: 0, subBass: 0.8, bass: 0.8, lowMid: 0, mid: 0, highMid: 0, high: 0 };
    run(
      response,
      Array.from({ length: 12 }, (_, i) => analysis({ timestamp: i + 1, energy: loud }))
    );
    // ~200ms in: near the full swell (0.8 energy * 0.25 gain = +20%)
    expect(response.sizePulse(0)).toBeGreaterThan(1.15);
    expect(response.sizePulse(0)).toBeLessThan(1.21);
    // Other bands are untouched by bass energy
    expect(response.sizePulse(1)).toBe(1);
    // Swell moves size only; gravity follows the hit layer
    expect(response.massPulse(0, 1)).toBe(1);

    run(
      response,
      Array.from({ length: 12 }, (_, i) => analysis({ timestamp: i + 100 }))
    );
    // ~200ms after silence: released roughly halfway (400ms time constant)
    expect(response.sizePulse(0)).toBeLessThan(1.15);
    expect(response.sizePulse(0)).toBeGreaterThan(1.05);
    run(
      response,
      Array.from({ length: 120 }, (_, i) => analysis({ timestamp: i + 200 }))
    );
    expect(response.sizePulse(0)).toBeLessThan(1.01);
  });

  it("scales both layers by beatPulse", () => {
    const response = new BeatResponse();
    const loud = { overall: 0, subBass: 1, bass: 1, lowMid: 0, mid: 0, highMid: 0, high: 0 };
    run(response, [analysis({ onsets: { bass: 1, mid: 0, high: 0 }, energy: loud })], 0);
    run(
      response,
      Array.from({ length: 10 }, (_, i) => analysis({ timestamp: i + 2, energy: loud })),
      0
    );
    expect(response.sizePulse(0)).toBe(1);
  });

  it("returns to rest on reset", () => {
    const response = new BeatResponse();
    const loud = { overall: 0, subBass: 1, bass: 1, lowMid: 0, mid: 0, highMid: 0, high: 0 };
    run(response, [analysis({ onsets: { bass: 1, mid: 0, high: 0 }, energy: loud })]);
    response.reset();
    expect(response.sizePulse(0)).toBe(1);
    expect(response.massPulse(0, 1)).toBe(1);
  });
});
