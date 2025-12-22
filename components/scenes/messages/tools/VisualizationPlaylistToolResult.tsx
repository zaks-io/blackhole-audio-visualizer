"use client";

import { useQuery } from "convex/react";
import { Sparkles } from "lucide-react";
import type { MessagePartStatus } from "@/lib/enrichedUIMessages";
import { usePlayPreset } from "@/components/ProducerMode/usePlayPreset";
import type { Preset, ConvexPreset } from "@/components/ProducerMode/types";
import { api } from "@/convex/_generated/api";
import type { Id, Doc } from "@/convex/_generated/dataModel";
import { ToolResultBase } from "./ToolResultBase";

interface VisualizationPlaylistToolResultProps {
  className?: string;
  input?: unknown;
  output?: unknown;
  status: MessagePartStatus;
}

type PresetInfo = {
  presetId?: string;
  name: string;
  sectionName?: string;
  colorPalette: string;
};

type VisualizationOutput = {
  playlistId?: string;
  presetCount?: number;
  presets?: PresetInfo[];
  reasoning?: string;
  error?: string;
};

const paletteColors: Record<string, string[]> = {
  "nebula-dreams": ["#ff6b9d", "#c44569", "#8b2f97", "#5c1a73"],
  "aurora-borealis": ["#00ff87", "#60efff", "#00b4d8", "#0077b6"],
  "cosmic-twilight": ["#2d1b69", "#553c9a", "#7c3aed", "#a855f7"],
  "solar-flare": ["#ff4500", "#ff6b35", "#f7931e", "#ffd700"],
  "synthwave-horizon": ["#ff00ff", "#ff1493", "#00ffff", "#ff6ec7"],
  "deep-ocean": ["#0077b6", "#00b4d8", "#0096c7", "#023e8a"],
  cool: ["#00d4ff", "#0077b6", "#4338ca", "#7c3aed"],
  warm: ["#ff6b35", "#f7931e", "#ef4444", "#fcd34d"],
  neon: ["#00ff87", "#ff00ff", "#00ffff", "#ffff00"],
  sunset: ["#ff6b35", "#ff8c42", "#ffd166", "#ef476f"],
  ocean: ["#00b4d8", "#0077b6", "#023e8a", "#90e0ef"],
  grayscale: ["#ffffff", "#d4d4d4", "#a3a3a3", "#737373"],
  "lunar-eclipse": ["#1a1a2e", "#16213e", "#0f3460", "#e94560"],
  "galactic-core": ["#ff6b6b", "#c44569", "#6a0572", "#1a1a2e"],
  starfield: ["#ffffff", "#a0d2eb", "#e5e5e5", "#0077b6"],
  vaporwave: ["#ff71ce", "#01cdfe", "#05ffa1", "#b967ff"],
  "cyberpunk-city": ["#f72585", "#7209b7", "#3a0ca3", "#4cc9f0"],
  "miami-vice": ["#ff6ad5", "#c774e8", "#ad8cff", "#8795e8"],
  "retrowave-outrun": ["#ff00ff", "#00ffff", "#ff6ec7", "#7b2d8e"],
  "electric-arcade": ["#39ff14", "#ff073a", "#00fff7", "#ffff00"],
  bioluminescence: ["#00ff87", "#00b4d8", "#0096c7", "#023e8a"],
  "volcanic-ember": ["#ff4500", "#ff6b35", "#f7931e", "#8b0000"],
  "autumn-forest": ["#d4a373", "#bc6c25", "#606c38", "#283618"],
  "arctic-aurora": ["#00ff87", "#60efff", "#00b4d8", "#0077b6"],
  "tropical-reef": ["#00b4d8", "#ff6b9d", "#ffd166", "#06d6a0"],
  "forest-mist": ["#606c38", "#283618", "#dda15e", "#bc6c25"],
  "desert-dusk": ["#ff6b35", "#f7931e", "#8b4513", "#2f1810"],
  "cotton-candy": ["#ffb6c1", "#ffc0cb", "#ffb7c5", "#ffdae0"],
  "pastel-dreams": ["#ffdde1", "#ee9ca7", "#b5deff", "#c9e4de"],
  "lavender-haze": ["#e6e6fa", "#d8bfd8", "#dda0dd", "#ee82ee"],
  "rose-gold": ["#b76e79", "#ecc5c0", "#f7d8ba", "#faebd7"],
  "bubblegum-pop": ["#ff69b4", "#ff1493", "#ff6ec7", "#ffb6c1"],
  "midnight-blue": ["#191970", "#000080", "#00008b", "#0000cd"],
  "crimson-noir": ["#8b0000", "#a52a2a", "#b22222", "#dc143c"],
  "emerald-depths": ["#004d40", "#00695c", "#00796b", "#00897b"],
  "amber-glow": ["#ff8f00", "#ffa000", "#ffb300", "#ffc107"],
};

function getPaletteColors(name: string): string[] {
  const key = Object.keys(paletteColors).find((k) => name.toLowerCase().includes(k.toLowerCase()));
  return key ? paletteColors[key] : ["#a855f7", "#8b5cf6", "#6366f1", "#3b82f6"];
}

function ColorSwatches({ palette }: { palette: string }) {
  const colors = getPaletteColors(palette);
  return (
    <div className="flex -space-x-1">
      {colors.slice(0, 4).map((color, i) => (
        <div
          key={i}
          className="w-4 h-4 rounded-full border-2 border-zinc-900 shadow-sm"
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

function convexPresetToPreset(preset: ConvexPreset): Preset {
  return {
    id: preset._id,
    name: preset.name,
    colorPalette: preset.colorPalette,
    parameters: preset.parameters,
  };
}

function PresetRow({ preset, displayInfo }: { preset: Doc<"presets">; displayInfo: PresetInfo }) {
  const { playPreset } = usePlayPreset();

  const handleClick = () => {
    playPreset(convexPresetToPreset(preset as unknown as ConvexPreset));
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors w-full text-left cursor-pointer"
    >
      <ColorSwatches palette={displayInfo.colorPalette} />
      <span className="flex-1 text-sm text-zinc-200 truncate">{displayInfo.name}</span>
      <span className="text-xs text-zinc-500 px-2 py-0.5 rounded bg-zinc-800">
        {displayInfo.colorPalette}
      </span>
    </button>
  );
}

function FallbackPresetRow({ displayInfo }: { displayInfo: PresetInfo }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/50 opacity-50 w-full">
      <ColorSwatches palette={displayInfo.colorPalette} />
      <span className="flex-1 text-sm text-zinc-200 truncate">{displayInfo.name}</span>
      <span className="text-xs text-zinc-500 px-2 py-0.5 rounded bg-zinc-800">
        {displayInfo.colorPalette}
      </span>
    </div>
  );
}

export function VisualizationPlaylistToolResult({
  className,
  output,
  status,
}: VisualizationPlaylistToolResultProps) {
  const data = output as VisualizationOutput | undefined;
  const isActive = status === "running" || status === "pending";

  const playlistPresets = useQuery(
    api.model.scenes.public.getPlaylistPresets,
    data?.playlistId ? { playlistId: data.playlistId as Id<"playlists"> } : "skip"
  );

  if (!data?.presets) {
    return (
      <ToolResultBase
        className={className}
        icon={<Sparkles className="w-4 h-4" />}
        variant="generate"
        title="Creating Visualizations..."
        status={status}
      />
    );
  }

  const presetCount = data.presetCount || data.presets.length;

  const countBadge = (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-medium">
      {presetCount} presets
    </span>
  );

  return (
    <ToolResultBase
      className={className}
      icon={<Sparkles className="w-4 h-4" />}
      variant="generate"
      title={isActive ? "Creating Visualizations..." : "Visualizations Created"}
      headerExtra={!isActive && countBadge}
      status={status}
      expandable
      defaultExpanded={false}
    >
      <div className="space-y-2">
        {data.presets.map((displayInfo, i) => {
          const fullPreset = playlistPresets?.[i];
          if (fullPreset) {
            return <PresetRow key={fullPreset._id} preset={fullPreset} displayInfo={displayInfo} />;
          }
          return <FallbackPresetRow key={displayInfo.presetId || i} displayInfo={displayInfo} />;
        })}
      </div>
    </ToolResultBase>
  );
}
