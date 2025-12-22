/**
 * Envelope follower with separate attack and release characteristics.
 * Attack determines how quickly the envelope responds to increases.
 * Release determines how slowly the envelope decays after peaks.
 */
export class EnvelopeFollower {
  private envelope: number = 0;
  private attackCoef: number;
  private releaseCoef: number;

  constructor(
    options: {
      attackMs?: number;
      releaseMs?: number;
      sampleRate?: number;
    } = {}
  ) {
    const attackMs = options.attackMs ?? 0.1;
    const releaseMs = options.releaseMs ?? 50;
    const sampleRate = options.sampleRate ?? 48000;

    // Convert time constants to coefficients
    // coefficient = exp(-1 / (time_in_seconds * sample_rate))
    // For frame-based processing (not sample-based), we use frames per second
    const framesPerSecond = sampleRate / 512; // Assuming 512 sample frames
    this.attackCoef = Math.exp(-1 / ((attackMs / 1000) * framesPerSecond));
    this.releaseCoef = Math.exp(-1 / ((releaseMs / 1000) * framesPerSecond));
  }

  /**
   * Process a new input value and return the envelope.
   */
  process(input: number): number {
    const absInput = Math.abs(input);
    if (absInput > this.envelope) {
      // Attack: fast response to increases
      this.envelope = this.attackCoef * this.envelope + (1 - this.attackCoef) * absInput;
    } else {
      // Release: slow decay
      this.envelope = this.releaseCoef * this.envelope + (1 - this.releaseCoef) * absInput;
    }
    return this.envelope;
  }

  getValue(): number {
    return this.envelope;
  }

  reset(): void {
    this.envelope = 0;
  }
}

/**
 * Simple envelope follower with a single decay rate.
 * Used for per-band onset detection where we want instant attack and configurable decay.
 */
export class SimpleEnvelope {
  private value: number = 0;
  private decay: number;

  constructor(decay: number = 0.92) {
    this.decay = decay;
  }

  /**
   * Update with new input. Takes max of input and decayed previous value.
   */
  process(input: number): number {
    const clampedInput = Math.min(input, 1.0);
    this.value = Math.max(clampedInput, this.value * this.decay);
    return this.value;
  }

  setDecay(decay: number): void {
    this.decay = decay;
  }

  getValue(): number {
    return this.value;
  }

  reset(): void {
    this.value = 0;
  }
}
