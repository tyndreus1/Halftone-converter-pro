export type HalftoneMode = "mono" | "cmyk";
export type DotShape = "circle" | "square" | "diamond";

export interface HalftoneOptions {
  /** Grid cell size in pixels. Larger = bigger, coarser dots. */
  cellSize: number;
  /** Screen angle in degrees (used directly in mono mode). */
  angle: number;
  mode: HalftoneMode;
  shape: DotShape;
  /** Contrast adjustment, -1..1. 0 = unchanged. */
  contrast: number;
  /** Invert tones (useful for dark backgrounds). */
  invert: boolean;
  /** Foreground (ink) color for mono mode, e.g. "#0f172a". */
  foreground: string;
  /** Background color for mono mode, e.g. "#f8fafc". */
  background: string;
}

export const DEFAULT_OPTIONS: HalftoneOptions = {
  cellSize: 8,
  angle: 45,
  mode: "mono",
  shape: "circle",
  contrast: 0,
  invert: false,
  foreground: "#0f172a",
  background: "#f8fafc",
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
 * coverage. A cell fully covered (coverage=1) yields a dot that fills
 * the cell (radius up to the cell half-diagonal).
 */
export function coverageToRadius(coverage: number, cellSize: number): number {
  const clamped = Math.max(0, Math.min(1, coverage));
  const maxRadius = (cellSize / 2) * Math.SQRT2;
  return maxRadius * Math.sqrt(clamped);
}

interface Channel {
  /** Ink coverage 0..1 for a pixel; higher = more ink (darker dot). */
  coverage: (r: number, g: number, b: number, a: number) => number;
  color: string;
  angle: number;
}

function drawDot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  shape: DotShape,
): void {
  if (radius <= 0.05) return;
  ctx.beginPath();
  if (shape === "circle") {
    ctx.arc(x, y, radius, 0, Math.PI * 2);
  } else if (shape === "square") {
    const s = radius * Math.SQRT2;
    ctx.rect(x - s / 2, y - s / 2, s, s);
  } else {
    // diamond
    ctx.moveTo(x, y - radius);
    ctx.lineTo(x + radius, y);
    ctx.lineTo(x, y + radius);
    ctx.lineTo(x - radius, y);
    ctx.closePath();
  }
  ctx.fill();
}

function averageCoverage(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  cellSize: number,
  channel: Channel,
): number | null {
  const half = cellSize / 2;
  const step = Math.max(1, Math.floor(cellSize / 4));
  let sum = 0;
  let count = 0;
  for (let sy = cy - half; sy <= cy + half; sy += step) {
    for (let sx = cx - half; sx <= cx + half; sx += step) {
      const px = Math.round(sx);
      const py = Math.round(sy);
      if (px < 0 || py < 0 || px >= width || py >= height) continue;
      const idx = (py * width + px) * 4;
      sum += channel.coverage(
        data[idx],
        data[idx + 1],
        data[idx + 2],
        data[idx + 3],
      );
      count += 1;
    }
  }
  if (count === 0) return null;
  return sum / count;
}

function renderScreen(
  ctx: CanvasRenderingContext2D,
  source: ImageData,
  channel: Channel,
  options: HalftoneOptions,
): void {
  const { width, height, data } = source;
  const { cellSize, shape, contrast, invert } = options;
  const angle = (channel.angle * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  ctx.fillStyle = channel.color;

  // Iterate the grid in a rotated coordinate system so dots align to the
  // screen angle, then map each grid node back into image space.
  const diag = Math.ceil(Math.sqrt(width * width + height * height));
  const start = -diag;
  const end = diag;

  for (let v = start; v <= end; v += cellSize) {
    for (let u = start; u <= end; u += cellSize) {
      // Rotate grid coordinates into image space (centered on image middle).
      const cx = width / 2 + (u * cos - v * sin);
      const cy = height / 2 + (u * sin + v * cos);
      if (
        cx < -cellSize ||
        cy < -cellSize ||
        cx > width + cellSize ||
        cy > height + cellSize
      ) {
        continue;
      }
      const avg = averageCoverage(data, width, height, cx, cy, cellSize, channel);
      if (avg === null) continue;
      let coverage = invert ? 1 - avg : avg;
      coverage = applyContrast(coverage, contrast);
      const radius = coverageToRadius(coverage, cellSize);
      drawDot(ctx, cx, cy, radius, shape);
    }
  }
}

const CMYK_CHANNELS: Array<{
  key: "c" | "m" | "y" | "k";
  color: string;
  angle: number;
}> = [
  { key: "y", color: "#ffff00", angle: 0 },
  { key: "c", color: "#00ffff", angle: 15 },
  { key: "k", color: "#000000", angle: 45 },
  { key: "m", color: "#ff00ff", angle: 75 },
];

/**
 * Render a halftone version of `source` onto `ctx`'s canvas. The canvas is
 * assumed to already match the source dimensions.
 */
export function renderHalftone(
  ctx: CanvasRenderingContext2D,
  source: ImageData,
  options: HalftoneOptions,
): void {
  const { width, height } = source;
  ctx.save();
  ctx.clearRect(0, 0, width, height);

  if (options.mode === "cmyk") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.globalCompositeOperation = "multiply";
    for (const ch of CMYK_CHANNELS) {
      renderScreen(
        ctx,
        source,
        {
          color: ch.color,
          angle: ch.angle,
          coverage: (r, g, b) => rgbToCmyk(r, g, b)[ch.key],
        },
        options,
      );
    }
  } else {
    ctx.fillStyle = options.background;
    ctx.fillRect(0, 0, width, height);
    renderScreen(
      ctx,
      source,
      {
        color: options.foreground,
        angle: options.angle,
        coverage: (r, g, b) => 1 - rgbToLuminance(r, g, b),
      },
      options,
    );
  }
  ctx.restore();
}
