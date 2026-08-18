import { describe, expect, it } from "vitest";
import {
  applyContrast,
  coverageToRadius,
  hexToRgb,
  rgbToCmyk,
  rgbToLuminance,
  samplePalette,
} from "./halftone";

describe("rgbToLuminance", () => {
  it("returns 0 for black and 1 for white", () => {
    expect(rgbToLuminance(0, 0, 0)).toBe(0);
    expect(rgbToLuminance(255, 255, 255)).toBeCloseTo(1, 5);
  });

  it("weights green most heavily", () => {
    const green = rgbToLuminance(0, 255, 0);
    const red = rgbToLuminance(255, 0, 0);
    const blue = rgbToLuminance(0, 0, 255);
    expect(green).toBeGreaterThan(red);
    expect(red).toBeGreaterThan(blue);
  });
});

describe("rgbToCmyk", () => {
  it("maps black to pure K", () => {
    expect(rgbToCmyk(0, 0, 0)).toEqual({ c: 0, m: 0, y: 0, k: 1 });
  });

  it("maps white to no ink", () => {
    expect(rgbToCmyk(255, 255, 255)).toEqual({ c: 0, m: 0, y: 0, k: 0 });
  });

  it("maps pure red to magenta + yellow", () => {
    const { c, m, y, k } = rgbToCmyk(255, 0, 0);
    expect(c).toBeCloseTo(0, 5);
    expect(m).toBeCloseTo(1, 5);
    expect(y).toBeCloseTo(1, 5);
    expect(k).toBeCloseTo(0, 5);
  });
});

describe("applyContrast", () => {
  it("is identity at contrast 0", () => {
    expect(applyContrast(0.3, 0)).toBeCloseTo(0.3, 5);
    expect(applyContrast(0.7, 0)).toBeCloseTo(0.7, 5);
  });

  it("pushes values away from mid-gray when increased", () => {
    expect(applyContrast(0.7, 0.5)).toBeGreaterThan(0.7);
    expect(applyContrast(0.3, 0.5)).toBeLessThan(0.3);
  });

  it("stays within 0..1", () => {
    expect(applyContrast(0.95, 0.9)).toBeLessThanOrEqual(1);
    expect(applyContrast(0.05, 0.9)).toBeGreaterThanOrEqual(0);
  });
});

describe("coverageToRadius", () => {
  it("is 0 for no coverage", () => {
    expect(coverageToRadius(0, 10)).toBe(0);
  });

  it("fills the cell diagonal at full coverage", () => {
    expect(coverageToRadius(1, 10)).toBeCloseTo(5 * Math.SQRT2, 5);
  });

  it("scales with the square root of coverage (area-proportional)", () => {
    const quarter = coverageToRadius(0.25, 10);
    const full = coverageToRadius(1, 10);
    expect(quarter).toBeCloseTo(full * 0.5, 5);
  });
});

describe("hexToRgb", () => {
  it("parses #rrggbb", () => {
    expect(hexToRgb("#ff2a6d")).toEqual({ r: 255, g: 42, b: 109 });
  });

  it("parses shorthand #rgb", () => {
    expect(hexToRgb("#0f8")).toEqual({ r: 0, g: 255, b: 136 });
  });

  it("handles a missing hash", () => {
    expect(hexToRgb("05d9e8")).toEqual({ r: 5, g: 217, b: 232 });
  });
});

describe("samplePalette", () => {
  const palette = ["#000000", "#ff0000", "#ffffff"];

  it("returns the first color at t=0 and last at t=1", () => {
    expect(samplePalette(palette, 0)).toEqual({ r: 0, g: 0, b: 0 });
    expect(samplePalette(palette, 1)).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("hits an interior stop exactly", () => {
    expect(samplePalette(palette, 0.5)).toEqual({ r: 255, g: 0, b: 0 });
  });

  it("interpolates between stops", () => {
    const mid = samplePalette(palette, 0.25);
    expect(mid.r).toBeCloseTo(128, -1);
    expect(mid.g).toBe(0);
    expect(mid.b).toBe(0);
  });

  it("clamps out-of-range t", () => {
    expect(samplePalette(palette, -1)).toEqual({ r: 0, g: 0, b: 0 });
    expect(samplePalette(palette, 5)).toEqual({ r: 255, g: 255, b: 255 });
  });
});
