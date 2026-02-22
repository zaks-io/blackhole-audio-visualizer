/**
 * Value smoothing utilities for audio visualization.
 * Smoothing prevents jittery visuals while maintaining responsiveness.
 */

/**
 * Linear interpolation smoother.
 * Higher lerp factor = faster response, more jitter.
 * Lower lerp factor = slower response, smoother.
 * Recommended: 0.7-0.8 for beat-reactive visuals.
 */
export class Smoother {
  private value: number = 0;
  private lerpFactor: number;

  constructor(lerpFactor: number = 0.75) {
    this.lerpFactor = lerpFactor;
  }

  process(target: number): number {
    this.value = this.value + (target - this.value) * this.lerpFactor;
    return this.value;
  }

  setLerpFactor(factor: number): void {
    this.lerpFactor = factor;
  }

  getValue(): number {
    return this.value;
  }

  reset(value: number = 0): void {
    this.value = value;
  }
}

/**
 * Auto-normalizing scaler.
 * Tracks the recent maximum and normalizes values to 0-1 range.
 * Handles varying input levels automatically.
 */
export class AutoNormalizer {
  private recentMax: number;
  private decay: number;
  private minValue: number;

  constructor(options: { decay?: number; minValue?: number } = {}) {
    this.decay = options.decay ?? 0.995;
    this.minValue = options.minValue ?? 0.001;
    this.recentMax = this.minValue;
  }

  normalize(value: number): number {
    // Update max with decay
    this.recentMax = Math.max(value, this.recentMax * this.decay);
    // Ensure minimum to avoid division by near-zero
    const effectiveMax = Math.max(this.recentMax, this.minValue);
    return Math.min(1, value / effectiveMax);
  }

  getMax(): number {
    return this.recentMax;
  }

  setDecay(decay: number): void {
    this.decay = decay;
  }

  reset(): void {
    this.recentMax = this.minValue;
  }
}

/**
 * Multi-value smoother for smoothing multiple related values efficiently.
 */
export class MultiSmoother {
  private values: Float32Array;
  private lerpFactor: number;

  constructor(count: number, lerpFactor: number = 0.75) {
    this.values = new Float32Array(count);
    this.lerpFactor = lerpFactor;
  }

  process(targets: Float32Array | number[]): Float32Array {
    for (let i = 0; i < this.values.length && i < targets.length; i++) {
      this.values[i] = this.values[i] + (targets[i] - this.values[i]) * this.lerpFactor;
    }
    return this.values;
  }

  setLerpFactor(factor: number): void {
    this.lerpFactor = factor;
  }

  getValues(): Float32Array {
    return this.values;
  }

  reset(): void {
    this.values.fill(0);
  }
}
