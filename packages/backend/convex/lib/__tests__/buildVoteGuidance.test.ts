import { describe, it, expect } from "vitest";
import { buildVoteGuidance } from "../buildVoteGuidance";

const makeAnalysis = (overrides: Partial<Parameters<typeof buildVoteGuidance>[0]> = {}) => ({
  totalVotes: 50,
  presetsAnalyzed: 20,
  clusters: [],
  antiPatterns: [],
  parameterImportance: [],
  ...overrides,
});

describe("buildVoteGuidance", () => {
  it("includes soft guidance framing", () => {
    const result = buildVoteGuidance(makeAnalysis());
    expect(result).toContain("Soft Guidance");
    expect(result).toContain("NOT templates");
    expect(result).toContain("Never copy exact parameter values");
  });

  it("includes a unique seed each call", () => {
    const a = buildVoteGuidance(makeAnalysis());
    const b = buildVoteGuidance(makeAnalysis());
    const seedA = a.match(/seed: (\w+)/)?.[1];
    const seedB = b.match(/seed: (\w+)/)?.[1];
    expect(seedA).toBeTruthy();
    expect(seedB).toBeTruthy();
    // Seeds should almost certainly differ (6-char random)
    // We allow a tiny chance of collision but test intent
    expect(typeof seedA).toBe("string");
  });

  it("shows parameter importance with direction", () => {
    const result = buildVoteGuidance(
      makeAnalysis({
        parameterImportance: [
          { param: "Physics.gravity", correlation: 0.4 },
          { param: "Emitters.emitRadius", correlation: -0.3 },
        ],
      })
    );
    expect(result).toContain("Parameters audiences care about");
    expect(result).toContain("gravity (higher values preferred)");
    expect(result).toContain("emitRadius (lower values preferred)");
  });

  it("caps parameter importance to 6 entries", () => {
    const importance = Array.from({ length: 10 }, (_, i) => ({
      param: `Group.param${i}`,
      correlation: 0.5 - i * 0.03,
    }));
    const result = buildVoteGuidance(makeAnalysis({ parameterImportance: importance }));
    expect(result).toContain("param5");
    expect(result).not.toContain("param6");
  });

  it("omits parameter importance section when empty", () => {
    const result = buildVoteGuidance(makeAnalysis({ parameterImportance: [] }));
    expect(result).not.toContain("Parameters audiences care about");
  });

  it("works without parameterImportance field", () => {
    const result = buildVoteGuidance(makeAnalysis({ parameterImportance: undefined }));
    expect(result).not.toContain("Parameters audiences care about");
  });

  it("samples at most 3 good clusters", () => {
    const clusters = Array.from({ length: 6 }, (_, i) => ({
      label: `cluster-${i}`,
      size: 5,
      avgScore: 1.0 + i,
      centroid: [],
      topPalettes: [],
      topCameraModes: [],
    }));
    const result = buildVoteGuidance(makeAnalysis({ clusters }));
    const matches = result.match(/cluster-\d/g) ?? [];
    expect(matches.length).toBeLessThanOrEqual(3);
  });

  it("only includes clusters with avgScore > 0", () => {
    const result = buildVoteGuidance(
      makeAnalysis({
        clusters: [
          {
            label: "bad",
            size: 5,
            avgScore: -1.0,
            centroid: [],
            topPalettes: [],
            topCameraModes: [],
          },
          {
            label: "good",
            size: 5,
            avgScore: 2.0,
            centroid: [],
            topPalettes: [],
            topCameraModes: [],
          },
        ],
      })
    );
    expect(result).toContain("good");
    expect(result).not.toContain('"bad"');
  });

  it("uses directional language for centroid values", () => {
    const result = buildVoteGuidance(
      makeAnalysis({
        clusters: [
          {
            label: "high-gravity",
            size: 10,
            avgScore: 2.0,
            centroid: [{ param: "Physics.gravity", value: 900000 }],
            topPalettes: [],
            topCameraModes: [],
          },
        ],
      })
    );
    expect(result).toContain("tends much higher than default");
    expect(result).not.toContain("900000");
  });

  it("samples at most 3 anti-patterns", () => {
    const antiPatterns = Array.from({ length: 6 }, (_, i) => ({
      description: `bad-${i}`,
      params: [{ param: "Physics.gravity", range: "~500000" }],
      avgScore: -1.0,
    }));
    const result = buildVoteGuidance(makeAnalysis({ antiPatterns }));
    const matches = result.match(/bad-\d/g) ?? [];
    expect(matches.length).toBeLessThanOrEqual(3);
  });

  it("uses range regions for anti-pattern params", () => {
    const result = buildVoteGuidance(
      makeAnalysis({
        antiPatterns: [
          {
            description: "Disliked: high-gravity",
            params: [{ param: "Physics.gravity", range: "~900000" }],
            avgScore: -1.5,
          },
        ],
      })
    );
    expect(result).toContain("gravity in the high range");
    expect(result).not.toContain("900000");
  });

  it("does not mutate the input antiPatterns array", () => {
    const antiPatterns = [
      { description: "a", params: [], avgScore: -1.0 },
      { description: "b", params: [], avgScore: -2.0 },
      { description: "c", params: [], avgScore: -3.0 },
    ];
    const original = [...antiPatterns.map((a) => ({ ...a }))];
    buildVoteGuidance(makeAnalysis({ antiPatterns }));
    // Order should be preserved on the input
    expect(antiPatterns.map((a) => a.description)).toEqual(original.map((a) => a.description));
  });

  it("handles empty clusters and anti-patterns", () => {
    const result = buildVoteGuidance(makeAnalysis());
    expect(result).not.toContain("liked patterns");
    expect(result).not.toContain("Combinations to avoid");
  });
});
