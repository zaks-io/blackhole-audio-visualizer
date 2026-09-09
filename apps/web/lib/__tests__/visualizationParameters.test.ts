import { describe, it, expect } from "vitest";
import { PARAMS, getParameterGroups } from "../visualizationParameters";

describe("PARAMS definitions", () => {
  it("every parameter has min < max", () => {
    for (const [path, param] of Object.entries(PARAMS)) {
      expect(param.min, `${path}: min must be < max`).toBeLessThan(param.max);
    }
  });

  it("every parameter default is within [min, max]", () => {
    for (const [path, param] of Object.entries(PARAMS)) {
      expect(param.default, `${path}: default must be >= min`).toBeGreaterThanOrEqual(param.min);
      expect(param.default, `${path}: default must be <= max`).toBeLessThanOrEqual(param.max);
    }
  });

  it("every parameter has step > 0", () => {
    for (const [path, param] of Object.entries(PARAMS)) {
      expect(param.step, `${path}: step must be > 0`).toBeGreaterThan(0);
    }
  });

  it("every parameter has a non-empty label and group", () => {
    for (const [path, param] of Object.entries(PARAMS)) {
      expect(param.label, `${path}: label must not be empty`).toBeTruthy();
      expect(param.group, `${path}: group must not be empty`).toBeTruthy();
    }
  });

  it("every parameter has a boolean system field", () => {
    for (const [path, param] of Object.entries(PARAMS)) {
      expect(typeof param.system, `${path}: system must be boolean`).toBe("boolean");
    }
  });
});

describe("getParameterGroups", () => {
  it("excludes system params when includeSystem is false", () => {
    const groups = getParameterGroups(false);
    const allParams = groups.flatMap((g) => g.parameters);
    // Cross-check against PARAMS: none of the returned params should be system
    for (const param of allParams) {
      const def = PARAMS[param.path];
      expect(def.system, `${param.path} should not be system`).toBe(false);
    }
  });

  it("includes system params when includeSystem is true", () => {
    const withSystem = getParameterGroups(true);
    const withoutSystem = getParameterGroups(false);
    const withCount = withSystem.flatMap((g) => g.parameters).length;
    const withoutCount = withoutSystem.flatMap((g) => g.parameters).length;
    expect(withCount).toBeGreaterThan(withoutCount);
  });

  it("all params are included when includeSystem is true", () => {
    const groups = getParameterGroups(true);
    const allPaths = groups.flatMap((g) => g.parameters.map((p) => p.path));
    const expectedPaths = Object.keys(PARAMS);
    for (const path of expectedPaths) {
      expect(allPaths, `${path} should be present`).toContain(path);
    }
  });

  it("each group has a non-empty name and at least one parameter", () => {
    const groups = getParameterGroups(true);
    for (const group of groups) {
      expect(group.name).toBeTruthy();
      expect(group.parameters.length).toBeGreaterThan(0);
    }
  });

  it("storeKey is the part after the dot in path", () => {
    const groups = getParameterGroups(true);
    for (const group of groups) {
      for (const param of group.parameters) {
        const expected = param.path.split(".")[1];
        expect(param.storeKey).toBe(expected);
      }
    }
  });
});
