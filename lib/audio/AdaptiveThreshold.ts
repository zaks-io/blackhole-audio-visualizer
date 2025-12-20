/**
 * Adaptive peak detection using exponential moving average statistics.
 * Automatically adjusts thresholds based on the signal's local statistics,
 * eliminating the need for manual threshold tuning across different audio sources.
 */
export class AdaptiveThreshold {
  private mean: number = 0;
  private variance: number = 0;
  private alpha: number;
  private peakMultiplier: number;
  private lastPeakTime: number = 0;
  private minPeakDistance: number;

  constructor(
    options: {
      alpha?: number;
      peakMultiplier?: number;
      minPeakDistanceMs?: number;
    } = {}
  ) {
    this.alpha = options.alpha ?? 0.1;
    this.peakMultiplier = options.peakMultiplier ?? 1.5;
    this.minPeakDistance = options.minPeakDistanceMs ?? 50;
  }

  /**
   * Update the running statistics with a new value.
   */
  update(value: number): void {
    this.mean = this.alpha * value + (1 - this.alpha) * this.mean;
    const diff = value - this.mean;
    this.variance = this.alpha * diff * diff + (1 - this.alpha) * this.variance;
  }

  /**
   * Check if the value exceeds the adaptive threshold and respects minimum peak distance.
   */
  isPeak(value: number, currentTimeMs: number): boolean {
    const threshold = this.getThreshold();
    const exceedsThreshold = value > threshold;
    const respectsDistance = currentTimeMs - this.lastPeakTime >= this.minPeakDistance;

    if (exceedsThreshold && respectsDistance) {
      this.lastPeakTime = currentTimeMs;
      return true;
    }
    return false;
  }

  /**
   * Get the current adaptive threshold (mean + multiplier * stddev).
   */
  getThreshold(): number {
    return this.mean + this.peakMultiplier * Math.sqrt(this.variance);
  }

  getMean(): number {
    return this.mean;
  }

  getVariance(): number {
    return this.variance;
  }

  getStdDev(): number {
    return Math.sqrt(this.variance);
  }

  reset(): void {
    this.mean = 0;
    this.variance = 0;
    this.lastPeakTime = 0;
  }
}
