import type { ParameterGroup, EaseFunction } from "./types";

export const PRODUCER_PARAMETERS: ParameterGroup[] = [
  {
    name: "Physics",
    parameters: [
      {
        path: "Physics.gravity",
        label: "Black Hole Gravity",
        min: 1000,
        max: 1000000,
        step: 10000,
        formatValue: (v) => v.toLocaleString(),
      },
      {
        path: "Physics.orbitDecay",
        label: "Orbital Decay",
        min: 0,
        max: 20,
        step: 0.5,
      },
    ],
  },
  {
    name: "Emitters",
    parameters: [
      {
        path: "Emitters.emitterCount",
        label: "Emitter Count",
        min: 1,
        max: 36,
        step: 1,
      },
      {
        path: "Emitters.emitterSpread",
        label: "Emitter Spread",
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    name: "Audio",
    parameters: [
      {
        path: "Audio.amplitude",
        label: "Audio Amplitude",
        min: 0,
        max: 20,
        step: 0.5,
      },
      {
        path: "Audio.audioGain",
        label: "Audio Gain",
        min: 0,
        max: 3,
        step: 0.1,
      },
      {
        path: "Audio.beatRepulsion",
        label: "Beat Repulsion",
        min: 0,
        max: 100,
        step: 1,
      },
    ],
  },
];

export const EASE_OPTIONS: { value: EaseFunction; label: string; group: string }[] = [
  { value: "none", label: "Linear", group: "Linear" },
  { value: "power1.inOut", label: "Ease 1", group: "Smooth" },
  { value: "power2.inOut", label: "Ease 2", group: "Smooth" },
  { value: "power3.inOut", label: "Ease 3", group: "Smooth" },
  { value: "power4.inOut", label: "Ease 4", group: "Smooth" },
  { value: "power1.in", label: "In 1", group: "Ease In" },
  { value: "power2.in", label: "In 2", group: "Ease In" },
  { value: "power3.in", label: "In 3", group: "Ease In" },
  { value: "power1.out", label: "Out 1", group: "Ease Out" },
  { value: "power2.out", label: "Out 2", group: "Ease Out" },
  { value: "power3.out", label: "Out 3", group: "Ease Out" },
  { value: "back.inOut", label: "Back", group: "Special" },
  { value: "elastic.out", label: "Elastic", group: "Special" },
  { value: "bounce.out", label: "Bounce", group: "Special" },
];

export const DURATION_PRESETS = [1, 3, 5, 10, 15];

export const DEFAULT_DURATION = 5;
export const DEFAULT_EASE: EaseFunction = "power2.inOut";
