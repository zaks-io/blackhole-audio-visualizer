import { AutoNormalizer } from "./Smoother";

/**
 * Onset detector for a single energy signal.
 *
 * Detects the moment energy rises (half-wave rectified frame difference), not
 * the level, so a sustained note fires once at its attack instead of every
 * frame it stays loud. The flux is auto-normalized against the recent maximum
 * so a soft hit after a loud one reads as soft, then peak-picked against a
 * running mean of the normalized flux.
 *
 * `process` returns the normalized onset strength (0-1) on the frame the flux
 * crosses the threshold and 0 on every other frame.
 */
export class OnsetDetector {
  private prevEnergy = 0;
  private mean = 0;
  private above = false;
  private lastOnsetMs = -Infinity;
  private readonly normalizer: AutoNormalizer;
  private readonly meanAlpha: number;
  private readonly threshold: number;
  private readonly minIntervalMs: number;

  constructor(
    options: {
      /** EMA rate for the running mean of normalized flux (per frame). */
      meanAlpha?: number;
      /** Amount above the running mean the normalized flux must reach. */
      threshold?: number;
      /** Refractory period between onsets. */
      minIntervalMs?: number;
      /** Per-frame decay of the normalizer's recent maximum. */
      normalizerDecay?: number;
      /** Floor for the normalizer's maximum so silence does not read as loud. */
      normalizerFloor?: number;
    } = {}
  ) {
    this.meanAlpha = options.meanAlpha ?? 0.05;
    this.threshold = options.threshold ?? 0.2;
    this.minIntervalMs = options.minIntervalMs ?? 80;
    this.normalizer = new AutoNormalizer({
      decay: options.normalizerDecay ?? 0.998,
      minValue: options.normalizerFloor ?? 0.02,
    });
  }

  process(energy: number, timeMs: number): number {
    const flux = Math.max(0, energy - this.prevEnergy);
    this.prevEnergy = energy;

    const normalized = this.normalizer.normalize(flux);
    const isAbove = normalized > this.getThreshold();

    let strength = 0;
    if (isAbove && !this.above && timeMs - this.lastOnsetMs >= this.minIntervalMs) {
      this.lastOnsetMs = timeMs;
      strength = normalized;
    }

    this.above = isAbove;
    this.mean += (normalized - this.mean) * this.meanAlpha;
    return strength;
  }

  getMean(): number {
    return this.mean;
  }

  getThreshold(): number {
    return this.mean + this.threshold;
  }

  reset(): void {
    this.prevEnergy = 0;
    this.mean = 0;
    this.above = false;
    this.lastOnsetMs = -Infinity;
    this.normalizer.reset();
  }
}
