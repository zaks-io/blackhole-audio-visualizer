import { describe, it, expect, beforeEach } from "vitest";
import {
  runtimeState,
  setRuntimeValue,
  setRuntimeValueByPath,
  syncFromStore,
} from "../runtimeStateRegistry";
import type { VisualizationControlsState } from "@/hooks/useVisualizationControls";
import { PARAM_DEFAULTS } from "@blackhole/backend/convex/lib/visualizationParameters";

// Reset runtime state between tests so they don't bleed into each other
beforeEach(() => {
  setRuntimeValue("gravity", PARAM_DEFAULTS.gravity);
  setRuntimeValue("amplitude", PARAM_DEFAULTS.amplitude);
  setRuntimeValue("eventHorizonRadius", PARAM_DEFAULTS.eventHorizonRadius);
  setRuntimeValue("emitRadius", PARAM_DEFAULTS.emitRadius);
  setRuntimeValue("bloomBaseIntensity", PARAM_DEFAULTS.bloomBaseIntensity);
});

describe("setRuntimeValue", () => {
  it("sets a known key to a new value", () => {
    setRuntimeValue("gravity", 12345);
    expect(runtimeState.gravity).toBe(12345);
  });

  it("sets another known key independently", () => {
    setRuntimeValue("amplitude", 9.9);
    expect(runtimeState.amplitude).toBe(9.9);
  });

  it("does not affect unrelated keys", () => {
    const before = runtimeState.emitRadius;
    setRuntimeValue("gravity", 99999);
    expect(runtimeState.emitRadius).toBe(before);
  });
});

describe("setRuntimeValueByPath", () => {
  it("returns true and sets value for a known path", () => {
    const result = setRuntimeValueByPath("Physics.gravity", 200000);
    expect(result).toBe(true);
    expect(runtimeState.gravity).toBe(200000);
  });

  it("returns false for an unknown path", () => {
    const result = setRuntimeValueByPath("NonExistent.fakeKey", 42);
    expect(result).toBe(false);
  });

  it("maps Black Hole paths correctly", () => {
    setRuntimeValueByPath("Black Hole.eventHorizonRadius", 12);
    expect(runtimeState.eventHorizonRadius).toBe(12);
  });

  it("maps Emitters paths correctly", () => {
    setRuntimeValueByPath("Emitters.emitRadius", 350);
    expect(runtimeState.emitRadius).toBe(350);
  });

  it("maps Post-FX paths correctly", () => {
    setRuntimeValueByPath("Post-FX.bloomBaseIntensity", 1.5);
    expect(runtimeState.bloomBaseIntensity).toBe(1.5);
  });

  it("returns false for an empty string path", () => {
    expect(setRuntimeValueByPath("", 0)).toBe(false);
  });
});

describe("syncFromStore", () => {
  function makePartialState(
    overrides: Partial<VisualizationControlsState>
  ): VisualizationControlsState {
    return {
      // Provide enough numeric fields to satisfy the type without importing the full store
      gravity: PARAM_DEFAULTS.gravity,
      amplitude: PARAM_DEFAULTS.amplitude,
      eventHorizonRadius: PARAM_DEFAULTS.eventHorizonRadius,
      emitRadius: PARAM_DEFAULTS.emitRadius,
      bloomBaseIntensity: PARAM_DEFAULTS.bloomBaseIntensity,
      // Non-numeric fields required by the interface
      colorPalette: "default",
      coronaEnabled: false,
      whiteBlackHole: false,
      showEmitters: false,
      skybox: "None",
      autoColorChange: true,
      bloomEnabled: true,
      chromaticEnabled: true,
      vignetteEnabled: true,
      invertColors: false,
      // Fill in remaining numeric fields with defaults
      iscoRatio: PARAM_DEFAULTS.iscoRatio,
      beatPulse: PARAM_DEFAULTS.beatPulse,
      blackHoleCount: PARAM_DEFAULTS.blackHoleCount,
      orbitRadius: PARAM_DEFAULTS.orbitRadius,
      orbitSpeed: PARAM_DEFAULTS.orbitSpeed,
      blackHoleMassMin: PARAM_DEFAULTS.blackHoleMassMin,
      blackHoleMassMax: PARAM_DEFAULTS.blackHoleMassMax,
      coronaIntensity: PARAM_DEFAULTS.coronaIntensity,
      coronaPower: PARAM_DEFAULTS.coronaPower,
      blackHoleOffsetY: PARAM_DEFAULTS.blackHoleOffsetY,
      textureSize: PARAM_DEFAULTS.textureSize,
      pointSize: PARAM_DEFAULTS.pointSize,
      brightness: PARAM_DEFAULTS.brightness,
      alpha: PARAM_DEFAULTS.alpha,
      maxDistance: PARAM_DEFAULTS.maxDistance,
      motionBlurScale: 0.5,
      motionBlurLength: 8.0,
      motionBlurTaper: PARAM_DEFAULTS.motionBlurTaper,
      motionBlurFade: PARAM_DEFAULTS.motionBlurFade,
      timeScale: PARAM_DEFAULTS.timeScale,
      softening: PARAM_DEFAULTS.softening,
      orbitDecay: PARAM_DEFAULTS.orbitDecay,
      iscoStrength: PARAM_DEFAULTS.iscoStrength,
      lifetimeGracePeriod: PARAM_DEFAULTS.lifetimeGracePeriod,
      lifetimeMax: PARAM_DEFAULTS.lifetimeMax,
      lifetimeGravityMultiplier: PARAM_DEFAULTS.lifetimeGravityMultiplier,
      emitterCount: PARAM_DEFAULTS.emitterCount,
      emitterAngle: PARAM_DEFAULTS.emitterAngle,
      emitterTilt: PARAM_DEFAULTS.emitterTilt,
      inwardAngle: PARAM_DEFAULTS.inwardAngle,
      spawnRate: PARAM_DEFAULTS.spawnRate,
      emitterSpread: PARAM_DEFAULTS.emitterSpread,
      emitterWidth: PARAM_DEFAULTS.emitterWidth,
      emissionShape: PARAM_DEFAULTS.emissionShape,
      emitterLineY: PARAM_DEFAULTS.emitterLineY,
      emitterLineWidth: PARAM_DEFAULTS.emitterLineWidth,
      starDensity: PARAM_DEFAULTS.starDensity,
      starBrightness: PARAM_DEFAULTS.starBrightness,
      onsetDecay: PARAM_DEFAULTS.onsetDecay,
      audioGain: PARAM_DEFAULTS.audioGain,
      beatRepulsion: PARAM_DEFAULTS.beatRepulsion,
      bloomAudioReactivity: PARAM_DEFAULTS.bloomAudioReactivity,
      chromaticAudioReactivity: PARAM_DEFAULTS.chromaticAudioReactivity,
      vignetteOffset: PARAM_DEFAULTS.vignetteOffset,
      vignetteDarkness: PARAM_DEFAULTS.vignetteDarkness,
      hfcVelocityBoost: PARAM_DEFAULTS.hfcVelocityBoost,
      spawnBurstMultiplier: PARAM_DEFAULTS.spawnBurstMultiplier,
      ...overrides,
    } as VisualizationControlsState;
  }

  it("full sync copies numeric values from store to runtime state", () => {
    const state = makePartialState({ gravity: 555555, amplitude: 7.7 });
    syncFromStore(state);
    expect(runtimeState.gravity).toBe(555555);
    expect(runtimeState.amplitude).toBe(7.7);
  });

  it("selective sync only updates specified keys", () => {
    const gravitySentinel = 888888;
    const amplitudeBefore = runtimeState.amplitude;
    const state = makePartialState({ gravity: gravitySentinel, amplitude: 99 });
    syncFromStore(state, new Set(["gravity"]));
    expect(runtimeState.gravity).toBe(gravitySentinel);
    // amplitude should not have changed
    expect(runtimeState.amplitude).toBe(amplitudeBefore);
  });

  it("selective sync with empty set changes nothing", () => {
    const gravitySentinel = runtimeState.gravity;
    const state = makePartialState({ gravity: 12345 });
    syncFromStore(state, new Set());
    expect(runtimeState.gravity).toBe(gravitySentinel);
  });

  it("non-numeric store values are ignored during sync", () => {
    // colorPalette is a string - syncing it should not throw or corrupt state
    const state = makePartialState({ colorPalette: "neon" });
    expect(() => syncFromStore(state)).not.toThrow();
  });
});
