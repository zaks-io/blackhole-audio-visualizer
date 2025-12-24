import type { ParameterGroup, EaseFunction } from "./types";
import { getParameterGroups } from "@/convex/lib/visualizationParameters";

// UI parameter groups derived from centralized visualization parameter definitions
export const PRODUCER_PARAMETERS: ParameterGroup[] = getParameterGroups();

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

export const DEFAULT_DURATION = 3;
export const DEFAULT_EASE: EaseFunction = "power2.inOut";
