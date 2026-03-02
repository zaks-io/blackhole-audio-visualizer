import { describe, it, expect } from "vitest";
import { pearsonCorrelation, generatePromptFragment } from "../analysis";

describe("pearsonCorrelation", () => {
  it("returns 1 for perfect positive correlation", () => {
    const r = pearsonCorrelation([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
    expect(r).toBeCloseTo(1, 5);
  });

  it("returns -1 for perfect negative correlation", () => {
    const r = pearsonCorrelation([1, 2, 3, 4, 5], [10, 8, 6, 4, 2]);
    expect(r).toBeCloseTo(-1, 5);
  });

  it("returns ~0 for uncorrelated data", () => {
    const r = pearsonCorrelation([1, 2, 3, 4, 5, 6, 7, 8], [5, 2, 8, 1, 7, 3, 6, 4]);
    expect(Math.abs(r)).toBeLessThan(0.3);
  });

  it("returns 0 for fewer than 3 data points", () => {
    expect(pearsonCorrelation([1, 2], [3, 4])).toBe(0);
    expect(pearsonCorrelation([], [])).toBe(0);
  });

  it("returns 0 for constant x values", () => {
    expect(pearsonCorrelation([5, 5, 5, 5], [1, 2, 3, 4])).toBe(0);
  });

  it("returns 0 for constant y values", () => {
    expect(pearsonCorrelation([1, 2, 3, 4], [5, 5, 5, 5])).toBe(0);
  });

  it("handles normalized 0-1 ranges correctly", () => {
    const r = pearsonCorrelation([0.0, 0.25, 0.5, 0.75, 1.0], [0.1, 0.3, 0.5, 0.7, 0.9]);
    expect(r).toBeCloseTo(1, 5);
  });
});

describe("generatePromptFragment", () => {
  const baseData = {
    totalVotes: 50,
    presetsAnalyzed: 20,
    clusters: [],
    antiPatterns: [],
    parameterImportance: [],
  };

  it("includes vote count in header", () => {
    const result = generatePromptFragment(baseData);
    expect(result).toContain("50 votes");
    expect(result).toContain("20 presets");
  });

  it("includes parameter importance when present", () => {
    const result = generatePromptFragment({
      ...baseData,
      parameterImportance: [
        { param: "Physics.gravity", correlation: 0.4 },
        { param: "Emitters.emitRadius", correlation: -0.3 },
      ],
    });
    expect(result).toContain("Parameters that matter most");
    expect(result).toContain("gravity");
    expect(result).toContain("emitRadius");
  });

  it("strips group prefix from param names", () => {
    const result = generatePromptFragment({
      ...baseData,
      parameterImportance: [{ param: "Physics.gravity", correlation: 0.5 }],
    });
    expect(result).toContain("gravity");
    expect(result).not.toContain("Physics.gravity");
  });

  it("caps parameter importance to 8 entries", () => {
    const importance = Array.from({ length: 12 }, (_, i) => ({
      param: `Group.param${i}`,
      correlation: 0.5 - i * 0.03,
    }));
    const result = generatePromptFragment({
      ...baseData,
      parameterImportance: importance,
    });
    expect(result).toContain("param0");
    expect(result).toContain("param7");
    expect(result).not.toContain("param8");
  });

  it("uses directional language for preferred clusters", () => {
    const result = generatePromptFragment({
      ...baseData,
      clusters: [
        {
          label: "high-gravity",
          size: 10,
          avgScore: 2.5,
          centroid: [
            // gravity: min=10000, max=1000000, default=100000
            // value=900000 => normalized 0.899, default normalized 0.091
            // deviation = 0.808 > 0.5 => "much higher than default"
            { param: "Physics.gravity", value: 900000 },
          ],
          topPalettes: ["nebula-dreams"],
          topCameraModes: ["orbit"],
        },
      ],
      parameterImportance: [],
    });
    expect(result).toContain("Preferred Combinations");
    expect(result).toContain("tends much higher than default");
    expect(result).not.toContain("900000");
  });

  it('uses "somewhat" for moderate deviations', () => {
    const result = generatePromptFragment({
      ...baseData,
      clusters: [
        {
          label: "moderate",
          size: 5,
          avgScore: 1.0,
          centroid: [
            // orbitRadius: min=25, max=100, default=100
            // value=50 => normalized 0.333, default normalized 1.0
            // deviation = 0.667 > 0.5 => actually "much" lower
            // Let's use a value closer to default for "somewhat"
            // value=75 => normalized 0.667, default normalized 1.0
            // deviation = 0.333 > 0.2 but < 0.5 => "somewhat lower than default"
            { param: "Black Hole.orbitRadius", value: 75 },
          ],
          topPalettes: [],
          topCameraModes: [],
        },
      ],
      parameterImportance: [],
    });
    expect(result).toContain("somewhat lower than default");
  });

  it("skips clusters with avgScore <= 0", () => {
    const result = generatePromptFragment({
      ...baseData,
      clusters: [
        {
          label: "bad-cluster",
          size: 5,
          avgScore: -1.0,
          centroid: [{ param: "Physics.gravity", value: 500000 }],
          topPalettes: [],
          topCameraModes: [],
        },
      ],
      parameterImportance: [],
    });
    expect(result).not.toContain("Preferred Combinations");
  });

  it("uses range regions for anti-patterns", () => {
    const result = generatePromptFragment({
      ...baseData,
      antiPatterns: [
        {
          description: "Disliked: high-gravity",
          params: [
            // gravity: min=10000, max=1000000
            // ~900000 => normalized 0.899 > 0.66 => "high"
            { param: "Physics.gravity", range: "~900000" },
          ],
          avgScore: -1.5,
        },
      ],
      parameterImportance: [],
    });
    expect(result).toContain("Combinations to Avoid");
    expect(result).toContain("gravity in the high range");
    expect(result).not.toContain("900000");
  });

  it('classifies low values as "low" range', () => {
    const result = generatePromptFragment({
      ...baseData,
      antiPatterns: [
        {
          description: "Disliked: low-gravity",
          params: [
            // ~50000 => normalized (50000-10000)/(1000000-10000) = 0.04 < 0.33 => "low"
            { param: "Physics.gravity", range: "~50000" },
          ],
          avgScore: -0.5,
        },
      ],
      parameterImportance: [],
    });
    expect(result).toContain("gravity in the low range");
  });

  it("falls back to raw range for unknown params", () => {
    const result = generatePromptFragment({
      ...baseData,
      antiPatterns: [
        {
          description: "Disliked: unknown",
          params: [{ param: "Unknown.param", range: "~42" }],
          avgScore: -1.0,
        },
      ],
      parameterImportance: [],
    });
    expect(result).toContain("param: ~42");
  });

  it("includes palettes and camera modes for clusters", () => {
    const result = generatePromptFragment({
      ...baseData,
      clusters: [
        {
          label: "test",
          size: 5,
          avgScore: 1.0,
          centroid: [],
          topPalettes: ["nebula-dreams", "synthwave-horizon"],
          topCameraModes: ["orbit", "closeup"],
        },
      ],
      parameterImportance: [],
    });
    expect(result).toContain("nebula-dreams, synthwave-horizon");
    expect(result).toContain("orbit, closeup");
  });

  it("ends with diversity-encouraging message", () => {
    const result = generatePromptFragment(baseData);
    expect(result).toContain("Prioritize creating a diverse");
  });
});
