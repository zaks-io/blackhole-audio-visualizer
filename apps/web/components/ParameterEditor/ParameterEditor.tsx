"use client";

import { useState, useMemo } from "react";
import { getParameterGroups } from "@blackhole/backend/convex/lib/visualizationParameters";
import { PALETTE_IDS } from "@/components/ColorModeSystem";
import { SelectControl } from "@/components/controls/SelectControl";
import { SwitchControl } from "@/components/controls/SwitchControl";
import { useProducerMode } from "@/components/ProducerMode/useProducerMode";
import { cn } from "@/lib/utils";
import { GlobalControls } from "./GlobalControls";
import { ParameterSearch } from "./ParameterSearch";
import { ParameterGroup } from "./ParameterGroup";
import { ParameterSlider } from "./ParameterSlider";
import { useParameterFilter } from "./useParameterFilter";
import type { ParameterEditorProps } from "./types";
import type { EaseFunction } from "@/components/ProducerMode/types";

const SKYBOX_OPTIONS = [
  "None",
  "Procedural Stars",
  "Starmap",
  "Hazy Nebulae",
  "Blue Nebulae",
  "Multi Nebulae",
] as const;

const GROUP_IDS: Record<string, string> = {
  "Black Hole": "black-hole",
  Particles: "particles",
  Physics: "physics",
  Emitters: "emitters",
  Skybox: "skybox",
  Audio: "audio",
  "Post-FX": "post-fx",
};

const SPECIAL_CONTROLS: Record<string, React.ReactNode> = {
  "Black Hole": (
    <>
      <SwitchControl controlKey="coronaEnabled" label="Corona Glow" />
      <SwitchControl controlKey="whiteBlackHole" label="White Black Hole" />
    </>
  ),
  Particles: (
    <SelectControl controlKey="colorPalette" label="Color Palette" options={PALETTE_IDS} />
  ),
  Emitters: <SwitchControl controlKey="showEmitters" label="Show Emitters" />,
  Skybox: (
    <>
      <SelectControl controlKey="skybox" label="Environment" options={SKYBOX_OPTIONS} />
      <SwitchControl controlKey="starLensingEnabled" label="Star Lensing" />
    </>
  ),
  Audio: <SwitchControl controlKey="autoColorChange" label="Auto Color Change" />,
};

function PostFXControls({ mode, duration }: { mode: "dev" | "preset"; duration: number }) {
  const groups = useMemo(() => getParameterGroups(true), []);
  const postFxGroup = groups.find((g) => g.name === "Post-FX");
  if (!postFxGroup) return null;

  const getSlider = (storeKey: string) => {
    const param = postFxGroup.parameters.find((p) => p.storeKey === storeKey);
    if (!param) return null;
    return (
      <ParameterSlider
        key={param.path}
        path={param.path}
        storeKey={param.storeKey}
        label={param.label}
        min={param.min}
        max={param.max}
        step={param.step}
        mode={mode}
        duration={duration}
      />
    );
  };

  return (
    <ParameterGroup
      name="Post-FX"
      id="post-fx"
      storageKey={`${mode}-param-groups-post-fx`}
      defaultCollapsed
    >
      <SwitchControl controlKey="bloomEnabled" label="Bloom" />
      {getSlider("bloomBaseIntensity")}
      {getSlider("bloomAudioReactivity")}
      <SwitchControl controlKey="chromaticEnabled" label="Chromatic Aberration" />
      {getSlider("chromaticAudioReactivity")}
      <SwitchControl controlKey="vignetteEnabled" label="Vignette" />
      {getSlider("vignetteOffset")}
      {getSlider("vignetteDarkness")}
      <SwitchControl controlKey="invertColors" label="Invert Colors" />
      {getSlider("hfcVelocityBoost")}
      {getSlider("spawnBurstMultiplier")}
    </ParameterGroup>
  );
}

export function ParameterEditor({ mode, className }: ParameterEditorProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Dev mode uses local state, preset mode uses the store
  const [devDuration, setDevDuration] = useState(0);
  const [devEase, setDevEase] = useState<EaseFunction>("none");

  const storeGlobalDuration = useProducerMode((s) => s.globalDuration);
  const storeGlobalEase = useProducerMode((s) => s.globalEase);
  const setStoreGlobalDuration = useProducerMode((s) => s.setGlobalDuration);
  const setStoreGlobalEase = useProducerMode((s) => s.setGlobalEase);

  const duration = mode === "dev" ? devDuration : storeGlobalDuration;
  const ease: EaseFunction = mode === "dev" ? devEase : storeGlobalEase;
  const onDurationChange = mode === "dev" ? setDevDuration : setStoreGlobalDuration;
  const onEaseChange: (ease: EaseFunction) => void =
    mode === "dev" ? setDevEase : setStoreGlobalEase;

  const groups = useMemo(() => getParameterGroups(mode === "dev"), [mode]);
  const filteredGroups = useParameterFilter(groups, searchTerm);

  const isSearching = searchTerm.trim().length > 0;
  const showPostFX = mode === "dev" && !isSearching;

  return (
    <div className={cn("space-y-3", className)}>
      <GlobalControls
        duration={duration}
        ease={ease}
        onDurationChange={onDurationChange}
        onEaseChange={onEaseChange}
      />

      <ParameterSearch value={searchTerm} onChange={setSearchTerm} />

      <div className="space-y-1">
        {filteredGroups
          .filter((group) => group.name !== "Post-FX")
          .map((group) => (
            <ParameterGroup
              key={group.name}
              name={group.name}
              id={GROUP_IDS[group.name] || group.name.toLowerCase().replace(/\s+/g, "-")}
              storageKey={`${mode}-param-groups-${GROUP_IDS[group.name] || group.name.toLowerCase().replace(/\s+/g, "-")}`}
              defaultCollapsed
              forceOpen={isSearching}
            >
              {group.parameters.map((param) => (
                <ParameterSlider
                  key={param.path}
                  path={param.path}
                  storeKey={param.storeKey}
                  label={param.label}
                  min={param.min}
                  max={param.max}
                  step={param.step}
                  mode={mode}
                  duration={duration}
                />
              ))}
              {mode === "dev" && SPECIAL_CONTROLS[group.name]}
            </ParameterGroup>
          ))}

        {showPostFX && <PostFXControls mode={mode} duration={duration} />}
      </div>
    </div>
  );
}
