"use client";

import { ControlSection } from "./ControlSection";
import { SliderControl } from "./SliderControl";
import { SelectControl } from "./SelectControl";
import { SwitchControl } from "./SwitchControl";
import { PALETTE_IDS } from "@/components/ColorModeSystem";
import { getParameterGroups } from "@/convex/lib/visualizationParameters";
import type { VisualizationControlsState } from "@/hooks/useVisualizationControls";

const SKYBOX_OPTIONS = [
  "None",
  "Procedural Stars",
  "Starmap",
  "Hazy Nebulae",
  "Blue Nebulae",
  "Multi Nebulae",
] as const;

// Get all parameters including system params (dev controls show everything)
const PARAMETER_GROUPS = getParameterGroups(true);

// Group IDs for ControlSection (lowercase, hyphenated)
const GROUP_IDS: Record<string, string> = {
  "Black Hole": "black-hole",
  Particles: "particles",
  Physics: "physics",
  Emitters: "emitters",
  Skybox: "skybox",
  Audio: "audio",
  "Post-FX": "post-fx",
};

// Special controls that aren't numeric sliders (switches, selects)
// These are rendered after the sliders in their respective groups
const SPECIAL_CONTROLS: Record<string, React.ReactNode> = {
  Particles: (
    <SelectControl controlKey="colorPalette" label="Color Palette" options={PALETTE_IDS} />
  ),
  Emitters: <SwitchControl controlKey="showEmitters" label="Show Emitters" />,
  Skybox: <SelectControl controlKey="skybox" label="Environment" options={SKYBOX_OPTIONS} />,
  Audio: <SwitchControl controlKey="autoColorChange" label="Auto Color Change" />,
};

// Post-FX has multiple switches interspersed with sliders, needs special handling
function PostFXSection() {
  const postFxGroup = PARAMETER_GROUPS.find((g) => g.name === "Post-FX");
  if (!postFxGroup) return null;

  const getSlider = (storeKey: string) => {
    const param = postFxGroup.parameters.find((p) => p.storeKey === storeKey);
    if (!param) return null;
    return (
      <SliderControl
        key={param.path}
        controlKey={param.storeKey as keyof VisualizationControlsState}
        label={param.label}
        min={param.min}
        max={param.max}
        step={param.step}
      />
    );
  };

  return (
    <ControlSection title="Post-FX" id="post-fx">
      <SwitchControl controlKey="bloomEnabled" label="Bloom" />
      {getSlider("bloomBaseIntensity")}
      {getSlider("bloomAudioReactivity")}
      <SwitchControl controlKey="chromaticEnabled" label="Chromatic Aberration" />
      {getSlider("chromaticAudioReactivity")}
      <SwitchControl controlKey="vignetteEnabled" label="Vignette" />
      {getSlider("vignetteOffset")}
      {getSlider("vignetteDarkness")}
      {getSlider("hfcVelocityBoost")}
      {getSlider("spawnBurstMultiplier")}
    </ControlSection>
  );
}

export function DeveloperControls() {
  return (
    <div className="space-y-1">
      {PARAMETER_GROUPS.filter((group) => group.name !== "Post-FX").map((group) => (
        <ControlSection
          key={group.name}
          title={group.name}
          id={GROUP_IDS[group.name] || group.name}
        >
          {group.parameters.map((param) => (
            <SliderControl
              key={param.path}
              controlKey={param.storeKey as keyof VisualizationControlsState}
              label={param.label}
              min={param.min}
              max={param.max}
              step={param.step}
            />
          ))}
          {SPECIAL_CONTROLS[group.name]}
        </ControlSection>
      ))}
      <PostFXSection />
    </div>
  );
}
