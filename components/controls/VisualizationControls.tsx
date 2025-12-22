"use client";

import { ControlSection } from "./ControlSection";
import { SliderControl } from "./SliderControl";
import { SelectControl } from "./SelectControl";
import { SwitchControl } from "./SwitchControl";
import { PALETTE_IDS } from "@/components/ColorModeSystem";

const SKYBOX_OPTIONS = [
  "None",
  "Procedural Stars",
  "Starmap",
  "Hazy Nebulae",
  "Blue Nebulae",
  "Multi Nebulae",
] as const;

export function VisualizationControls() {
  return (
    <div className="space-y-1">
      <ControlSection title="Black Hole" id="black-hole">
        <SliderControl controlKey="blackHoleCount" label="Count" min={1} max={4} step={1} />
        <SliderControl controlKey="orbitRadius" label="Orbit Radius" min={5} max={50} step={1} />
        <SliderControl controlKey="orbitSpeed" label="Orbit Speed" min={0} max={2} step={0.1} />
        <SliderControl
          controlKey="blackHoleMassMin"
          label="Mass Min"
          min={0.1}
          max={1.0}
          step={0.1}
        />
        <SliderControl
          controlKey="blackHoleMassMax"
          label="Mass Max"
          min={0.1}
          max={1.0}
          step={0.1}
        />
        <SliderControl
          controlKey="eventHorizonRadius"
          label="Event Horizon"
          min={0.5}
          max={20}
          step={0.5}
        />
        <SliderControl controlKey="iscoRatio" label="ISCO Ratio" min={2.0} max={20.0} step={1.0} />
        <SliderControl controlKey="beatPulse" label="Beat Pulse" min={0} max={2} step={0.1} />
      </ControlSection>

      <ControlSection title="Particles" id="particles">
        <SliderControl
          controlKey="textureSize"
          label="Resolution"
          min={128}
          max={1024}
          step={128}
        />
        <SliderControl controlKey="pointSize" label="Point Size" min={0.1} max={20} step={0.1} />
        <SliderControl controlKey="brightness" label="Brightness" min={0.1} max={5} step={0.1} />
        <SliderControl controlKey="alpha" label="Opacity" min={0.01} max={1.0} step={0.01} />
        <SliderControl controlKey="maxDistance" label="Max Distance" min={5} max={150} step={1} />
        <SelectControl controlKey="colorPalette" label="Color Palette" options={PALETTE_IDS} />
        <SliderControl
          controlKey="motionBlurTaper"
          label="Motion Blur Taper"
          min={0}
          max={1}
          step={0.05}
        />
        <SliderControl
          controlKey="motionBlurFade"
          label="Motion Blur Fade"
          min={0}
          max={2}
          step={0.1}
        />
      </ControlSection>

      <ControlSection title="Physics" id="physics">
        <SliderControl controlKey="gravity" label="Gravity" min={1000} max={1000000} step={10000} />
        <SliderControl controlKey="timeScale" label="Time Scale" min={0.1} max={30} step={0.1} />
        <SliderControl controlKey="softening" label="Softening" min={0.01} max={10} step={0.1} />
        <SliderControl controlKey="orbitDecay" label="Orbit Decay" min={0} max={20.0} step={0.5} />
        <SliderControl
          controlKey="iscoStrength"
          label="ISCO Strength"
          min={0}
          max={1.0}
          step={0.05}
        />
        <SliderControl
          controlKey="lifetimeGracePeriod"
          label="Lifetime Grace"
          min={5}
          max={60}
          step={5}
        />
        <SliderControl controlKey="lifetimeMax" label="Lifetime Max" min={30} max={120} step={5} />
        <SliderControl
          controlKey="lifetimeGravityMultiplier"
          label="Gravity Boost"
          min={1.0}
          max={10.0}
          step={0.5}
        />
      </ControlSection>

      <ControlSection title="Emitters" id="emitters">
        <SliderControl controlKey="emitRadius" label="Emit Radius" min={5} max={200} step={1} />
        <SliderControl controlKey="emitterCount" label="Count" min={1} max={36} step={1} />
        <SliderControl controlKey="emitterAngle" label="Angle" min={0} max={6.28} step={0.1} />
        <SliderControl controlKey="emitterTilt" label="Tilt" min={-30} max={30} step={1} />
        <SliderControl controlKey="inwardAngle" label="Inward Angle" min={-1} max={1} step={0.01} />
        <SliderControl
          controlKey="spawnRate"
          label="Particles/Sec"
          min={1000}
          max={100000}
          step={1000}
        />
        <SliderControl controlKey="emitterSpread" label="Spread" min={0} max={1.0} step={0.01} />
        <SwitchControl controlKey="showEmitters" label="Show Emitters" />
      </ControlSection>

      <ControlSection title="Skybox" id="skybox">
        <SelectControl controlKey="skybox" label="Environment" options={SKYBOX_OPTIONS} />
        <SliderControl
          controlKey="starDensity"
          label="Star Density"
          min={5000}
          max={50000}
          step={5000}
        />
        <SliderControl
          controlKey="starBrightness"
          label="Star Brightness"
          min={0.1}
          max={3.0}
          step={0.1}
        />
      </ControlSection>

      <ControlSection title="Audio" id="audio">
        <SliderControl controlKey="amplitude" label="Amplitude" min={0} max={20} step={0.5} />
        <SliderControl controlKey="onsetDecay" label="Onset Decay" min={0.8} max={1} step={0.01} />
        <SliderControl controlKey="audioGain" label="Gain" min={0} max={3} step={0.1} />
        <SliderControl
          controlKey="beatRepulsion"
          label="Beat Repulsion"
          min={0}
          max={100}
          step={1}
        />
        <SwitchControl controlKey="autoColorChange" label="Auto Color Change" />
      </ControlSection>

      <ControlSection title="Post-FX" id="post-fx">
        <SwitchControl controlKey="bloomEnabled" label="Bloom" />
        <SliderControl
          controlKey="bloomBaseIntensity"
          label="Bloom Base"
          min={0}
          max={2}
          step={0.1}
        />
        <SliderControl
          controlKey="bloomAudioReactivity"
          label="Bloom Reactivity"
          min={0}
          max={1}
          step={0.1}
        />
        <SwitchControl controlKey="chromaticEnabled" label="Chromatic Aberration" />
        <SliderControl
          controlKey="chromaticAudioReactivity"
          label="Chromatic Reactivity"
          min={0}
          max={1}
          step={0.1}
        />
        <SwitchControl controlKey="vignetteEnabled" label="Vignette" />
        <SliderControl
          controlKey="vignetteOffset"
          label="Vignette Offset"
          min={0}
          max={1}
          step={0.01}
        />
        <SliderControl
          controlKey="vignetteDarkness"
          label="Vignette Darkness"
          min={0}
          max={1}
          step={0.01}
        />
        <SliderControl
          controlKey="hfcVelocityBoost"
          label="HFC Velocity Boost"
          min={0}
          max={1}
          step={0.05}
        />
        <SliderControl
          controlKey="spawnBurstMultiplier"
          label="Bass Spawn Burst"
          min={1}
          max={4}
          step={0.1}
        />
      </ControlSection>
    </div>
  );
}
