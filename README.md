# Halftone Converter Pro

Turn any image into classic print-style **halftone** artwork, entirely in your
browser. No uploads leave your machine — all processing happens client-side on
a `<canvas>`.

![Halftone Converter Pro](https://img.shields.io/badge/vite-react-38bdf8)

## Features

- **Neon studio UI** with a top nav, tool rail, style/palette sidebar,
  live preview stage, presets + history, and a bottom control bar.
- **Halftone styles:** DuoTone, Pop Art, Grayscale, Retro-Wave.
- **Color palettes** (Neon Nights, 80s Sunset, Pastel Punch) plus a
  **Custom palette** — add/remove your own colors with a color picker.
- **Presets:** Glitch Pop, Waveform, CRT Glow (one-click looks).
- **Pattern types:** Dots, Lines, Crosshatch.
- Adjustable **Dot Size**, **Density**, and **Threshold** (plus screen
  angle and contrast in the engine).
- **Layers & Effects:** Grain, Glow (neon bloom), Texture (CRT scanlines).
- **History**: snapshot any generated look and restore it in one click.
- Drag & drop or file upload, a built-in synthwave **sample image**, and
  one-click **PNG export**.

## Tech stack

- [Vite](https://vite.dev/) + [React](https://react.dev/) + TypeScript
- Canvas 2D rendering; the halftone math lives in `src/lib/halftone.ts`
- [Vitest](https://vitest.dev/) unit tests for the color/tone math

## Getting started

```bash
npm install      # first time (writes package-lock.json)
npm run dev      # start the dev server at http://localhost:5173
```

## Scripts

| Command         | Description                                    |
| --------------- | ---------------------------------------------- |
| `npm run dev`   | Start the Vite dev server (`--host`).          |
| `npm run build` | Type-check and build the production bundle.    |
| `npm run preview` | Preview the production build.                |
| `npm run lint`  | Lint with ESLint.                              |
| `npm test`      | Run the Vitest unit suite.                     |

## Project layout

```
src/
  App.tsx            # neon UI: nav, sidebar, stage, presets, controls
  lib/
    halftone.ts      # pure math + canvas halftone renderer (patterns, palettes, effects)
    halftone.test.ts # unit tests for the math
    presets.ts       # styles, color palettes, and presets
    sample.ts        # built-in synthwave sample image generator
  index.css          # neon styling
```
