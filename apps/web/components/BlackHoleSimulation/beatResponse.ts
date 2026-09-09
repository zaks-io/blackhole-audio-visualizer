import { DampedSpring } from "@/lib/audio";
import type { AnalyzedAudio } from "@/hooks/useAudioAnalyzer";

export type BeatBand = "bass" | "mid" | "high";

const BANDS: readonly BeatBand[] = ["bass", "mid", "high"];

// Each black hole follows one instrument so they stop breathing in unison.
// Index 0 is the largest (kick), then snare, then hats. A fourth doubles the kick.
export const BAND_BY_BLACK_HOLE: readonly BeatBand[] = ["bass", "mid", "high", "bass"];

// Fast layer: an onset kicks the sphere like a drum head. ~4 Hz with 0.6 damping
// peaks ~45ms after the hit and settles within ~300ms with a small rebound.
const SPRING_FREQUENCY_HZ = 4;
const SPRING_DAMPING = 0.6;
// Velocity impulse per unit onset strength, sized so a full-strength hit at
// beatPulse=1 peaks near +40% radius.
const IMPULSE_GAIN = 20;
const HIT_MIN = -0.5;
const HIT_MAX = 1.0;

// Slow layer: the sphere swells with its band's energy so build-ups grow and
// quiet sections settle. Fast attack so drops land, slow release so it breathes.
const SWELL_ATTACK_S = 0.05;
const SWELL_RELEASE_S = 0.4;
// Radius gain at full band energy and beatPulse=1
const SWELL_GAIN = 0.25;

export type BeatAnalysis = Pick<AnalyzedAudio, "timestamp" | "onsets" | "energy">;

function bandEnergy(energy: AnalyzedAudio["energy"], band: BeatBand): number {
  switch (band) {
    case "bass":
      return (energy.subBass + energy.bass) / 2;
    case "mid":
      return (energy.lowMid + energy.mid) / 2;
    case "high":
      return (energy.highMid + energy.high) / 2;
  }
}

/**
 * Two-layer beat response per band: a damped spring hit by onsets on top of a
 * slow energy envelope. Black holes read their pulse by index.
 */
export class BeatResponse {
  private readonly springs: Record<BeatBand, DampedSpring> = {
    bass: new DampedSpring({ frequencyHz: SPRING_FREQUENCY_HZ, dampingRatio: SPRING_DAMPING }),
    mid: new DampedSpring({ frequencyHz: SPRING_FREQUENCY_HZ, dampingRatio: SPRING_DAMPING }),
    high: new DampedSpring({ frequencyHz: SPRING_FREQUENCY_HZ, dampingRatio: SPRING_DAMPING }),
  };
  private readonly hits: Record<BeatBand, number> = { bass: 0, mid: 0, high: 0 };
  private readonly envelopes: Record<BeatBand, number> = { bass: 0, mid: 0, high: 0 };
  private readonly swells: Record<BeatBand, number> = { bass: 0, mid: 0, high: 0 };
  private lastTimestamp = 0;

  /** Advance by `delta` seconds. Each analysis frame kicks the springs once. */
  update(analysis: BeatAnalysis, delta: number, beatPulse: number): void {
    const isNewFrame = analysis.timestamp !== this.lastTimestamp;
    this.lastTimestamp = analysis.timestamp;
    const attack = 1 - Math.exp(-delta / SWELL_ATTACK_S);
    const release = 1 - Math.exp(-delta / SWELL_RELEASE_S);

    for (const band of BANDS) {
      const onset = analysis.onsets[band];
      if (isNewFrame && onset > 0) {
        this.springs[band].impulse(onset * beatPulse * IMPULSE_GAIN);
      }
      this.hits[band] = Math.min(HIT_MAX, Math.max(HIT_MIN, this.springs[band].step(delta)));

      const target = bandEnergy(analysis.energy, band);
      const envelope = this.envelopes[band];
      this.envelopes[band] += (target - envelope) * (target > envelope ? attack : release);
      this.swells[band] = this.envelopes[band] * SWELL_GAIN * beatPulse;
    }
  }

  /** Radius multiplier for black hole `index`: energy swell under the onset hit. */
  sizePulse(index: number): number {
    const band = BAND_BY_BLACK_HOLE[index];
    return (1 + this.swells[band]) * (1 + this.hits[band]);
  }

  /** Mass multiplier for black hole `index`: only the hit moves gravity. */
  massPulse(index: number, beatMassPulse: number): number {
    return 1 + this.hits[BAND_BY_BLACK_HOLE[index]] * beatMassPulse;
  }

  reset(): void {
    for (const band of BANDS) {
      this.springs[band].reset();
      this.hits[band] = 0;
      this.envelopes[band] = 0;
      this.swells[band] = 0;
    }
    this.lastTimestamp = 0;
  }
}
