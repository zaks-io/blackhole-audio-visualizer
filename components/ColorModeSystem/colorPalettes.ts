export type ColorPaletteId =
  | "default"
  // Original palettes
  | "cool"
  | "warm"
  | "neon"
  | "sunset"
  | "ocean"
  | "grayscale"
  // Cosmic & Space
  | "nebula-dreams"
  | "aurora-borealis"
  | "cosmic-twilight"
  | "solar-flare"
  | "lunar-eclipse"
  | "galactic-core"
  | "starfield"
  // Retro & Synthwave
  | "synthwave-horizon"
  | "vaporwave"
  | "cyberpunk-city"
  | "miami-vice"
  | "retrowave-outrun"
  | "electric-arcade"
  // Nature & Elements
  | "deep-ocean"
  | "bioluminescence"
  | "volcanic-ember"
  | "autumn-forest"
  | "arctic-aurora"
  | "tropical-reef"
  | "forest-mist"
  | "desert-dusk"
  // Soft & Pastel
  | "cotton-candy"
  | "pastel-dreams"
  | "lavender-haze"
  | "rose-gold"
  | "bubblegum-pop"
  // Monochrome & Minimal
  | "midnight-blue"
  | "crimson-noir"
  | "emerald-depths"
  | "amber-glow";

export interface ColorPalette {
  id: ColorPaletteId;
  name: string;
  colors: string[];
}

export const PALETTES: Record<ColorPaletteId, ColorPalette> = {
  default: {
    id: "default",
    name: "Default",
    colors: [
      "#ff6b35",
      "#f7c948",
      "#7ed321",
      "#00d4aa",
      "#4a90d9",
      "#7b68ee",
      "#ff69b4",
      "#ff4757",
    ],
  },

  // Original palettes
  cool: {
    id: "cool",
    name: "Cool",
    colors: [
      "#00ffff",
      "#0099ff",
      "#3366ff",
      "#6633ff",
      "#9933ff",
      "#00cccc",
      "#0066cc",
      "#4d79ff",
    ],
  },
  warm: {
    id: "warm",
    name: "Warm",
    colors: [
      "#ff4500",
      "#ff6600",
      "#ff9900",
      "#ffcc00",
      "#ff3300",
      "#ff5500",
      "#ff8800",
      "#ffaa00",
    ],
  },
  neon: {
    id: "neon",
    name: "Neon",
    colors: [
      "#ff00ff",
      "#00ff00",
      "#ffff00",
      "#00ffff",
      "#ff0080",
      "#80ff00",
      "#0080ff",
      "#ff8000",
    ],
  },
  sunset: {
    id: "sunset",
    name: "Sunset",
    colors: [
      "#ff6b6b",
      "#ff8e53",
      "#ffc93c",
      "#f9d423",
      "#fc6767",
      "#f093fb",
      "#f5af19",
      "#ff7b00",
    ],
  },
  ocean: {
    id: "ocean",
    name: "Ocean",
    colors: [
      "#0077b6",
      "#00b4d8",
      "#90e0ef",
      "#48cae4",
      "#023e8a",
      "#0096c7",
      "#00a8e8",
      "#38b6ff",
    ],
  },
  grayscale: {
    id: "grayscale",
    name: "Grayscale",
    colors: [
      "#ffffff",
      "#e0e0e0",
      "#c0c0c0",
      "#a0a0a0",
      "#d8d8d8",
      "#b0b0b0",
      "#f0f0f0",
      "#cccccc",
    ],
  },

  // Cosmic & Space
  "nebula-dreams": {
    id: "nebula-dreams",
    name: "Nebula Dreams",
    colors: [
      "#9d4edd",
      "#c77dff",
      "#e040fb",
      "#ff6bd6",
      "#ff6b6b",
      "#ff8a80",
      "#64b5f6",
      "#00e5ff",
    ],
  },
  "aurora-borealis": {
    id: "aurora-borealis",
    name: "Aurora Borealis",
    colors: [
      "#00e676",
      "#1de9b6",
      "#00bfa5",
      "#64ffda",
      "#18ffff",
      "#00e5ff",
      "#40c4ff",
      "#7c4dff",
    ],
  },
  "cosmic-twilight": {
    id: "cosmic-twilight",
    name: "Cosmic Twilight",
    colors: [
      "#aa00ff",
      "#d500f9",
      "#e040fb",
      "#ea80fc",
      "#ff4081",
      "#ff80ab",
      "#ffab40",
      "#ffd740",
    ],
  },
  "solar-flare": {
    id: "solar-flare",
    name: "Solar Flare",
    colors: [
      "#ff1744",
      "#ff5252",
      "#ff6e40",
      "#ff9100",
      "#ffab00",
      "#ffc400",
      "#ffea00",
      "#fff176",
    ],
  },
  "lunar-eclipse": {
    id: "lunar-eclipse",
    name: "Lunar Eclipse",
    colors: [
      "#ff5252",
      "#ff8a80",
      "#ea80fc",
      "#b388ff",
      "#8c9eff",
      "#82b1ff",
      "#e57373",
      "#f48fb1",
    ],
  },
  "galactic-core": {
    id: "galactic-core",
    name: "Galactic Core",
    colors: [
      "#7c4dff",
      "#b388ff",
      "#651fff",
      "#aa00ff",
      "#d500f9",
      "#e040fb",
      "#536dfe",
      "#8c9eff",
    ],
  },
  starfield: {
    id: "starfield",
    name: "Starfield",
    colors: [
      "#ffd740",
      "#ffab00",
      "#ffc400",
      "#ffea00",
      "#64b5f6",
      "#42a5f5",
      "#29b6f6",
      "#81d4fa",
    ],
  },

  // Retro & Synthwave
  "synthwave-horizon": {
    id: "synthwave-horizon",
    name: "Synthwave Horizon",
    colors: [
      "#ff0080",
      "#ff00ff",
      "#00ffff",
      "#ff6600",
      "#ffcc00",
      "#cc00ff",
      "#00ccff",
      "#ff3399",
    ],
  },
  vaporwave: {
    id: "vaporwave",
    name: "Vaporwave",
    colors: [
      "#ff71ce",
      "#01cdfe",
      "#05ffa1",
      "#b967ff",
      "#fffb96",
      "#ff9f1c",
      "#f15bb5",
      "#00f5d4",
    ],
  },
  "cyberpunk-city": {
    id: "cyberpunk-city",
    name: "Cyberpunk City",
    colors: [
      "#00ff9f",
      "#00b8ff",
      "#bd00ff",
      "#ff0080",
      "#ffcc00",
      "#ff00ff",
      "#00ffff",
      "#ff5c8a",
    ],
  },
  "miami-vice": {
    id: "miami-vice",
    name: "Miami Vice",
    colors: [
      "#00e5ff",
      "#ff80ab",
      "#ff4081",
      "#18ffff",
      "#ff6e40",
      "#f48fb1",
      "#69f0ae",
      "#40c4ff",
    ],
  },
  "retrowave-outrun": {
    id: "retrowave-outrun",
    name: "Retrowave Outrun",
    colors: [
      "#b388ff",
      "#ff4081",
      "#ff6e40",
      "#18ffff",
      "#00e5ff",
      "#e040fb",
      "#ffd740",
      "#69f0ae",
    ],
  },
  "electric-arcade": {
    id: "electric-arcade",
    name: "Electric Arcade",
    colors: [
      "#ff0090",
      "#00ffff",
      "#ffff00",
      "#39ff14",
      "#ff00ff",
      "#00ff00",
      "#ff6600",
      "#0080ff",
    ],
  },

  // Nature & Elements
  "deep-ocean": {
    id: "deep-ocean",
    name: "Deep Ocean",
    colors: [
      "#0277bd",
      "#0288d1",
      "#039be5",
      "#03a9f4",
      "#29b6f6",
      "#4fc3f7",
      "#00bcd4",
      "#26c6da",
    ],
  },
  bioluminescence: {
    id: "bioluminescence",
    name: "Bioluminescence",
    colors: [
      "#00ffff",
      "#00e5ff",
      "#18ffff",
      "#64ffda",
      "#1de9b6",
      "#69f0ae",
      "#e040fb",
      "#ea80fc",
    ],
  },
  "volcanic-ember": {
    id: "volcanic-ember",
    name: "Volcanic Ember",
    colors: [
      "#ff1744",
      "#ff5252",
      "#ff6e40",
      "#ff9100",
      "#ff3d00",
      "#ff6d00",
      "#ffab00",
      "#ffc400",
    ],
  },
  "autumn-forest": {
    id: "autumn-forest",
    name: "Autumn Forest",
    colors: [
      "#ff6f00",
      "#ff8f00",
      "#ffa000",
      "#ffb300",
      "#ffc107",
      "#8bc34a",
      "#7cb342",
      "#689f38",
    ],
  },
  "arctic-aurora": {
    id: "arctic-aurora",
    name: "Arctic Aurora",
    colors: [
      "#00e5ff",
      "#18ffff",
      "#64ffda",
      "#1de9b6",
      "#00e676",
      "#b388ff",
      "#7c4dff",
      "#40c4ff",
    ],
  },
  "tropical-reef": {
    id: "tropical-reef",
    name: "Tropical Reef",
    colors: [
      "#00b0ff",
      "#00e5ff",
      "#1de9b6",
      "#76ff03",
      "#ffea00",
      "#ff9100",
      "#ff5252",
      "#e040fb",
    ],
  },
  "forest-mist": {
    id: "forest-mist",
    name: "Forest Mist",
    colors: [
      "#00c853",
      "#00e676",
      "#69f0ae",
      "#b9f6ca",
      "#1de9b6",
      "#64ffda",
      "#00bfa5",
      "#26a69a",
    ],
  },
  "desert-dusk": {
    id: "desert-dusk",
    name: "Desert Dusk",
    colors: [
      "#ff6f00",
      "#ff8f00",
      "#ffa000",
      "#ffb300",
      "#ff5722",
      "#ff7043",
      "#ffab40",
      "#ffd54f",
    ],
  },

  // Soft & Pastel
  "cotton-candy": {
    id: "cotton-candy",
    name: "Cotton Candy",
    colors: [
      "#ff80ab",
      "#ff4081",
      "#f48fb1",
      "#ea80fc",
      "#ce93d8",
      "#80deea",
      "#84ffff",
      "#a7ffeb",
    ],
  },
  "pastel-dreams": {
    id: "pastel-dreams",
    name: "Pastel Dreams",
    colors: [
      "#f48fb1",
      "#ce93d8",
      "#b39ddb",
      "#9fa8da",
      "#90caf9",
      "#80deea",
      "#a5d6a7",
      "#ffcc80",
    ],
  },
  "lavender-haze": {
    id: "lavender-haze",
    name: "Lavender Haze",
    colors: [
      "#e1bee7",
      "#ce93d8",
      "#ba68c8",
      "#ab47bc",
      "#9c27b0",
      "#8e24aa",
      "#7b1fa2",
      "#6a1b9a",
    ],
  },
  "rose-gold": {
    id: "rose-gold",
    name: "Rose Gold",
    colors: [
      "#f48fb1",
      "#f06292",
      "#ec407a",
      "#e91e63",
      "#ffb74d",
      "#ffa726",
      "#ff9800",
      "#fb8c00",
    ],
  },
  "bubblegum-pop": {
    id: "bubblegum-pop",
    name: "Bubblegum Pop",
    colors: [
      "#ff4081",
      "#f50057",
      "#ff80ab",
      "#ff1493",
      "#40c4ff",
      "#00b0ff",
      "#18ffff",
      "#84ffff",
    ],
  },

  // Monochrome & Minimal
  "midnight-blue": {
    id: "midnight-blue",
    name: "Midnight Blue",
    colors: [
      "#1565c0",
      "#1976d2",
      "#1e88e5",
      "#2196f3",
      "#42a5f5",
      "#64b5f6",
      "#90caf9",
      "#bbdefb",
    ],
  },
  "crimson-noir": {
    id: "crimson-noir",
    name: "Crimson Noir",
    colors: [
      "#b71c1c",
      "#c62828",
      "#d32f2f",
      "#e53935",
      "#f44336",
      "#ef5350",
      "#e57373",
      "#ef9a9a",
    ],
  },
  "emerald-depths": {
    id: "emerald-depths",
    name: "Emerald Depths",
    colors: [
      "#1b5e20",
      "#2e7d32",
      "#388e3c",
      "#43a047",
      "#4caf50",
      "#66bb6a",
      "#81c784",
      "#a5d6a7",
    ],
  },
  "amber-glow": {
    id: "amber-glow",
    name: "Amber Glow",
    colors: [
      "#ff6f00",
      "#ff8f00",
      "#ffa000",
      "#ffb300",
      "#ffc107",
      "#ffca28",
      "#ffd54f",
      "#ffe082",
    ],
  },
};

export const PALETTE_IDS = (Object.keys(PALETTES) as ColorPaletteId[]).filter(
  (id) => id !== "default"
);

// Offsets match getAllColors() which excludes "default"
// Each palette has 8 colors, offsets are computed based on PALETTE_IDS order
export const PALETTE_OFFSETS: Record<ColorPaletteId, number> = PALETTE_IDS.reduce(
  (acc, id, index) => {
    acc[id] = index * 8;
    return acc;
  },
  { default: 0 } as Record<ColorPaletteId, number>
);

export function getAllColors(): string[] {
  return PALETTE_IDS.flatMap((id) => PALETTES[id].colors);
}
