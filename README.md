# Halftone Converter Pro

Turn any image into classic print-style **halftone** artwork, entirely in your
browser. No uploads leave your machine — all processing happens client-side on
a `<canvas>`.

![Halftone Converter Pro](https://img.shields.io/badge/vite-react-38bdf8)

## Features

- **Monochrome and CMYK color** halftone screens (CMYK uses the classic
  15° / 75° / 0° / 45° screen angles with subtractive `multiply` blending).
- **Dot shapes:** circle, square, diamond.
- Adjustable **dot size**, **screen angle**, and **contrast**.
- Custom **ink** and **paper** colors for monochrome output.
- **Invert tones** toggle.
- Drag & drop or file upload, plus a built-in **sample image**.
- One-click **PNG download** of the result.

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
  App.tsx            # UI: controls, upload/drag-drop, download
  lib/
    halftone.ts      # pure math + canvas halftone renderer
    halftone.test.ts # unit tests for the math
    sample.ts        # built-in sample image generator
  index.css          # styling
```
