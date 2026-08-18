export type PatternType = "dots" | "lines" | "crosshatch";

export interface HalftoneOptions {
  /** Grid cell size in pixels ("Dot Size"). */
  cellSize: number;
  /** 0..1 — scales dot/line coverage ("Density"). */
  density: number;
  /** 0..1 — tones with less ink than this are left blank ("Threshold"). */
  threshold: number;
  /** Screen angle in degrees. */
  angle: number;
  /** Contrast adjustment, -1..1. 0 = unchanged. */
  contrast: number;
  /** Invert tones. */
  invert: boolean;
  pattern: PatternType;
  /** Grayscale/duotone using a single ink color instead of the palette. */
  mono: boolean;
  /** Ordered palette (shadow -> highlight) for color mode. */
  palette: string[];
  /** Ink color for mono mode. */
  foreground: string;
  /** Canvas background color. */
  background: string;
  /** Neon glow (additive blending + blur). */
  glow: boolean;
  /** Film grain overlay. */
  grain: boolean;
  /** CRT scanline texture overlay. */
  texture: boolean;
}

export const DEFAULT_OPTIONS: HalftoneOptions = {
  cellSize: 9,
  density: 0.72,
  threshold: 0.12,
  angle: 45,
  contrast: 0.12,
  invert: false,
  pattern: "dots",
  mono: false,
  palette: ["#0b0221", "#5f2ee5", "#ff2a6d", "#05d9e8"],
  foreground: "#e8edf7",
  background: "#0a0416",
  glow: true,
  grain: false,
  texture: false,
};

/** Perceptual luminance from sRGB channels, returned in 0..1. */
export function rgbToLuminance(r: number, g: number, b: number): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

/** Convert an sRGB triple to CMYK, each component in 0..1. */
export function rgbToCmyk(
  r: number,
  g: number,
  b: number,
): { c: number; m: number; y: number; k: number } {
  const rr = r / 255;
  const gg = g / 255;
  const bb = b / 255;
  const k = 1 - Math.max(rr, gg, bb);
  if (k >= 1) {
    return { c: 0, m: 0, y: 0, k: 1 };
  }
  const c = (1 - rr - k) / (1 - k);
  const m = (1 - gg - k) / (1 - k);
  const y = (1 - bb - k) / (1 - k);
  return { c, m, y, k };
}

/**
 * Apply a symmetric contrast curve around 0.5.
 * contrast in -1..1; positive increases contrast.
 */
export function applyContrast(value: number, contrast: number): number {
  const clamped = Math.max(-1, Math.min(1, contrast));
  const factor = (1 + clamped) / (1 - clamped * 0.999999);
  const result = (value - 0.5) * factor + 0.5;
  return Math.max(0, Math.min(1, result));
}

/**
 * Radius of a halftone dot so that its area is proportional to ink
 * coverage. Full coverage fills the cell (radius up to the half-diagonal).
 */
export function coverageToRadius(coverage: number, cellSize: number): number {
  const clamped = Math.max(0, Math.min(1, coverage));
  const maxRadius = (cellSize / 2) * Math.SQRT2;
  return maxRadius * Math.sqrt(clamped);
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parse a #rgb or #rrggbb color into an {r,g,b} triple. */
export function hexToRgb(hex: string): Rgb {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const int = parseInt(h, 16);
  if (Number.isNaN(int) || h.length !== 6) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  };
}

/**
 * Sample an ordered list of colors as a continuous gradient.
 * `t` is clamped to 0..1; t=0 -> first color, t=1 -> last color.
 */
export function samplePalette(colors: string[], t: number): Rgb {
  if (colors.length === 0) return { r: 255, g: 255, b: 255 };
  if (colors.length === 1) return hexToRgb(colors[0]);
  const clamped = Math.max(0, Math.min(1, t));
  const scaled = clamped * (colors.length - 1);
  const i = Math.min(colors.length - 2, Math.floor(scaled));
  const f = scaled - i;
  const a = hexToRgb(colors[i]);
  const b = hexToRgb(colors[i + 1]);
  return {
    r: Math.round(a.r + (b.r - a.r) * f),
    g: Math.round(a.g + (b.g - a.g) * f),
    b: Math.round(a.b + (b.b - a.b) * f),
  };
}

function rgbCss({ r, g, b }: Rgb): string {
  return `rgb(${r}, ${g}, ${b})`;
}

interface CellSample {
  luminance: number;
  color: Rgb;
}

function sampleCell(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  cellSize: number,
): CellSample | null {
  const half = cellSize / 2;
  const step = Math.max(1, Math.floor(cellSize / 4));
  let lum = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (let sy = cy - half; sy <= cy + half; sy += step) {
    for (let sx = cx - half; sx <= cx + half; sx += step) {
      const px = Math.round(sx);
      const py = Math.round(sy);
      if (px < 0 || py < 0 || px >= width || py >= height) continue;
      const idx = (py * width + px) * 4;
      r += data[idx];
      g += data[idx + 1];
      b += data[idx + 2];
      lum += rgbToLuminance(data[idx], data[idx + 1], data[idx + 2]);
      count += 1;
    }
  }
  if (count === 0) return null;
  return {
    luminance: lum / count,
    color: { r: r / count, g: g / count, b: b / count },
  };
}

function drawShape(
  ctx: CanvasRenderingContext2D,
  u: number,
  v: number,
  coverage: number,
  cellSize: number,
  pattern: PatternType,
): void {
  if (pattern === "dots") {
    // Cap the radius near half the cell so dots stay round and never merge
    // into flat fills in dark regions (keeps a classic halftone dot grid).
    const radius = Math.min(coverageToRadius(coverage, cellSize), cellSize * 0.52);
    if (radius <= 0.05) return;
    ctx.beginPath();
    ctx.arc(u, v, radius, 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  const thickness = Math.max(0, coverage) * cellSize;
  if (thickness <= 0.15) return;
  const span = cellSize + 0.75;
  if (pattern === "lines") {
    ctx.fillRect(u - span / 2, v - thickness / 2, span, thickness);
    return;
  }
  // crosshatch: horizontal + vertical bars
  ctx.fillRect(u - span / 2, v - thickness / 2, span, thickness);
  ctx.fillRect(u - thickness / 2, v - span / 2, thickness, span);
}

function makeNoiseCanvas(size = 128): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const img = ctx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const n = Math.floor(Math.random() * 256);
    img.data[i] = n;
    img.data[i + 1] = n;
    img.data[i + 2] = n;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

function applyGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  const noise = makeNoiseCanvas();
  const pattern = ctx.createPattern(noise, "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.globalCompositeOperation = "overlay";
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

function applyTexture(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.save();
  ctx.globalCompositeOperation = "multiply";
  ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
  for (let y = 0; y < height; y += 3) {
    ctx.fillRect(0, y, width, 1.4);
  }
  ctx.restore();
}

/**
 * Render a halftone version of `source` onto `ctx`'s canvas. The canvas is
 * assumed to already match the source dimensions.
 */
export function renderHalftone(
  ctx: CanvasRenderingContext2D,
  source: ImageData,
  options: HalftoneOptions,
): void {
  const { width, height, data } = source;
  const {
    cellSize,
    density,
    threshold,
    angle,
    contrast,
    invert,
    pattern,
    mono,
    palette,
    foreground,
    background,
    glow,
    grain,
    texture,
  } = options;

  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const centerX = width / 2;
  const centerY = height / 2;
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const diag = Math.ceil(Math.sqrt(width * width + height * height));

  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.rotate(rad);
  if (glow) {
    ctx.globalCompositeOperation = "lighter";
  }

  for (let v = -diag; v <= diag; v += cellSize) {
    for (let u = -diag; u <= diag; u += cellSize) {
      // Map rotated grid node (u, v) back into image space to sample tone.
      const cx = centerX + (u * cos - v * sin);
      const cy = centerY + (u * sin + v * cos);
      if (
        cx < -cellSize ||
        cy < -cellSize ||
        cx > width + cellSize ||
        cy > height + cellSize
      ) {
        continue;
      }
      const sample = sampleCell(data, width, height, cx, cy, cellSize);
      if (!sample) continue;

      // Bright pixels carry more ink so a light/neon ink reads as a positive
      // image on the dark canvas (dark areas stay empty). `invert` flips it.
      const tone = invert ? 1 - sample.luminance : sample.luminance;
      const ink = applyContrast(tone, contrast);
      if (ink < threshold) continue;
      const coverage = Math.min(1, ink * (0.35 + density * 1.15));

      const color = mono
        ? hexToRgb(foreground)
        : samplePalette(palette, ink);
      ctx.fillStyle = rgbCss(color);
      if (glow) {
        ctx.shadowColor = rgbCss(color);
        ctx.shadowBlur = cellSize * 0.85;
      } else {
        ctx.shadowBlur = 0;
      }
      drawShape(ctx, u, v, coverage, cellSize, pattern);
    }
  }
  ctx.restore();

  if (grain) applyGrain(ctx, width, height);
  if (texture) applyTexture(ctx, width, height);
  ctx.restore();
}
