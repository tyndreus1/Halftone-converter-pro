import type { HalftoneOptions } from "./halftone";

export interface Palette {
  id: string;
  name: string;
  colors: string[];
}

export interface StylePreset {
  id: string;
  name: string;
  /** Preview gradient colors for the card thumbnail. */
  preview: string[];
  /** Palette id to activate alongside this style/preset, if any. */
  paletteId?: string;
  options: Partial<HalftoneOptions>;
}

export const PALETTES: Palette[] = [
  {
    id: "neon-nights",
    name: "Neon Nights",
    colors: ["#0b0221", "#5f2ee5", "#ff2a6d", "#05d9e8"],
  },
  {
    id: "80s-sunset",
    name: "80s Sunset",
    colors: ["#2b0a3d", "#7b2ff7", "#f72585", "#ff8f3f", "#ffd166"],
  },
  {
    id: "pastel-punch",
    name: "Pastel Punch",
    colors: ["#2e1065", "#a78bfa", "#f472b6", "#5eead4", "#fde68a"],
  },
];

export const HALFTONE_STYLES: StylePreset[] = [
  {
    id: "duotone",
    name: "DuoTone",
    preview: ["#0b0221", "#05d9e8"],
    options: {
      palette: ["#0b0221", "#05d9e8"],
      mono: false,
      pattern: "dots",
      glow: true,
      texture: false,
      grain: false,
      contrast: 0.15,
    },
  },
  {
    id: "pop-art",
    name: "Pop Art",
    preview: ["#1e1b4b", "#2563eb", "#ef4444", "#facc15"],
    options: {
      palette: ["#1e1b4b", "#2563eb", "#ef4444", "#facc15"],
      mono: false,
      pattern: "dots",
      glow: false,
      grain: false,
      texture: false,
      density: 0.5,
      threshold: 0.16,
      cellSize: 12,
      contrast: 0.3,
    },
  },
  {
    id: "grayscale",
    name: "Grayscale",
    preview: ["#111827", "#6b7280", "#f8fafc"],
    options: {
      mono: true,
      foreground: "#f2f5fb",
      background: "#0a0416",
      pattern: "dots",
      glow: false,
      grain: false,
      texture: false,
      contrast: 0.1,
    },
  },
  {
    id: "retro-wave",
    name: "Retro-Wave",
    preview: ["#5f2ee5", "#ff2a6d", "#05d9e8"],
    paletteId: "neon-nights",
    options: {
      palette: ["#0b0221", "#5f2ee5", "#ff2a6d", "#05d9e8"],
      mono: false,
      pattern: "dots",
      glow: true,
      texture: true,
      grain: false,
      density: 0.72,
      contrast: 0.14,
    },
  },
];

export const PRESETS: StylePreset[] = [
  {
    id: "glitch-pop",
    name: "Glitch Pop",
    preview: ["#f472b6", "#a78bfa", "#5eead4"],
    paletteId: "pastel-punch",
    options: {
      palette: ["#2e1065", "#a78bfa", "#f472b6", "#5eead4", "#fde68a"],
      mono: false,
      pattern: "crosshatch",
      glow: true,
      grain: true,
      texture: false,
      density: 0.8,
      cellSize: 9,
      angle: 30,
    },
  },
  {
    id: "waveform",
    name: "Waveform",
    preview: ["#05d9e8", "#5f2ee5", "#ff2a6d"],
    paletteId: "neon-nights",
    options: {
      palette: ["#0b0221", "#5f2ee5", "#ff2a6d", "#05d9e8"],
      mono: false,
      pattern: "lines",
      glow: true,
      grain: false,
      texture: false,
      density: 0.78,
      cellSize: 8,
      angle: 0,
    },
  },
  {
    id: "crt-glow",
    name: "CRT Glow",
    preview: ["#7b2ff7", "#f72585", "#ffd166"],
    paletteId: "80s-sunset",
    options: {
      palette: ["#2b0a3d", "#7b2ff7", "#f72585", "#ff8f3f", "#ffd166"],
      mono: false,
      pattern: "dots",
      glow: true,
      grain: true,
      texture: true,
      density: 0.7,
      cellSize: 10,
      angle: 45,
    },
  },
];
