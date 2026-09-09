/**
 * Second-order underdamped spring with its rest position at 0.
 *
 * Kick it with velocity impulses and step it once per frame. The position
 * rises sharply, overshoots by an amount set by the damping ratio, and settles
 * back to rest. This is the impulse response used to make a beat feel like a
 * hit rather than a fade.
 *
 * Stepping uses the closed-form solution of the oscillator, so the response is
 * identical at any frame rate and cannot blow up on a long stalled frame.
 */
export class DampedSpring {
  private position = 0;
  private velocity = 0;
  private readonly omega: number;
  private readonly zeta: number;
  private readonly dampedOmega: number;

  constructor(options: { frequencyHz: number; dampingRatio: number }) {
    if (options.dampingRatio <= 0 || options.dampingRatio >= 1) {
      throw new Error(`DampedSpring requires 0 < dampingRatio < 1, got ${options.dampingRatio}`);
    }
    this.omega = 2 * Math.PI * options.frequencyHz;
    this.zeta = options.dampingRatio;
    this.dampedOmega = this.omega * Math.sqrt(1 - this.zeta * this.zeta);
  }

  impulse(velocity: number): void {
    this.velocity += velocity;
  }

  /** Advance by `dt` seconds and return the new position. */
  step(dt: number): number {
    const decayRate = this.zeta * this.omega;
    const envelope = Math.exp(-decayRate * dt);
    const cos = Math.cos(this.dampedOmega * dt);
    const sin = Math.sin(this.dampedOmega * dt);
    const a = this.position;
    const b = (this.velocity + decayRate * this.position) / this.dampedOmega;

    this.position = envelope * (a * cos + b * sin);
    this.velocity = -decayRate * this.position + envelope * this.dampedOmega * (b * cos - a * sin);
    return this.position;
  }

  getPosition(): number {
    return this.position;
  }

  reset(): void {
    this.position = 0;
    this.velocity = 0;
  }
}
