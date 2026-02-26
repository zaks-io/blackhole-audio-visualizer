import { describe, it, expect, afterEach } from "vitest";
import { isElectron, isWeb } from "../platform";

describe("isElectron", () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    // Restore window to its original state
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });

  it("returns true when window.electronAPI.isElectron is truthy", () => {
    Object.defineProperty(globalThis, "window", {
      value: { electronAPI: { isElectron: true } },
      writable: true,
      configurable: true,
    });
    expect(isElectron()).toBe(true);
  });

  it("returns false when window.electronAPI is undefined", () => {
    Object.defineProperty(globalThis, "window", {
      value: {},
      writable: true,
      configurable: true,
    });
    expect(isElectron()).toBe(false);
  });

  it("returns false when window.electronAPI.isElectron is falsy", () => {
    Object.defineProperty(globalThis, "window", {
      value: { electronAPI: { isElectron: false } },
      writable: true,
      configurable: true,
    });
    expect(isElectron()).toBe(false);
  });

  it("returns false when window is undefined", () => {
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(isElectron()).toBe(false);
  });
});

describe("isWeb", () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    Object.defineProperty(globalThis, "window", {
      value: originalWindow,
      writable: true,
      configurable: true,
    });
  });

  it("returns false when electronAPI is present (in Electron)", () => {
    Object.defineProperty(globalThis, "window", {
      value: { electronAPI: { isElectron: true } },
      writable: true,
      configurable: true,
    });
    expect(isWeb()).toBe(false);
  });

  it("returns true when electronAPI is absent (in browser)", () => {
    Object.defineProperty(globalThis, "window", {
      value: {},
      writable: true,
      configurable: true,
    });
    expect(isWeb()).toBe(true);
  });

  it("returns true when window is undefined (SSR)", () => {
    Object.defineProperty(globalThis, "window", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    expect(isWeb()).toBe(true);
  });

  it("is always the opposite of isElectron", () => {
    Object.defineProperty(globalThis, "window", {
      value: { electronAPI: { isElectron: true } },
      writable: true,
      configurable: true,
    });
    expect(isWeb()).toBe(!isElectron());
  });
});
