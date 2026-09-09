import { describe, it, expect, beforeEach } from "vitest";
import { useVisualizationControls, pathToKey } from "../useVisualizationControls";
import { PARAM_DEFAULTS } from "@/lib/visualizationParameters";

// Access the store directly without React
const store = useVisualizationControls;

beforeEach(() => {
  store.getState().reset();
});

describe("set", () => {
  it("updates a numeric value in the store", () => {
    store.getState().set("gravity", 123456);
    expect(store.getState().gravity).toBe(123456);
  });

  it("updates a boolean value in the store", () => {
    store.getState().set("bloomEnabled", false);
    expect(store.getState().bloomEnabled).toBe(false);
  });

  it("updates a string value in the store", () => {
    store.getState().set("colorPalette", "neon");
    expect(store.getState().colorPalette).toBe("neon");
  });

  it("does not affect other fields", () => {
    const amplitudeBefore = store.getState().amplitude;
    store.getState().set("gravity", 999999);
    expect(store.getState().amplitude).toBe(amplitudeBefore);
  });
});

describe("get", () => {
  it("returns the current value for a key", () => {
    store.getState().set("emitRadius", 350);
    expect(store.getState().get("emitRadius")).toBe(350);
  });

  it("returns the default value before any mutations", () => {
    expect(store.getState().get("gravity")).toBe(PARAM_DEFAULTS.gravity);
  });
});

describe("setByPath", () => {
  it("maps a dot-notation path to the correct store key", () => {
    store.getState().setByPath("Physics.gravity", 250000);
    expect(store.getState().gravity).toBe(250000);
  });

  it("maps a Black Hole path correctly", () => {
    store.getState().setByPath("Black Hole.eventHorizonRadius", 10);
    expect(store.getState().eventHorizonRadius).toBe(10);
  });

  it("maps an Audio path correctly", () => {
    store.getState().setByPath("Audio.amplitude", 8.5);
    expect(store.getState().amplitude).toBe(8.5);
  });

  it("maps a Post-FX path correctly", () => {
    store.getState().setByPath("Post-FX.bloomAudioReactivity", 0.3);
    expect(store.getState().bloomAudioReactivity).toBeCloseTo(0.3, 5);
  });

  it("does nothing for an unknown path", () => {
    const before = store.getState().gravity;
    store.getState().setByPath("Unknown.nope", 42);
    expect(store.getState().gravity).toBe(before);
  });
});

describe("batchSetByPath", () => {
  it("applies multiple updates in one call", () => {
    store.getState().batchSetByPath([
      { path: "Physics.gravity", value: 300000 },
      { path: "Audio.amplitude", value: 9.0 },
      { path: "Emitters.emitRadius", value: 400 },
    ]);
    expect(store.getState().gravity).toBe(300000);
    expect(store.getState().amplitude).toBe(9.0);
    expect(store.getState().emitRadius).toBe(400);
  });

  it("silently ignores unknown paths in a batch", () => {
    const before = store.getState().gravity;
    store.getState().batchSetByPath([
      { path: "Fake.path", value: 1 },
      { path: "Another.bad", value: 2 },
    ]);
    expect(store.getState().gravity).toBe(before);
  });

  it("handles an empty array without throwing", () => {
    expect(() => store.getState().batchSetByPath([])).not.toThrow();
  });
});

describe("getByPath", () => {
  it("returns the value for a known path", () => {
    store.getState().set("gravity", 77777);
    expect(store.getState().getByPath("Physics.gravity")).toBe(77777);
  });

  it("returns undefined for an unknown path", () => {
    expect(store.getState().getByPath("Unknown.key")).toBeUndefined();
  });
});

describe("reset", () => {
  it("restores all numeric values to defaults", () => {
    store.getState().set("gravity", 999999);
    store.getState().set("amplitude", 9.9);
    store.getState().set("emitRadius", 500);
    store.getState().reset();
    expect(store.getState().gravity).toBe(PARAM_DEFAULTS.gravity);
    expect(store.getState().amplitude).toBe(PARAM_DEFAULTS.amplitude);
    expect(store.getState().emitRadius).toBe(PARAM_DEFAULTS.emitRadius);
  });

  it("restores non-numeric defaults", () => {
    store.getState().set("colorPalette", "neon");
    store.getState().set("bloomEnabled", false);
    store.getState().reset();
    expect(store.getState().colorPalette).toBe("grayscale");
    expect(store.getState().bloomEnabled).toBe(true);
  });
});

describe("pathToKey", () => {
  it("covers all expected groups", () => {
    const paths = Object.keys(pathToKey);
    const groups = new Set(paths.map((p) => p.split(".")[0]));
    expect(groups.has("Black Hole")).toBe(true);
    expect(groups.has("Physics")).toBe(true);
    expect(groups.has("Emitters")).toBe(true);
    expect(groups.has("Audio")).toBe(true);
    expect(groups.has("Post-FX")).toBe(true);
  });

  it("all mapped keys exist on the store state", () => {
    const state = store.getState();
    for (const [path, key] of Object.entries(pathToKey)) {
      expect(key in state, `${path} maps to missing key '${key}'`).toBe(true);
    }
  });
});
