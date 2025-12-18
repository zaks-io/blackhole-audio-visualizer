export type ColorPaletteId = 'default' | 'cool' | 'warm' | 'neon' | 'sunset' | 'ocean' | 'grayscale';

export interface ColorPalette {
  id: ColorPaletteId;
  name: string;
  colors: string[];
}

export const PALETTES: Record<ColorPaletteId, ColorPalette> = {
  default: {
    id: 'default',
    name: 'Default',
    colors: [
      '#ff6b35', // Orange
      '#f7c948', // Yellow
      '#7ed321', // Green
      '#00d4aa', // Teal
      '#4a90d9', // Blue
      '#7b68ee', // Purple
      '#ff69b4', // Pink
      '#ff4757', // Red
    ],
  },
  cool: {
    id: 'cool',
    name: 'Cool',
    colors: [
      '#00ffff', // Cyan
      '#0099ff', // Azure
      '#3366ff', // Royal Blue
      '#6633ff', // Violet
      '#9933ff', // Purple
      '#00cccc', // Dark Cyan
      '#0066cc', // Deep Blue
      '#4d79ff', // Periwinkle
    ],
  },
  warm: {
    id: 'warm',
    name: 'Warm',
    colors: [
      '#ff4500', // Orange Red
      '#ff6600', // Blaze Orange
      '#ff9900', // Amber
      '#ffcc00', // Gold
      '#ff3300', // Scarlet
      '#ff5500', // Flame
      '#ff8800', // Dark Orange
      '#ffaa00', // Honey
    ],
  },
  neon: {
    id: 'neon',
    name: 'Neon',
    colors: [
      '#ff00ff', // Magenta
      '#00ff00', // Electric Green
      '#ffff00', // Yellow
      '#00ffff', // Cyan
      '#ff0080', // Hot Pink
      '#80ff00', // Lime
      '#0080ff', // Electric Blue
      '#ff8000', // Orange
    ],
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    colors: [
      '#ff6b6b', // Coral
      '#ff8e53', // Mandarin
      '#ffc93c', // Goldenrod
      '#f9d423', // Mustard
      '#fc6767', // Light Coral
      '#f093fb', // Pink Lavender
      '#f5af19', // Sunflower
      '#ff7b00', // Orange
    ],
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    colors: [
      '#0077b6', // Deep Sea
      '#00b4d8', // Pacific Blue
      '#90e0ef', // Light Cyan
      '#48cae4', // Turquoise
      '#023e8a', // Navy
      '#0096c7', // Cerulean
      '#00a8e8', // Vivid Sky
      '#38b6ff', // Light Blue
    ],
  },
  grayscale: {
    id: 'grayscale',
    name: 'Grayscale',
    colors: [
      '#ffffff', // White
      '#e0e0e0', // Light Gray
      '#c0c0c0', // Silver
      '#a0a0a0', // Gray
      '#d8d8d8', // Platinum
      '#b0b0b0', // Dark Silver
      '#f0f0f0', // Ghost White
      '#cccccc', // Light Silver
    ],
  },
};

export const PALETTE_IDS = (Object.keys(PALETTES) as ColorPaletteId[]).filter((id) => id !== 'default');

export const PALETTE_OFFSETS: Record<ColorPaletteId, number> = {
  default: 0,
  cool: 8,
  warm: 16,
  neon: 24,
  sunset: 32,
  ocean: 40,
  grayscale: 48,
};

export function getAllColors(): string[] {
  return PALETTE_IDS.flatMap((id) => PALETTES[id].colors);
}
