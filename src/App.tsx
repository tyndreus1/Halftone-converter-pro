import { useCallback, useEffect, useRef, useState } from "react";
import {
  DEFAULT_OPTIONS,
  renderHalftone,
  type DotShape,
  type HalftoneMode,
  type HalftoneOptions,
} from "./lib/halftone";
import { createSampleImage } from "./lib/sample";

const MAX_DIMENSION = 1000;

function drawScaledToSource(
  source: CanvasImageSource,
  naturalWidth: number,
  naturalHeight: number,
): ImageData | null {
  const scale = Math.min(
    1,
    MAX_DIMENSION / Math.max(naturalWidth, naturalHeight),
  );
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(source, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [source, setSource] = useState<ImageData | null>(null);
  const [fileName, setFileName] = useState<string>("sample");
  const [options, setOptions] = useState<HalftoneOptions>(DEFAULT_OPTIONS);
  const [dragging, setDragging] = useState(false);
  const [rendering, setRendering] = useState(false);

  const loadFromElement = useCallback(
    (el: CanvasImageSource, w: number, h: number, name: string) => {
      const data = drawScaledToSource(el, w, h);
      if (data) {
        setSource(data);
        setFileName(name);
      }
    },
    [],
  );

  const loadFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        loadFromElement(img, img.naturalWidth, img.naturalHeight, file.name);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    },
    [loadFromElement],
  );

  // Load the sample image on first mount.
  useEffect(() => {
    const sample = createSampleImage();
    loadFromElement(sample, sample.width, sample.height, "sample");
  }, [loadFromElement]);

  // Re-render whenever the source or options change.
  useEffect(() => {
    if (!source) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = source.width;
    canvas.height = source.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    setRendering(true);
    const handle = requestAnimationFrame(() => {
      renderHalftone(ctx, source, options);
      setRendering(false);
    });
    return () => cancelAnimationFrame(handle);
  }, [source, options]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) loadFile(file);
    },
    [loadFile],
  );

  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    const base = fileName.replace(/\.[^.]+$/, "") || "halftone";
    link.download = `${base}-halftone.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [fileName]);

  const update = <K extends keyof HalftoneOptions>(
    key: K,
    value: HalftoneOptions[K],
  ) => setOptions((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="app">
      <header className="app__header">
        <div className="brand">
          <span className="brand__mark" aria-hidden="true" />
          <div>
            <h1>Halftone Converter Pro</h1>
            <p>Turn any image into classic print-style halftone artwork.</p>
          </div>
        </div>
        <button className="btn btn--primary" onClick={download} disabled={!source}>
          Download PNG
        </button>
      </header>

      <main className="layout">
        <section
          className={`stage${dragging ? " stage--drag" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <div className="stage__canvas-wrap">
            <canvas ref={canvasRef} className="stage__canvas" />
            {rendering && <span className="stage__badge">Rendering…</span>}
          </div>
          <p className="stage__hint">
            Drag &amp; drop an image here, or use <strong>Upload image</strong>.
          </p>
        </section>

        <aside className="panel">
          <div className="panel__group">
            <label className="btn btn--ghost file">
              Upload image
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) loadFile(file);
                }}
              />
            </label>
            <button
              className="btn btn--ghost"
              onClick={() => {
                const sample = createSampleImage();
                loadFromElement(sample, sample.width, sample.height, "sample");
              }}
            >
              Load sample
            </button>
          </div>

          <div className="panel__group">
            <span className="panel__label">Color mode</span>
            <div className="segmented">
              {(["mono", "cmyk"] as HalftoneMode[]).map((m) => (
                <button
                  key={m}
                  className={`segmented__btn${
                    options.mode === m ? " is-active" : ""
                  }`}
                  onClick={() => update("mode", m)}
                >
                  {m === "mono" ? "Monochrome" : "CMYK color"}
                </button>
              ))}
            </div>
          </div>

          <div className="panel__group">
            <span className="panel__label">Dot shape</span>
            <div className="segmented">
              {(["circle", "square", "diamond"] as DotShape[]).map((s) => (
                <button
                  key={s}
                  className={`segmented__btn${
                    options.shape === s ? " is-active" : ""
                  }`}
                  onClick={() => update("shape", s)}
                >
                  {s[0].toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <Slider
            label="Dot size"
            value={options.cellSize}
            min={3}
            max={30}
            step={1}
            suffix="px"
            onChange={(v) => update("cellSize", v)}
          />

          {options.mode === "mono" && (
            <Slider
              label="Screen angle"
              value={options.angle}
              min={0}
              max={90}
              step={1}
              suffix="°"
              onChange={(v) => update("angle", v)}
            />
          )}

          <Slider
            label="Contrast"
            value={Math.round(options.contrast * 100)}
            min={-80}
            max={80}
            step={1}
            suffix="%"
            onChange={(v) => update("contrast", v / 100)}
          />

          {options.mode === "mono" && (
            <div className="panel__group panel__group--colors">
              <ColorField
                label="Ink"
                value={options.foreground}
                onChange={(v) => update("foreground", v)}
              />
              <ColorField
                label="Paper"
                value={options.background}
                onChange={(v) => update("background", v)}
              />
            </div>
          )}

          <label className="toggle">
            <input
              type="checkbox"
              checked={options.invert}
              onChange={(e) => update("invert", e.target.checked)}
            />
            <span>Invert tones</span>
          </label>

          <button
            className="btn btn--ghost"
            onClick={() => setOptions(DEFAULT_OPTIONS)}
          >
            Reset settings
          </button>
        </aside>
      </main>
    </div>
  );
}

function Slider(props: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  suffix?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="field">
      <div className="field__head">
        <span className="panel__label">{props.label}</span>
        <span className="field__value">
          {props.value}
          {props.suffix}
        </span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </div>
  );
}

function ColorField(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="color-field">
      <span className="panel__label">{props.label}</span>
      <input
        type="color"
        value={props.value}
        onChange={(e) => props.onChange(e.target.value)}
      />
    </label>
  );
}
