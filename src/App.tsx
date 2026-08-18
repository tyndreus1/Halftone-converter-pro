import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_OPTIONS,
  renderHalftone,
  type HalftoneOptions,
  type PatternType,
} from "./lib/halftone";
import { createSampleImage } from "./lib/sample";
import {
  HALFTONE_STYLES,
  PALETTES,
  PRESETS,
  type StylePreset,
} from "./lib/presets";

const MAX_DIMENSION = 900;

function toSource(
  el: CanvasImageSource,
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
  ctx.drawImage(el, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

interface HistoryItem {
  id: number;
  url: string;
  label: string;
  options: HalftoneOptions;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [source, setSource] = useState<ImageData | null>(null);
  const [thumbUrl, setThumbUrl] = useState<string>("");
  const [fileName, setFileName] = useState("sample");
  const [options, setOptions] = useState<HalftoneOptions>(DEFAULT_OPTIONS);
  const [styleId, setStyleId] = useState("retro-wave");
  const [paletteId, setPaletteId] = useState("neon-nights");
  const [presetId, setPresetId] = useState<string | null>(null);
  const [customColors, setCustomColors] = useState<string[]>([
    "#22d3ee",
    "#a855f7",
    "#f472b6",
  ]);
  const [customDraft, setCustomDraft] = useState("#7c3aed");
  const [dragging, setDragging] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [pulse, setPulse] = useState(false);
  const historyId = useRef(0);

  const styleName = useMemo(
    () => HALFTONE_STYLES.find((s) => s.id === styleId)?.name ?? "Custom",
    [styleId],
  );

  const loadFrom = useCallback(
    (el: CanvasImageSource, w: number, h: number, name: string) => {
      const data = toSource(el, w, h);
      if (!data) return;
      setSource(data);
      setFileName(name);
      const c = document.createElement("canvas");
      const s = 84 / Math.max(data.width, data.height);
      c.width = Math.round(data.width * s);
      c.height = Math.round(data.height * s);
      c.getContext("2d")?.putImageData(data, 0, 0);
      const full = document.createElement("canvas");
      full.width = data.width;
      full.height = data.height;
      full.getContext("2d")?.putImageData(data, 0, 0);
      setThumbUrl(full.toDataURL("image/png"));
    },
    [],
  );

  const loadFile = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        loadFrom(img, img.naturalWidth, img.naturalHeight, file.name);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    },
    [loadFrom],
  );

  useEffect(() => {
    const sample = createSampleImage();
    loadFrom(sample, sample.width, sample.height, "sample");
  }, [loadFrom]);

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

  const update = useCallback(
    <K extends keyof HalftoneOptions>(key: K, value: HalftoneOptions[K]) =>
      setOptions((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const applyStyle = useCallback((style: StylePreset) => {
    setStyleId(style.id);
    setPresetId(null);
    if (style.paletteId) setPaletteId(style.paletteId);
    setOptions((prev) => ({ ...prev, ...style.options }));
  }, []);

  const applyPreset = useCallback((preset: StylePreset) => {
    setPresetId(preset.id);
    if (preset.paletteId) setPaletteId(preset.paletteId);
    setOptions((prev) => ({ ...prev, ...preset.options }));
  }, []);

  const selectPalette = useCallback((id: string, colors: string[]) => {
    setPaletteId(id);
    setOptions((prev) => ({ ...prev, palette: colors, mono: false }));
  }, []);

  const addCustomColor = useCallback(() => {
    setCustomColors((prev) => {
      const next = [...prev, customDraft];
      if (paletteId === "custom") {
        setOptions((o) => ({ ...o, palette: next }));
      }
      return next;
    });
  }, [customDraft, paletteId]);

  const removeCustomColor = useCallback(
    (index: number) => {
      setCustomColors((prev) => {
        const next = prev.filter((_, i) => i !== index);
        if (paletteId === "custom" && next.length >= 2) {
          setOptions((o) => ({ ...o, palette: next }));
        }
        return next;
      });
    },
    [paletteId],
  );

  const generate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setPulse(true);
    window.setTimeout(() => setPulse(false), 650);
    const label = presetId
      ? (PRESETS.find((p) => p.id === presetId)?.name ?? styleName)
      : styleName;
    const url = canvas.toDataURL("image/png");
    historyId.current += 1;
    setHistory((prev) =>
      [
        { id: historyId.current, url, label, options: { ...options } },
        ...prev,
      ].slice(0, 6),
    );
  }, [options, presetId, styleName]);

  const download = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    const base = fileName.replace(/\.[^.]+$/, "") || "halftone";
    link.download = `${base}-halftone.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }, [fileName]);

  const customPalette = customColors.length >= 2 ? customColors : ["#22d3ee", "#f472b6"];

  return (
    <div className="hc">
      <TopBar
        onGenerate={generate}
        onExport={download}
        pulse={pulse}
        disabled={!source}
      />

      <div className="hc__body">
        <IconRail />

        <aside className="sidebar">
          <Section title="Halftone Styles">
            <div className="style-grid">
              {HALFTONE_STYLES.map((s) => (
                <button
                  key={s.id}
                  className={`style-card${styleId === s.id ? " is-active" : ""}`}
                  onClick={() => applyStyle(s)}
                  title={s.name}
                >
                  <span
                    className="style-card__thumb"
                    style={{ background: gradientOf(s.preview) }}
                  />
                  <span className="style-card__name">{s.name}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="Color Palette">
            <div className="palette-list">
              {PALETTES.map((p) => (
                <button
                  key={p.id}
                  className={`palette-row${paletteId === p.id ? " is-active" : ""}`}
                  onClick={() => selectPalette(p.id, p.colors)}
                >
                  <span className="palette-row__name">{p.name}</span>
                  <span
                    className="palette-row__bar"
                    style={{ background: gradientOf(p.colors) }}
                  />
                </button>
              ))}
              <button
                className={`palette-row palette-row--custom${
                  paletteId === "custom" ? " is-active" : ""
                }`}
                onClick={() => selectPalette("custom", customPalette)}
              >
                <span className="palette-row__name">Custom</span>
                <span className="palette-row__plus">+</span>
              </button>
            </div>

            <div className="custom-editor">
              <div className="custom-swatches">
                {customColors.map((c, i) => (
                  <button
                    key={`${c}-${i}`}
                    className="swatch"
                    style={{ background: c }}
                    title="Remove color"
                    onClick={() => removeCustomColor(i)}
                  />
                ))}
              </div>
              <div className="custom-add">
                <input
                  type="color"
                  value={customDraft}
                  onChange={(e) => setCustomDraft(e.target.value)}
                  aria-label="Pick a custom color"
                />
                <button className="btn btn--ghost btn--sm" onClick={addCustomColor}>
                  Add color
                </button>
              </div>
            </div>
          </Section>

          <Section title="Input Image">
            <div className="input-image">
              {thumbUrl && <img src={thumbUrl} alt="Input preview" />}
            </div>
            <label className="btn btn--outline file">
              Upload New
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) loadFile(f);
                }}
              />
            </label>
          </Section>

          <Section title="Layers & Effects">
            <EffectToggle
              label="Grain"
              icon="grain"
              active={options.grain}
              onChange={(v) => update("grain", v)}
            />
            <EffectToggle
              label="Glow"
              icon="glow"
              active={options.glow}
              onChange={(v) => update("glow", v)}
            />
            <EffectToggle
              label="Texture"
              icon="texture"
              active={options.texture}
              onChange={(v) => update("texture", v)}
            />
          </Section>
        </aside>

        <main
          className={`stage${dragging ? " stage--drag" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const f = e.dataTransfer.files?.[0];
            if (f) loadFile(f);
          }}
        >
          <p className="stage__title">
            HALFTONE PREVIEW: <span>{styleName}</span>
          </p>
          <div className={`stage__frame${pulse ? " is-pulse" : ""}`}>
            <canvas ref={canvasRef} className="stage__canvas" />
            {rendering && <span className="stage__badge">Rendering…</span>}
          </div>
          <p className="stage__hint">
            Drag &amp; drop an image anywhere here, or use{" "}
            <strong>Upload New</strong>.
          </p>
        </main>

        <aside className="rightbar">
          <Section title="Presets" collapsible>
            <div className="preset-list">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  className={`preset-card${presetId === p.id ? " is-active" : ""}`}
                  onClick={() => applyPreset(p)}
                >
                  <span
                    className="preset-card__thumb"
                    style={{ background: gradientOf(p.preview) }}
                  />
                  <span className="preset-card__name">{p.name}</span>
                </button>
              ))}
            </div>
          </Section>

          <Section title="History" collapsible>
            {history.length === 0 ? (
              <p className="history-empty">
                Press <strong>Generate Halftone</strong> to snapshot a version
                here.
              </p>
            ) : (
              <div className="history-list">
                {history.map((h) => (
                  <button
                    key={h.id}
                    className="history-item"
                    title={`Restore: ${h.label}`}
                    onClick={() => {
                      setOptions(h.options);
                      setPresetId(null);
                    }}
                  >
                    <img src={h.url} alt={h.label} />
                    <span>{h.label}</span>
                  </button>
                ))}
              </div>
            )}
          </Section>
        </aside>
      </div>

      <ControlBar options={options} update={update} />
    </div>
  );
}

function TopBar(props: {
  onGenerate: () => void;
  onExport: () => void;
  pulse: boolean;
  disabled: boolean;
}) {
  const [tab, setTab] = useState("Home");
  const tabs = ["Home", "Projects", "Presets", "Shop", "Export"];
  return (
    <header className="topbar">
      <div className="logo">
        <span className="logo__mark" aria-hidden="true" />
        <span className="logo__text">
          HALFTONE<br />CONVERTER
        </span>
        <span className="logo__pro">PRO</span>
      </div>
      <nav className="nav">
        {tabs.map((t) => (
          <button
            key={t}
            className={`nav__link${tab === t ? " is-active" : ""}`}
            onClick={() => {
              setTab(t);
              if (t === "Export") props.onExport();
            }}
          >
            {t}
          </button>
        ))}
      </nav>
      <div className="topbar__right">
        <button
          className={`btn btn--primary generate${props.pulse ? " is-pulse" : ""}`}
          onClick={props.onGenerate}
          disabled={props.disabled}
        >
          Generate Halftone
        </button>
        <button className="icon-btn" title="Notifications" aria-label="Notifications">
          <BellIcon />
        </button>
        <div className="avatar">
          <span className="avatar__dot" />
          Alex R.
        </div>
      </div>
    </header>
  );
}

function ControlBar(props: {
  options: HalftoneOptions;
  update: <K extends keyof HalftoneOptions>(k: K, v: HalftoneOptions[K]) => void;
}) {
  const { options, update } = props;
  const patterns: { id: PatternType; label: string }[] = [
    { id: "dots", label: "Dots" },
    { id: "lines", label: "Lines" },
    { id: "crosshatch", label: "Crosshatch" },
  ];
  return (
    <footer className="controlbar">
      <div className="control control--pattern">
        <span className="control__label">Pattern Type</span>
        <div className="pattern-seg">
          {patterns.map((p) => (
            <button
              key={p.id}
              className={`pattern-seg__btn${
                options.pattern === p.id ? " is-active" : ""
              }`}
              onClick={() => update("pattern", p.id)}
            >
              <PatternIcon type={p.id} />
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      </div>

      <SliderControl
        label="Dot Size"
        value={options.cellSize}
        display={`${options.cellSize} px`}
        min={3}
        max={30}
        step={1}
        onChange={(v) => update("cellSize", v)}
      />
      <SliderControl
        label="Density"
        value={Math.round(options.density * 100)}
        display={`${Math.round(options.density * 100)}%`}
        min={0}
        max={100}
        step={1}
        onChange={(v) => update("density", v / 100)}
      />
      <SliderControl
        label="Threshold"
        value={Math.round(options.threshold * 100)}
        display={`${Math.round(options.threshold * 100)}%`}
        min={0}
        max={100}
        step={1}
        onChange={(v) => update("threshold", v / 100)}
      />
    </footer>
  );
}

function SliderControl(props: {
  label: string;
  value: number;
  display: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  const pct = ((props.value - props.min) / (props.max - props.min)) * 100;
  return (
    <div className="control control--slider">
      <div className="control__head">
        <span className="control__label">{props.label}</span>
        <span className="control__value">{props.display}</span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        style={{ ["--pct" as string]: `${pct}%` }}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Section(props: {
  title: string;
  collapsible?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="panel-section">
      <button
        className="panel-section__head"
        onClick={() => props.collapsible && setOpen((o) => !o)}
      >
        <span>{props.title}</span>
        {props.collapsible && (
          <span className={`chevron${open ? " is-open" : ""}`}>⌄</span>
        )}
      </button>
      {open && <div className="panel-section__body">{props.children}</div>}
    </section>
  );
}

function EffectToggle(props: {
  label: string;
  icon: "grain" | "glow" | "texture";
  active: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      className={`effect-row${props.active ? " is-active" : ""}`}
      onClick={() => props.onChange(!props.active)}
    >
      <span className="effect-row__icon">
        <EffectIcon icon={props.icon} />
      </span>
      <span className="effect-row__label">{props.label}</span>
      <span className={`switch${props.active ? " is-on" : ""}`}>
        <span className="switch__knob" />
      </span>
    </button>
  );
}

function gradientOf(colors: string[]): string {
  if (colors.length === 1) return colors[0];
  return `linear-gradient(90deg, ${colors.join(", ")})`;
}

function IconRail() {
  return (
    <div className="rail">
      <button className="rail__btn is-active" aria-label="Grid">
        <GridIcon />
      </button>
      <button className="rail__btn" aria-label="Adjust">
        <SlidersIcon />
      </button>
      <button className="rail__btn" aria-label="Brush">
        <BrushIcon />
      </button>
      <button className="rail__btn" aria-label="Notes">
        <NoteIcon />
      </button>
      <button className="rail__btn" aria-label="Settings">
        <GearIcon />
      </button>
      <button className="rail__btn rail__btn--bottom" aria-label="Exit">
        <ExitIcon />
      </button>
    </div>
  );
}

/* ---- inline icons (kept tiny + dependency-free) ---- */
function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" strokeLinejoin="round" />
      <path d="M10.5 20a1.5 1.5 0 0 0 3 0" strokeLinecap="round" />
    </svg>
  );
}
function GridIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function SlidersIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 6h16M4 12h16M4 18h16" />
      <circle cx="9" cy="6" r="2" fill="currentColor" />
      <circle cx="15" cy="12" r="2" fill="currentColor" />
      <circle cx="8" cy="18" r="2" fill="currentColor" />
    </svg>
  );
}
function BrushIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20c3 0 4-2 4-4M8 16 18 6a2 2 0 0 0-3-3L5 13" />
    </svg>
  );
}
function NoteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M8 9h8M8 13h6" strokeLinecap="round" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" strokeLinecap="round" />
    </svg>
  );
}
function ExitIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 12H3m0 0 3-3m-3 3 3 3" />
    </svg>
  );
}
function PatternIcon({ type }: { type: PatternType }) {
  if (type === "dots") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        {[6, 12, 18].map((y) =>
          [6, 12, 18].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />),
        )}
      </svg>
    );
  }
  if (type === "lines") {
    return (
      <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 8h16M4 12h16M4 16h16" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M3 8h18M3 13h18M8 3v18M13 3v18" />
    </svg>
  );
}
function EffectIcon({ icon }: { icon: "grain" | "glow" | "texture" }) {
  if (icon === "grain") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
        {[5, 10, 15, 19].map((x, i) =>
          [6, 11, 16, 20].map((y, j) =>
            (i + j) % 2 === 0 ? <circle key={`${x}-${y}`} cx={x} cy={y} r="1.1" /> : null,
          ),
        )}
      </svg>
    );
  }
  if (icon === "glow") {
    return (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />
        <path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
