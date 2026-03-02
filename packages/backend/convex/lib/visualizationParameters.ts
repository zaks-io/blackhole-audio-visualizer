import { z } from "zod";

/**
 * Single source of truth for ALL visualization parameters.
 * - system: false = user/preset controls (LLM can set these)
 * - system: true = dev-only controls (bloom, vignette, etc.)
 */

// =============================================================================
// COLOR PALETTES
// =============================================================================

export const COLOR_PALETTES = [
  "default",
  "cool",
  "warm",
  "neon",
  "sunset",
  "ocean",
  "grayscale",
  "nebula-dreams",
  "aurora-borealis",
  "cosmic-twilight",
  "solar-flare",
  "lunar-eclipse",
  "galactic-core",
  "starfield",
  "synthwave-horizon",
  "vaporwave",
  "cyberpunk-city",
  "miami-vice",
  "retrowave-outrun",
  "electric-arcade",
  "deep-ocean",
  "bioluminescence",
  "volcanic-ember",
  "autumn-forest",
  "arctic-aurora",
  "tropical-reef",
  "forest-mist",
  "desert-dusk",
  "cotton-candy",
  "pastel-dreams",
  "lavender-haze",
  "rose-gold",
  "bubblegum-pop",
  "midnight-blue",
  "crimson-noir",
  "emerald-depths",
  "amber-glow",
] as const;

export type ColorPaletteId = (typeof COLOR_PALETTES)[number];
export const colorPaletteSchema = z.enum(COLOR_PALETTES);

// =============================================================================
// CAMERA MODES
// =============================================================================

export const CAMERA_MODES = ["circle", "closeup", "orbit", "edge"] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];
export const cameraModeSchema = z.enum(CAMERA_MODES);

// =============================================================================
// EASE FUNCTIONS
// =============================================================================

export const EASE_FUNCTIONS = [
  "none",
  "power1.inOut",
  "power2.inOut",
  "power3.inOut",
  "power4.inOut",
] as const;
export type EaseFunction = (typeof EASE_FUNCTIONS)[number];
export const easeSchema = z.enum(EASE_FUNCTIONS);

// =============================================================================
// VISUALIZATION PARAMETERS
// =============================================================================

export interface ParameterDef {
  min: number;
  max: number;
  default: number;
  step: number;
  description: string;
  group: string;
  label: string;
  system: boolean; // true = dev-only, false = user/preset (LLM can set)
}

// ALL visualization parameters - single source of truth
export const PARAMS: Record<string, ParameterDef> = {
  // ===========================================================================
  // BLACK HOLE
  // ===========================================================================
  "Black Hole.blackHoleCount": {
    min: 1,
    max: 4,
    default: 3,
    step: 1,
    description: "number of black holes",
    group: "Black Hole",
    label: "Count",
    system: false,
  },
  "Black Hole.orbitRadius": {
    min: 25,
    max: 100,
    default: 100,
    step: 5,
    description: "distance of black hole orbits from center",
    group: "Black Hole",
    label: "Orbit Radius",
    system: false,
  },
  "Black Hole.orbitSpeed": {
    min: 0,
    max: 2,
    default: 0.3,
    step: 0.1,
    description: "orbital velocity",
    group: "Black Hole",
    label: "Orbit Speed",
    system: true,
  },
  "Black Hole.blackHoleMassMin": {
    min: 0.3,
    max: 1,
    default: 0.3,
    step: 0.1,
    description: "minimum mass ratio for size variation",
    group: "Black Hole",
    label: "Mass Asymmetry",
    system: false,
  },
  "Black Hole.blackHoleMassMax": {
    min: 0.1,
    max: 5,
    default: 1,
    step: 0.1,
    description: "maximum mass ratio",
    group: "Black Hole",
    label: "Mass Max",
    system: true,
  },
  "Black Hole.eventHorizonRadius": {
    min: 2,
    max: 20,
    default: 5,
    step: 0.5,
    description: "base sphere size (derived from mass)",
    group: "Black Hole",
    label: "Event Horizon",
    system: true,
  },
  "Black Hole.iscoRatio": {
    min: 2,
    max: 20,
    default: 3,
    step: 1,
    description: "innermost stable circular orbit ratio",
    group: "Black Hole",
    label: "ISCO Ratio",
    system: true,
  },
  "Black Hole.beatPulse": {
    min: 0,
    max: 5,
    default: 1,
    step: 0.1,
    description: "beat-reactive pulse intensity",
    group: "Black Hole",
    label: "Beat Pulse",
    system: true,
  },
  "Black Hole.coronaIntensity": {
    min: 0,
    max: 0.5,
    default: 0.02,
    step: 0.01,
    description: "corona glow brightness",
    group: "Black Hole",
    label: "Corona Intensity",
    system: true,
  },
  "Black Hole.coronaPower": {
    min: 0.5,
    max: 6,
    default: 1,
    step: 0.1,
    description: "corona edge falloff sharpness",
    group: "Black Hole",
    label: "Corona Power",
    system: true,
  },
  "Black Hole.blackHoleOffsetY": {
    min: -200,
    max: 200,
    default: 0,
    step: 1,
    description: "vertical offset for all black holes",
    group: "Black Hole",
    label: "Offset Y",
    system: false,
  },
  "Black Hole.whiteBlackHole": {
    min: 0,
    max: 1,
    default: 0,
    step: 1,
    description: "white (1) or black (0) hole color",
    group: "Black Hole",
    label: "White Black Hole",
    system: false,
  },

  // ===========================================================================
  // PARTICLES
  // ===========================================================================
  "Particles.textureSize": {
    min: 128,
    max: 1024,
    default: 256,
    step: 128,
    description: "number of particles",
    group: "Particles",
    label: "Count",
    system: true,
  },
  "Particles.pointSize": {
    min: 1,
    max: 3,
    default: 1,
    step: 0.5,
    description: "particle size",
    group: "Particles",
    label: "Point Size",
    system: false,
  },
  "Particles.brightness": {
    min: 0.1,
    max: 5,
    default: 1.5,
    step: 0.1,
    description: "particle brightness",
    group: "Particles",
    label: "Brightness",
    system: true,
  },
  "Particles.alpha": {
    min: 0.1,
    max: 1,
    default: 0.8,
    step: 0.1,
    description: "particle opacity",
    group: "Particles",
    label: "Opacity",
    system: true,
  },
  "Particles.maxDistance": {
    min: 5,
    max: 150,
    default: 60,
    step: 1,
    description: "maximum visible distance",
    group: "Particles",
    label: "Max Distance",
    system: true,
  },
  "Particles.motionBlurTaper": {
    min: 0,
    max: 1,
    default: 0.2,
    step: 0.05,
    description: "motion blur trail taper",
    group: "Particles",
    label: "Motion Blur Taper",
    system: true,
  },
  "Particles.motionBlurFade": {
    min: 0,
    max: 2,
    default: 0.5,
    step: 0.1,
    description: "motion blur fade rate",
    group: "Particles",
    label: "Motion Blur Fade",
    system: true,
  },
  "Particles.particleLensingStrength": {
    min: 0,
    max: 5,
    default: 0,
    step: 0.1,
    description: "gravitational lensing distortion on particles",
    group: "Particles",
    label: "Particle Lensing",
    system: true,
  },
  "Particles.denseGuardEnterFps": {
    min: 20,
    max: 60,
    default: 48,
    step: 1,
    description: "fps threshold to enable dense-cluster guard",
    group: "Particles",
    label: "Dense Guard Enter FPS",
    system: true,
  },
  "Particles.denseGuardExitFps": {
    min: 20,
    max: 80,
    default: 54,
    step: 1,
    description: "fps threshold to disable dense-cluster guard",
    group: "Particles",
    label: "Dense Guard Exit FPS",
    system: true,
  },
  "Particles.denseGuardEnterFrames": {
    min: 1,
    max: 120,
    default: 10,
    step: 1,
    description: "consecutive low-fps frames required to enter guard",
    group: "Particles",
    label: "Dense Guard Enter Frames",
    system: true,
  },
  "Particles.denseGuardExitFrames": {
    min: 1,
    max: 240,
    default: 30,
    step: 1,
    description: "consecutive recovered frames required to exit guard",
    group: "Particles",
    label: "Dense Guard Exit Frames",
    system: true,
  },
  "Particles.denseGuardStrength": {
    min: 0,
    max: 2,
    default: 0.45,
    step: 0.05,
    description: "overall strength multiplier for dense-cluster mitigation",
    group: "Particles",
    label: "Dense Guard Strength",
    system: true,
  },
  "Particles.denseCenterBias": {
    min: 0,
    max: 1,
    default: 0.08,
    step: 0.05,
    description: "extra dense-zone sensitivity near screen center",
    group: "Particles",
    label: "Dense Center Bias",
    system: true,
  },
  "Particles.densityScale": {
    min: 1,
    max: 20,
    default: 2.5,
    step: 0.5,
    description: "screen-density texture scale factor",
    group: "Particles",
    label: "Density Scale",
    system: true,
  },

  // ===========================================================================
  // PHYSICS
  // ===========================================================================
  "Physics.gravity": {
    min: 10000,
    max: 1000000,
    default: 100000,
    step: 10000,
    description: "inward pull strength affects particle speed",
    group: "Physics",
    label: "Gravity",
    system: false,
  },
  "Physics.timeScale": {
    min: 0.1,
    max: 30,
    default: 5,
    step: 0.1,
    description: "simulation speed",
    group: "Physics",
    label: "Time Scale",
    system: true,
  },
  "Physics.softening": {
    min: 0,
    max: 10,
    default: 0,
    step: 0.1,
    description: "smooths extreme forces near horizons",
    group: "Physics",
    label: "Softening",
    system: true,
  },
  "Physics.orbitDecay": {
    min: 0.3,
    max: 20,
    default: 0.3,
    step: 0.1,
    description: "spiral-in rate: 0=stable, high=fast collapse",
    group: "Physics",
    label: "Orbital Decay",
    system: false,
  },
  "Physics.iscoStrength": {
    min: 0,
    max: 1,
    default: 0.5,
    step: 0.05,
    description: "ISCO boundary strength",
    group: "Physics",
    label: "ISCO Strength",
    system: true,
  },
  "Physics.lifetimeGracePeriod": {
    min: 0,
    max: 120,
    default: 0,
    step: 5,
    description: "initial lifetime grace period",
    group: "Physics",
    label: "Lifetime Grace",
    system: true,
  },
  "Physics.lifetimeMax": {
    min: 5,
    max: 120,
    default: 120,
    step: 5,
    description: "maximum particle lifetime",
    group: "Physics",
    label: "Lifetime Max",
    system: true,
  },
  "Physics.lifetimeGravityMultiplier": {
    min: 1,
    max: 100,
    default: 100,
    step: 0.5,
    description: "gravity boost for aging particles",
    group: "Physics",
    label: "Gravity Boost",
    system: true,
  },
  "Physics.frameDragging": {
    min: 0,
    max: 5,
    default: 5,
    step: 0.1,
    description: "frame dragging strength (Lense-Thirring effect)",
    group: "Physics",
    label: "Frame Dragging",
    system: true,
  },

  // ===========================================================================
  // EMITTERS
  // ===========================================================================
  "Emitters.emitRadius": {
    min: 100,
    max: 200,
    default: 200,
    step: 1,
    description: "spawn distance from center / line half-height",
    group: "Emitters",
    label: "Emit Radius",
    system: false,
  },
  "Emitters.emitterCount": {
    min: 1,
    max: 32,
    default: 12,
    step: 1,
    description: "particle sources",
    group: "Emitters",
    label: "Count",
    system: false,
  },
  "Emitters.emitterAngle": {
    min: 0,
    max: 360,
    default: 0,
    step: 1,
    description: "emitter rotation in XZ plane (degrees)",
    group: "Emitters",
    label: "Angle",
    system: true,
  },
  "Emitters.emitterTilt": {
    min: 0,
    max: 90,
    default: 0,
    step: 1,
    description: "tilt: 0=flat, 90=vertical",
    group: "Emitters",
    label: "Tilt",
    system: false,
  },
  "Emitters.inwardAngle": {
    min: -1,
    max: 1,
    default: 0,
    step: 0.01,
    description: "initial particle direction",
    group: "Emitters",
    label: "Inward Angle",
    system: true,
  },
  "Emitters.spawnRate": {
    min: 500,
    max: 10000,
    default: 2000,
    step: 500,
    description: "particles per second",
    group: "Emitters",
    label: "Particles/Sec",
    system: true,
  },
  "Emitters.emitterSpread": {
    min: 0.1,
    max: 1,
    default: 0.1,
    step: 0.1,
    description: "width: 0=clean lines, higher=wider spread",
    group: "Emitters",
    label: "Spread",
    system: false,
  },
  "Emitters.emissionShape": {
    min: 0,
    max: 1,
    default: 0,
    step: 1,
    description: "emission shape: 0=circle, 1=line",
    group: "Emitters",
    label: "Shape",
    system: false,
  },
  "Emitters.emitterLineY": {
    min: -200,
    max: 200,
    default: 0,
    step: 1,
    description: "Y position of line emitter",
    group: "Emitters",
    label: "Line Y",
    system: false,
  },
  "Emitters.emitterLineWidth": {
    min: 10,
    max: 500,
    default: 200,
    step: 10,
    description: "half-width of line emitter",
    group: "Emitters",
    label: "Line Width",
    system: false,
  },

  // ===========================================================================
  // SKYBOX
  // ===========================================================================
  "Skybox.starDensity": {
    min: 1000,
    max: 50000,
    default: 5000,
    step: 5000,
    description: "number of background stars",
    group: "Skybox",
    label: "Star Density",
    system: true,
  },
  "Skybox.starBrightness": {
    min: 0.1,
    max: 3,
    default: 0.2,
    step: 0.1,
    description: "star brightness",
    group: "Skybox",
    label: "Star Brightness",
    system: true,
  },
  "Skybox.starLensingStrength": {
    min: 0,
    max: 1,
    default: 0.5,
    step: 0.05,
    description: "gravitational lensing strength on stars",
    group: "Skybox",
    label: "Gravitational Lensing",
    system: true,
  },

  // ===========================================================================
  // AUDIO
  // ===========================================================================
  "Audio.amplitude": {
    min: 0,
    max: 10,
    default: 5,
    step: 0.5,
    description: "wave emission height",
    group: "Audio",
    label: "Amplitude",
    system: false,
  },
  "Audio.onsetDecay": {
    min: 0.8,
    max: 1,
    default: 0.99,
    step: 0.01,
    description: "onset detection decay",
    group: "Audio",
    label: "Onset Decay",
    system: true,
  },
  "Audio.audioGain": {
    min: 0,
    max: 3,
    default: 2,
    step: 0.1,
    description: "input amplification",
    group: "Audio",
    label: "Gain",
    system: true,
  },
  "Audio.beatRepulsion": {
    min: 0,
    max: 100,
    default: 1,
    step: 1,
    description: "beat push force from center",
    group: "Audio",
    label: "Beat Repulsion",
    system: true,
  },

  // ===========================================================================
  // POST-FX
  // ===========================================================================
  "Post-FX.bloomBaseIntensity": {
    min: 0,
    max: 2,
    default: 0.1,
    step: 0.1,
    description: "bloom base intensity",
    group: "Post-FX",
    label: "Bloom Base",
    system: true,
  },
  "Post-FX.bloomAudioReactivity": {
    min: 0,
    max: 1,
    default: 0.8,
    step: 0.1,
    description: "bloom audio reactivity",
    group: "Post-FX",
    label: "Bloom Reactivity",
    system: true,
  },
  "Post-FX.chromaticAudioReactivity": {
    min: 0,
    max: 1,
    default: 0.2,
    step: 0.1,
    description: "chromatic aberration reactivity",
    group: "Post-FX",
    label: "Chromatic Reactivity",
    system: true,
  },
  "Post-FX.vignetteOffset": {
    min: 0,
    max: 1,
    default: 0.5,
    step: 0.01,
    description: "vignette offset",
    group: "Post-FX",
    label: "Vignette Offset",
    system: true,
  },
  "Post-FX.vignetteDarkness": {
    min: 0,
    max: 1,
    default: 0.5,
    step: 0.01,
    description: "vignette darkness",
    group: "Post-FX",
    label: "Vignette Darkness",
    system: true,
  },
  "Post-FX.hfcVelocityBoost": {
    min: 0,
    max: 1,
    default: 0.2,
    step: 0.05,
    description: "high frequency content velocity boost",
    group: "Post-FX",
    label: "HFC Velocity Boost",
    system: true,
  },
  "Post-FX.spawnBurstMultiplier": {
    min: 1,
    max: 20,
    default: 15,
    step: 0.1,
    description: "bass spawn burst multiplier",
    group: "Post-FX",
    label: "Bass Spawn Burst",
    system: true,
  },
};

export type ParameterPath = keyof typeof PARAMS;

// =============================================================================
// GENERATED SCHEMAS (derived from PARAMS - no duplication)
// =============================================================================

// LLM schema - only non-system params (system: false)
const userParams = Object.entries(PARAMS).filter(([, p]) => !p.system);

export const presetParametersSchema = z.object(
  Object.fromEntries(
    userParams.map(([key, p]) => [
      key,
      z.number().min(p.min).max(p.max).default(p.default).describe(p.description),
    ])
  ) as Record<string, z.ZodDefault<z.ZodNumber>>
);

export type PresetParameters = z.infer<typeof presetParametersSchema>;

// Full preset schema for LLM generation
export const presetSchema = z.object({
  name: z.string().describe("descriptive name for this preset"),
  startTimeMs: z.number().describe("start time in milliseconds"),
  endTimeMs: z.number().describe("end time in milliseconds"),
  sectionName: z.string().describe("song section this preset belongs to"),
  colorPalette: colorPaletteSchema.describe("color palette to use"),
  parameters: presetParametersSchema,
  duration: z.number().min(0).max(30).default(3).describe("tween duration in seconds"),
  ease: easeSchema.default("power2.inOut").describe("easing function for transitions"),
  cameraMode: cameraModeSchema.describe(
    "camera movement style around barycenter, close works best with small blackhole hole orbits"
  ),
});

export type Preset = z.infer<typeof presetSchema>;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

// Convert flat parameters object to array format for storage
export function parametersToArray(
  params: PresetParameters,
  duration: number,
  ease: string
): Array<{ path: string; value: number; duration: number; ease: string }> {
  return Object.entries(params).map(([path, value]) => ({
    path,
    value,
    duration,
    ease,
  }));
}

export interface ParameterInfo {
  path: string;
  storeKey: string;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
  default: number;
}

export interface ParameterGroup {
  name: string;
  parameters: ParameterInfo[];
}

// Get parameters grouped for UI display
export function getParameterGroups(includeSystem = false): ParameterGroup[] {
  const groups = new Map<string, ParameterInfo[]>();

  for (const [path, param] of Object.entries(PARAMS)) {
    // Filter by system flag
    if (!includeSystem && param.system) continue;

    // Extract store key from path (e.g., "Black Hole.eventHorizonRadius" -> "eventHorizonRadius")
    const storeKey = path.split(".")[1];

    const groupParams = groups.get(param.group) || [];
    groupParams.push({
      path,
      storeKey,
      label: param.label,
      description: param.description,
      min: param.min,
      max: param.max,
      step: param.step,
      default: param.default,
    });
    groups.set(param.group, groupParams);
  }

  return Array.from(groups.entries()).map(([name, parameters]) => ({
    name,
    parameters,
  }));
}

// Get a single parameter definition
export function getParam(path: string): ParameterDef | undefined {
  return PARAMS[path];
}

// Get default values keyed by store key (e.g., "eventHorizonRadius" -> 5)
// Used to initialize Zustand store and runtime state from PARAMS
export function getDefaultsByStoreKey(): Record<string, number> {
  const defaults: Record<string, number> = {};
  for (const [path, param] of Object.entries(PARAMS)) {
    const storeKey = path.split(".")[1];
    defaults[storeKey] = param.default;
  }
  return defaults;
}

// Pre-computed defaults for performance
export const PARAM_DEFAULTS = getDefaultsByStoreKey();
