/**
 * Compiler: Motion IR (Score) → one self-contained deterministic HTML page.
 *
 * Determinism obligations (ADR-0002): stable element IDs, one paused master
 * GSAP timeline driven only via seek, inline fonts (no network), seeded
 * randomness, no wall-clock reads, no CSS animations/transitions.
 *
 * The page contract (mirrors the seek protocol HyperFrames converged on):
 *   window.__chitra = {
 *     durationMs, fps, width, height,
 *     seek(ms),                    // deterministic paint for time ms
 *     ready(),                     // resolves when fonts+layout settled
 *     textRegions(),               // visible text boxes for contrast gates
 *   }
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import type { AnimationT, SceneT, ScoreT, ElementT } from "../ir/schema.js";
import {
  CHOREOGRAPHY,
  DURATIONS,
  EASINGS,
  PRESETS,
  TYPE_SCALE,
  type DurationToken,
  type EasingToken,
  type PresetName,
} from "../motion/tokens.js";

const require_ = createRequire(import.meta.url);

// ── Assets inlined at compile time ─────────────────────────────────────────
function gsapSource(): string {
  return readFileSync(require_.resolve("gsap/dist/gsap.min.js"), "utf8");
}

const FONT_FILES: Record<string, { pkg: string; file: string; weights: number[] }> = {
  Inter: { pkg: "@fontsource/inter", file: "inter-latin-{w}-normal.woff2", weights: [400, 500, 600] },
  "Space Grotesk": { pkg: "@fontsource/space-grotesk", file: "space-grotesk-latin-{w}-normal.woff2", weights: [400, 500, 700] },
  "Instrument Serif": { pkg: "@fontsource/instrument-serif", file: "instrument-serif-latin-{w}-normal.woff2", weights: [400] },
  "JetBrains Mono": { pkg: "@fontsource/jetbrains-mono", file: "jetbrains-mono-latin-{w}-normal.woff2", weights: [400, 500] },
};

function fontFaces(families: string[]): string {
  const seen = new Set<string>();
  let css = "";
  for (const fam of families) {
    if (seen.has(fam)) continue;
    seen.add(fam);
    const spec = FONT_FILES[fam];
    if (!spec) throw new Error(`No bundled font for family "${fam}"`);
    const pkgDir = path.dirname(require_.resolve(`${spec.pkg}/package.json`));
    for (const w of spec.weights) {
      const file = path.join(pkgDir, "files", spec.file.replace("{w}", String(w)));
      const b64 = readFileSync(file).toString("base64");
      css += `@font-face{font-family:'${fam}';font-style:normal;font-weight:${w};src:url(data:font/woff2;base64,${b64}) format('woff2');}\n`;
    }
  }
  return css;
}

// ── Timing resolution ──────────────────────────────────────────────────────
export interface ResolvedAnim {
  anim: AnimationT;
  startMs: number; // relative to scene start
  durationMs: number;
  ease: string;
}

export function resolveSceneTimeline(scene: SceneT): ResolvedAnim[] {
  const byId = new Map<string, ResolvedAnim>();
  const out: ResolvedAnim[] = [];
  for (const anim of scene.choreography) {
    const preset = PRESETS[anim.preset as PresetName];
    const durationMs =
      anim.override?.durationMs ??
      DURATIONS[(anim.duration ?? preset.defaultDuration) as DurationToken];
    const ease =
      anim.override?.gsapEase ??
      EASINGS[(anim.easing ?? preset.defaultEasing) as EasingToken];
    let base = 0;
    if (anim.at.after !== "scene-start") {
      const dep = byId.get(anim.at.after);
      if (!dep) throw new Error(`Scene "${scene.id}": animation "${anim.id}" waits on unknown animation "${anim.at.after}"`);
      base = dep.startMs + dep.durationMs;
    }
    const resolved: ResolvedAnim = { anim, startMs: base + anim.at.offsetMs, durationMs, ease };
    byId.set(anim.id, resolved);
    out.push(resolved);
  }
  return out;
}

export function totalDurationMs(score: ScoreT): number {
  return score.scenes.reduce((s, sc) => s + sc.durationMs, 0);
}

// ── Rendering helpers ──────────────────────────────────────────────────────
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

type Palette = ScoreT["style"]["palette"];

function colorOf(palette: Palette, key: string): string {
  const map: Record<string, string> = {
    bg: palette.bg,
    surface: palette.surface,
    primary: palette.primary,
    accent: palette.accent,
    text: palette.text,
    "text-dim": palette.textDim,
    textDim: palette.textDim,
    "on-media": palette.onMedia,
  };
  return map[key] ?? palette.text;
}

const ANCHOR_DEFAULT_XY: Record<string, [number, number]> = {
  center: [50, 50],
  "top-left": [8, 8],
  top: [50, 8],
  "top-right": [92, 8],
  left: [8, 50],
  right: [92, 50],
  "bottom-left": [8, 88],
  bottom: [50, 88],
  "bottom-right": [92, 88],
};

/**
 * Anchor positioning. Right/bottom anchors MUST use `right`/`bottom` offsets:
 * an absolutely-positioned box computes shrink-to-fit width from its `left`
 * offset to the container edge BEFORE transforms, so `left + translateX(-100%)`
 * squeezes right-anchored text into the right margin (caught by the critique
 * loop on the first score to use anchor:right).
 */
function posStyle(el: { position: { anchor: string; x?: number; y?: number } }): string {
  const a = el.position.anchor;
  const [dx, dy] = ANCHOR_DEFAULT_XY[a];
  const x = el.position.x ?? dx;
  const y = el.position.y ?? dy;
  const xPart = a.includes("right") ? `right:${(100 - x).toFixed(3)}%;` : `left:${x}%;`;
  const yPart = a.includes("bottom") ? `bottom:${(100 - y).toFixed(3)}%;` : `top:${y}%;`;
  const tx = a.includes("left") || a.includes("right") ? "0" : "-50%";
  const ty = a.includes("top") || a.includes("bottom") ? "0" : "-50%";
  return `${xPart}${yPart}transform:translate(${tx},${ty});`;
}

function formatStat(value: number, format: string, decimals: number): string {
  switch (format) {
    case "percent":
      return `${value.toFixed(decimals)}%`;
    case "compact":
      return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: decimals }).format(value);
    case "currency-usd":
      return Intl.NumberFormat("en", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: decimals }).format(value);
    default:
      return Intl.NumberFormat("en", { maximumFractionDigits: decimals }).format(value);
  }
}

/** ADR-0008: whitelist-style sanitizer for figure fragments. Removes script,
 *  event handlers, javascript: URLs, and external references — determinism and
 *  safety over expressiveness. The fragment keeps full HTML/CSS otherwise. */
export function sanitizeFragment(html: string): string {
  return html
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, "")
    .replace(/<(iframe|object|embed|link|meta|base|form)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "")
    .replace(/<(iframe|object|embed|link|meta|base|form)\b[^>]*\/?>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/(src|href|xlink:href)\s*=\s*("|')(?:https?:|\/\/)[^"']*\2/gi, '$1=$2$2')
    .replace(/url\(\s*("|')?(?:https?:|\/\/)[^)]*\)/gi, "none")
    .replace(/javascript:/gi, "");
}

/** Cursor pointer SVG — theme-aware fill, macOS-weight silhouette. */
function cursorSvg(variant: string, sizePx: number): string {
  const arrow = `<path d="M5 3 L5 21 L9.6 16.6 L12.4 23 L15.2 21.8 L12.4 15.4 L19 15.4 Z" fill="#fff" stroke="#1a1a1a" stroke-width="1.4" stroke-linejoin="round"/>`;
  const hand = `<path d="M9 11 V5.5 a1.5 1.5 0 0 1 3 0 V10 m0-2.5 a1.5 1.5 0 0 1 3 0 V10 m0-1 a1.5 1.5 0 0 1 3 0 V11 m0 0 a1.5 1.5 0 0 1 3 0 v4 c0 4-2.5 7-6.5 7 h-1 c-2.5 0-4-1-5.2-3 L6 15.5 a1.6 1.6 0 0 1 2.6-1.8 L9 14.5 Z" fill="#fff" stroke="#1a1a1a" stroke-width="1.4" stroke-linejoin="round"/>`;
  return `<svg width="${sizePx}" height="${sizePx}" viewBox="0 0 24 24" style="filter:drop-shadow(0 2px 6px rgba(0,0,0,0.35));display:block;">${variant === "hand" ? hand : arrow}</svg>`;
}

function renderElement(el: ElementT, score: ScoreT, scale: number, sceneId: string, projectDir: string): string {
  const p = score.style.palette;
  const wrap = (inner: string, extra = "") =>
    `<div class="pos" style="${posStyle(el as never)}${extra}"><div class="el" id="${sceneId}--${el.id}">${inner}</div></div>`;

  switch (el.type) {
    case "text": {
      const sizePx = Math.round(TYPE_SCALE[el.textRole as keyof typeof TYPE_SCALE] * scale);
      const fam = el.textRole === "display" || el.textRole === "headline" || el.textRole === "title"
        ? score.style.fonts.display
        : score.style.fonts.text;
      const weight = el.textRole === "kicker" ? 600 : el.textRole === "display" || el.textRole === "headline" ? score.style.displayWeight : score.style.textWeight;
      const tracking = el.textRole === "kicker" ? "0.14em" : el.textRole === "display" || el.textRole === "headline" ? `${score.style.trackingDisplay}em` : "0";
      const transform = el.textRole === "kicker" ? "text-transform:uppercase;" : "";
      const maxW = el.maxWidth ? `max-width:${el.maxWidth * (score.meta.width / 100)}px;` : "";
      const lh = el.textRole === "body" || el.textRole === "caption" ? 1.5 : 1.08;
      // ADR-0008 type-in: split into char spans + caret when targeted by the preset
      const scene = score.scenes.find((s) => s.id === sceneId);
      const typed = scene?.choreography.some((a) => a.preset === "type-in" && a.target === el.id);
      if (typed) {
        const chars = [...el.content]
          .map((c) => `<span class="ch" style="display:inline-block;max-width:0;overflow:hidden;white-space:pre;vertical-align:top;">${c === " " ? "&nbsp;" : esc(c)}</span>`)
          .join("");
        const caretH = Math.round(sizePx * 0.9);
        return wrap(
          `<div class="txt" data-text-role="${el.textRole}" style="font-family:'${fam}';font-weight:${weight};font-size:${sizePx}px;letter-spacing:${tracking};${transform}color:${colorOf(p, el.color)};text-align:${el.align};line-height:${lh};${maxW}white-space:pre-wrap;">${chars}<span class="caret" style="height:${caretH}px;background:${colorOf(p, el.color)};"></span></div>`
        );
      }
      return wrap(
        `<div class="txt" data-text-role="${el.textRole}" style="font-family:'${fam}';font-weight:${weight};font-size:${sizePx}px;letter-spacing:${tracking};${transform}color:${colorOf(p, el.color)};text-align:${el.align};line-height:${lh};${maxW}white-space:pre-wrap;">${esc(el.content)}</div>`
      );
    }
    case "shape": {
      const w = (el.width * score.meta.width) / 100;
      const h = el.shape === "line" ? Math.max(2, 2 * scale) : (el.height * score.meta.height) / 100;
      const r = el.shape === "circle" ? "50%" : `${(el.radius * Math.min(score.meta.width, score.meta.height)) / 100}px`;
      const bgStyle =
        el.shape === "gradient-field"
          ? // centered ellipse fading fully inside the box — off-center ellipses
            // paint hard rectangle edges that read as compositing seams
            `background:radial-gradient(ellipse at 50% 50%, ${colorOf(p, el.color)} 0%, transparent 68%);`
          : `background:${colorOf(p, el.color)};`;
      return wrap(`<div style="width:${w}px;height:${h}px;border-radius:${r};${bgStyle}opacity:${el.opacity};"></div>`);
    }
    case "image": {
      const w = (el.width * score.meta.width) / 100;
      const h = (el.height * score.meta.height) / 100;
      const r = `${(el.radius * Math.min(score.meta.width, score.meta.height)) / 100}px`;
      const scrim = el.scrim > 0 ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,${el.scrim});border-radius:${r};"></div>` : "";
      return wrap(
        `<div style="position:relative;width:${w}px;height:${h}px;border-radius:${r};overflow:hidden;"><img src="${esc(el.src)}" style="width:100%;height:100%;object-fit:${el.fit};display:block;"/>${scrim}</div>`
      );
    }
    case "video": {
      // ADR-0007: rendered as a per-frame image swap. The renderer pre-extracts
      // the clip to JPEGs (deterministic; headless <video> seeking is not) and
      // injects the frame directory via __chitra.setMedia; the seek runtime
      // swaps src and awaits decode before any capture.
      const w = (el.width * score.meta.width) / 100;
      const h = (el.height * score.meta.height) / 100;
      const r = `${(el.radius * Math.min(score.meta.width, score.meta.height)) / 100}px`;
      const scrim = el.scrim > 0 ? `<div style="position:absolute;inset:0;background:rgba(0,0,0,${el.scrim});border-radius:${r};"></div>` : "";
      return wrap(
        `<div style="position:relative;width:${w}px;height:${h}px;border-radius:${r};overflow:hidden;background:#000;"><img class="chitra-vid" data-vid="${esc(sceneId)}--${esc(el.id)}" style="width:100%;height:100%;object-fit:${el.fit};display:block;"/>${scrim}</div>`
      );
    }
    case "figure": {
      const w = (el.width * score.meta.width) / 100;
      const h = (el.height * score.meta.height) / 100;
      const r = `${(el.radius * Math.min(score.meta.width, score.meta.height)) / 100}px`;
      const file = path.resolve(projectDir, el.src);
      if (!existsSync(file)) throw new Error(`figure fragment not found: ${el.src} (resolved to ${file})`);
      const fragment = sanitizeFragment(readFileSync(file, "utf8"));
      const shadow = el.shadow ? `box-shadow:0 ${18 * scale}px ${60 * scale}px rgba(0,0,0,0.45);` : "";
      // Token bridge: fragments style themselves ONLY through these variables.
      const vars =
        `--bg:${p.bg};--surface:${p.surface};--primary:${p.primary};--accent:${p.accent};` +
        `--text:${p.text};--text-dim:${p.textDim};--on-media:${p.onMedia};` +
        `--font-display:'${score.style.fonts.display}';--font-text:'${score.style.fonts.text}';--font-mono:'${score.style.fonts.mono}';`;
      return wrap(
        `<div class="figure" style="position:relative;width:${w}px;height:${h}px;border-radius:${r};overflow:hidden;${shadow}${vars}">${fragment}</div>`
      );
    }
    case "cursor": {
      const sizePx = Math.round(28 * scale * el.scale);
      // Cursor coordinates mean the pointer TIP (the OS hot-spot), not the box
      // center — the arrow's tip sits at ~21%,12.5% of its viewBox, so the
      // wrapper translate overrides the anchor transform to pin it there.
      return wrap(
        `<div style="position:relative;">${cursorSvg(el.variant, sizePx)}<div class="click-ring" style="width:${sizePx * 1.6}px;height:${sizePx * 1.6}px;left:${-sizePx * 0.22}px;top:${-sizePx * 0.22}px;"></div></div>`,
        "z-index:90;transform:translate(-21%,-12.5%);"
      );
    }
    case "stat": {
      const sizePx = Math.round(TYPE_SCALE.display * scale);
      const labelPx = Math.round(TYPE_SCALE.kicker * scale);
      const label = el.label
        ? `<div class="txt" data-text-role="kicker" style="font-family:'${score.style.fonts.text}';font-weight:600;font-size:${labelPx}px;letter-spacing:0.14em;text-transform:uppercase;color:${p.textDim};margin-top:${12 * scale}px;text-align:center;">${esc(el.label)}</div>`
        : "";
      return wrap(
        `<div class="stat-num txt" data-text-role="display" data-value="${el.value}" data-format="${el.format}" data-decimals="${el.decimals}" style="font-family:'${score.style.fonts.display}';font-weight:${score.style.displayWeight};font-size:${sizePx}px;letter-spacing:${score.style.trackingDisplay}em;color:${colorOf(p, el.color)};text-align:center;font-variant-numeric:tabular-nums;">${formatStat(el.value, el.format, el.decimals)}</div>${label}`
      );
    }
    case "chart-bar": {
      const w = (el.width * score.meta.width) / 100;
      const h = (el.height * score.meta.height) / 100;
      const max = Math.max(...el.series.map((s) => s.value));
      const n = el.series.length;
      const gap = w * 0.04;
      const barW = (w - gap * (n - 1)) / n;
      const labelPx = Math.round(TYPE_SCALE.caption * scale * 0.9);
      const labelH = labelPx * 1.8;
      const plotH = h - labelH;
      let bars = "";
      el.series.forEach((s, i) => {
        const bh = (s.value / max) * plotH;
        const x = i * (barW + gap);
        // non-highlight bars: dim but legible on both bg and surface backgrounds
        const fill = i === el.highlight ? p.accent : p.textDim;
        const fillOpacity = i === el.highlight ? "1" : "0.28";
        bars += `<g><rect class="bar" id="${sceneId}--${el.id}-bar-${i}" x="${x.toFixed(2)}" y="${(plotH - bh).toFixed(2)}" width="${barW.toFixed(2)}" height="${bh.toFixed(2)}" rx="${Math.min(6, barW / 6).toFixed(2)}" fill="${fill}" fill-opacity="${fillOpacity}" style="transform-origin:${(x + barW / 2).toFixed(2)}px ${plotH.toFixed(2)}px;"/><text x="${(x + barW / 2).toFixed(2)}" y="${(plotH + labelPx * 1.3).toFixed(2)}" text-anchor="middle" font-family="${score.style.fonts.text}" font-size="${labelPx}" fill="${p.textDim}">${esc(s.label)}</text></g>`;
      });
      return wrap(`<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${bars}</svg>`);
    }
  }
}

// ── Choreography → GSAP tween specs (serialized into the page) ────────────
interface TweenSpec {
  targets: string; // CSS selector
  vars: Record<string, unknown>;
  from?: Record<string, unknown>;
  atMs: number; // absolute time on master timeline
  durationMs: number;
  ease: string;
  stagger?: { each: number; from: string };
  kind: string;
}

function presetTweens(
  r: ResolvedAnim,
  scene: SceneT,
  sceneStartMs: number,
  score: ScoreT
): TweenSpec[] {
  const { anim, startMs, durationMs, ease } = r;
  const scale = Math.min(score.meta.width, score.meta.height) / 1080;
  const dist = (anim.distance ?? 4) * (score.meta.height / 100);
  const dir = anim.direction ?? "up";
  const dx = dir === "left" ? -dist : dir === "right" ? dist : 0;
  const dy = dir === "up" ? dist : dir === "down" ? -dist : 0; // enters travel opposite
  const isChart = scene.elements.some((e) => e.id === anim.target && e.type === "chart-bar");
  const sel = isChart
    ? `#${scene.id}--${anim.target} .bar`
    : anim.target.includes("/")
      ? `#${scene.id}--${anim.target.split("/")[0]} #${anim.target.split("/")[1]}` // figure internals (ADR-0008)
      : anim.target.endsWith("*")
        ? `[id^="${scene.id}--${anim.target.slice(0, -1)}"].el, [id^="${scene.id}--${anim.target.slice(0, -1)}"]`
        : `#${scene.id}--${anim.target}`;
  const at = sceneStartMs + startMs;
  const stg = anim.stagger ? { each: anim.stagger.eachMs / 1000, from: anim.stagger.from } : undefined;
  const base = { targets: sel, atMs: at, durationMs, ease, stagger: stg, kind: PRESETS[anim.preset as PresetName].kind };

  switch (anim.preset as PresetName) {
    case "fade-in":
      return [{ ...base, from: { autoAlpha: 0 }, vars: { autoAlpha: 1 } }];
    case "fade-up":
      return [{ ...base, from: { autoAlpha: 0, x: dx, y: dy }, vars: { autoAlpha: 1, x: 0, y: 0 } }];
    case "slide-in":
      return [{ ...base, from: { autoAlpha: 0, x: dx || -dist, y: dy }, vars: { autoAlpha: 1, x: 0, y: 0 } }];
    case "scale-settle":
      if (isChart)
        // bars grow from their baseline (transform-origin is set per bar)
        return [{ ...base, from: { scaleY: 0 }, vars: { scaleY: 1 } }];
      return [{ ...base, from: { autoAlpha: 0, scale: 0.9 }, vars: { autoAlpha: 1, scale: 1 } }];
    case "wipe-reveal":
      return [{ ...base, from: { clipPath: "inset(0% 100% 0% 0%)" }, vars: { clipPath: "inset(0% 0% 0% 0%)" } }];
    case "line-reveal":
      return [
        { ...base, from: { clipPath: "inset(0% 0% 100% 0%)", y: dist * 0.4 }, vars: { clipPath: "inset(0% 0% -10% 0%)", y: 0 } },
      ];
    case "blur-focus":
      return [{ ...base, from: { autoAlpha: 0, filter: `blur(${12 * scale}px)` }, vars: { autoAlpha: 1, filter: "blur(0px)" } }];
    case "count-up":
      return [{ ...base, vars: { __countUp: true } }];
    case "draw-line":
      return [{ ...base, from: { scaleX: 0, transformOrigin: "left center" }, vars: { scaleX: 1 } }];
    case "drift":
      return [{ ...base, from: { x: -dx || 0, y: -dy || 0 }, vars: { x: dx || 0, y: dy || 0 } }];
    case "scale-drift":
      return [{ ...base, from: { scale: 1 }, vars: { scale: 1.06 } }];
    case "cursor-move": {
      // Waypoints in stage units → px offsets from the cursor's authored position
      const cur = scene.elements.find((e) => e.id === anim.target);
      const bx = cur?.position?.x ?? 50;
      const by = cur?.position?.y ?? 50;
      const pts = (anim.waypoints ?? []).map((w) => ({
        x: ((w.x - bx) / 100) * score.meta.width,
        y: ((w.y - by) / 100) * score.meta.height,
      }));
      return [{ ...base, vars: { keyframes: pts.map((pt) => ({ x: pt.x, y: pt.y })) } }];
    }
    case "cursor-click":
      return [
        { ...base, vars: { keyframes: [{ scale: 0.82 }, { scale: 1 }] } },
        {
          ...base,
          targets: `${sel} .click-ring`,
          from: { autoAlpha: 0.75, scale: 0.2 },
          vars: { autoAlpha: 0, scale: 1 },
        },
      ];
    case "type-in": {
      const target = scene.elements.find((e) => e.id === anim.target);
      const n = target && target.type === "text" ? Math.max([...target.content].length, 1) : 1;
      return [
        // chars appear discretely at a fixed cadence — typing, not fading
        { ...base, targets: `${sel} .ch`, from: { maxWidth: 0 }, vars: { maxWidth: "1.2em", duration: 0.001, ease: "none" }, stagger: { each: durationMs / n / 1000, from: "start" } },
        // caret: visible during the reveal, blinks, then exits
        { ...base, targets: `${sel} .caret`, from: { autoAlpha: 0 }, vars: { keyframes: [{ autoAlpha: 1 }, { autoAlpha: 1 }, { autoAlpha: 0.15 }, { autoAlpha: 1 }, { autoAlpha: 0.15 }, { autoAlpha: 1 }, { autoAlpha: 0 }] } },
      ];
    }
    case "pulse":
      return [{ ...base, vars: { keyframes: [{ scale: 0.94 }, { scale: 1 }] } }];
    case "hide":
      // Instant, invisible state declaration — used to carry figure-internal
      // end-states across match cuts (IR-FIG-1). Not a visible exit.
      // At scene-start it must hold from timeline build (immediateRender):
      // transitions reveal the next scene EARLY, under the outgoing scene's
      // fade — a start-scheduled hide would ghost for the fade duration.
      if (startMs === 0)
        return [{ ...base, durationMs: 1, from: { autoAlpha: 0 }, vars: { autoAlpha: 0, duration: 0.001, ease: "none" } }];
      return [{ ...base, durationMs: 1, vars: { autoAlpha: 0, duration: 0.001, ease: "none" } }];
    case "fade-out":
      return [{ ...base, vars: { autoAlpha: 0 } }];
    case "fade-down-out":
      return [{ ...base, vars: { autoAlpha: 0, y: dist * 0.6 } }];
    case "scale-out":
      return [{ ...base, vars: { autoAlpha: 0, scale: 0.96 } }];
  }
}

// ── Static text-over-media map (for contrast gate) ────────────────────────
function textOverMedia(scene: SceneT): Set<string> {
  const over = new Set<string>();
  const hasBgImage = scene.background === "image";
  const mediaIds = scene.elements.filter((e) => e.type === "image" || e.type === "video").map((e) => e.id);
  for (const el of scene.elements) {
    if (el.type !== "text" && el.type !== "stat") continue;
    if (hasBgImage || mediaIds.length > 0) over.add(el.id); // v0 conservative: any media in scene
  }
  return over;
}

// ── Main entry ─────────────────────────────────────────────────────────────
export interface CompileResult {
  html: string;
  durationMs: number;
  fps: number;
  width: number;
  height: number;
  sceneBoundsMs: Array<{ id: string; startMs: number; endMs: number }>;
}

export function compile(score: ScoreT, projectDir = "."): CompileResult {
  const { width, height, fps } = score.meta;
  const scale = Math.min(width, height) / 1080;
  const p = score.style.palette;
  const durationMs = totalDurationMs(score);

  // Scene DOM + tween specs
  let scenesHtml = "";
  const tweens: TweenSpec[] = [];
  const sceneBoundsMs: CompileResult["sceneBoundsMs"] = [];
  const textMeta: Array<{ sel: string; sceneId: string; color: string; overMedia: boolean }> = [];
  let cursor = 0;

  for (const scene of score.scenes) {
    const bg =
      scene.background === "image" && scene.backgroundImage
        ? `background:${p.bg} url('${esc(scene.backgroundImage)}') center/cover no-repeat;`
        : `background:${colorOf(p, scene.background)};`;
    const els = scene.elements.map((el) => renderElement(el, score, scale, scene.id, projectDir)).join("\n");
    scenesHtml += `<div class="scene" id="scene-${scene.id}" style="${bg}">${els}</div>\n`;

    const overMedia = textOverMedia(scene);
    for (const el of scene.elements) {
      if (el.type === "text" || el.type === "stat") {
        textMeta.push({
          sel: `#${scene.id}--${el.id}`,
          sceneId: scene.id,
          color: colorOf(p, (el as { color?: string }).color ?? "text"),
          overMedia: overMedia.has(el.id),
        });
      }
    }

    const resolved = resolveSceneTimeline(scene);
    // Elements with an enter animation start hidden; compiler sets initial state.
    for (const r of resolved) tweens.push(...presetTweens(r, scene, cursor, score));

    sceneBoundsMs.push({ id: scene.id, startMs: cursor, endMs: cursor + scene.durationMs });
    cursor += scene.durationMs;
  }

  // Scene visibility + transitions on the master timeline.
  // Non-cut transitions overlap: the incoming scene becomes visible when the
  // transition starts and the outgoing scene (z-lifted above it) animates away.
  // fade-through-black instead drives a dedicated #blackout layer whose
  // fade-out extends into the incoming scene's first frames.
  const sceneCues: Array<Record<string, unknown>> = [];
  const setCues: Array<{ sel: string; vars: Record<string, unknown>; atMs: number }> = [];
  for (let i = 0; i < score.scenes.length; i++) {
    const sc = score.scenes[i];
    const b = sceneBoundsMs[i];
    const prevTr = i > 0 ? score.scenes[i - 1].transitionOut : null;
    const overlapMs =
      prevTr && (prevTr.type === "fade" || prevTr.type === "wipe" || prevTr.type === "push")
        ? DURATIONS[prevTr.duration as DurationToken]
        : 0;
    sceneCues.push({ sel: `#scene-${sc.id}`, showMs: b.startMs - overlapMs, hideMs: b.endMs, index: i });

    const tr = sc.transitionOut;
    if (tr.type !== "cut" && i < score.scenes.length - 1) {
      const trMs = DURATIONS[tr.duration as DurationToken];
      const start = b.endMs - trMs;
      if (tr.type === "fade-through-black") {
        tweens.push({ targets: "#blackout", from: {}, vars: { opacity: 1 }, atMs: start, durationMs: trMs, ease: EASINGS["move-through"], kind: "transition" });
        tweens.push({ targets: "#blackout", from: {}, vars: { opacity: 0 }, atMs: b.endMs, durationMs: trMs, ease: EASINGS["move-through"], kind: "transition" });
      } else {
        // Outgoing scene sits above the (already visible) incoming scene.
        setCues.push({ sel: `#scene-${sc.id}`, vars: { zIndex: 2 }, atMs: start });
        if (tr.type === "fade") {
          tweens.push({ targets: `#scene-${sc.id}`, from: {}, vars: { opacity: 0 }, atMs: start, durationMs: trMs, ease: EASINGS["move-through"], kind: "transition" });
        } else if (tr.type === "wipe") {
          tweens.push({ targets: `#scene-${sc.id}`, from: {}, vars: { clipPath: "inset(0% 100% 0% 0%)" }, atMs: start, durationMs: trMs, ease: EASINGS["move-through"], kind: "transition" });
        } else if (tr.type === "push") {
          tweens.push({ targets: `#scene-${sc.id}`, from: {}, vars: { xPercent: -100 }, atMs: start, durationMs: trMs, ease: EASINGS["move-through"], kind: "transition" });
        }
      }
    }
  }

  const grain =
    score.style.grain > 0
      ? `<svg class="grain" width="100%" height="100%"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${score.meta.seed}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter><rect width="100%" height="100%" filter="url(#g)" opacity="${score.style.grain}"/></svg>`
      : "";

  const fonts = fontFaces([
    score.style.fonts.display,
    score.style.fonts.text,
    score.style.fonts.mono,
  ]);

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${esc(score.meta.title)}</title>
<style>
${fonts}
*{margin:0;padding:0;box-sizing:border-box;animation:none!important;transition:none!important;}
html,body{background:#000;}
#stage{position:relative;width:${width}px;height:${height}px;overflow:hidden;background:${p.bg};}
.scene{position:absolute;inset:0;visibility:hidden;}
.pos{position:absolute;}
.el{will-change:transform,opacity;}
#blackout{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:95;}
.grain{position:absolute;inset:0;pointer-events:none;z-index:99;}
.click-ring{position:absolute;border-radius:50%;border:2.5px solid #fff;opacity:0;box-shadow:0 0 12px rgba(255,255,255,0.35);}
.caret{display:inline-block;width:0.09em;margin-left:0.06em;vertical-align:-0.12em;opacity:0;}
.figure{font-family:var(--font-text);color:var(--text);}
</style></head>
<body>
<div id="stage">
${scenesHtml}<div id="blackout"></div>${grain}
</div>
<script>${gsapSource()}</script>
<script>
"use strict";
var SPECS = ${JSON.stringify(tweens)};
var CUES = ${JSON.stringify(sceneCues)};
var SETCUES = ${JSON.stringify(setCues)};
var TEXTMETA = ${JSON.stringify(textMeta)};
var DURATION_MS = ${durationMs};

function fmtStat(v, format, decimals) {
  var o = { maximumFractionDigits: decimals };
  if (format === "percent") return v.toFixed(decimals) + "%";
  if (format === "compact") o.notation = "compact";
  if (format === "currency-usd") { o.notation = "compact"; o.style = "currency"; o.currency = "USD"; }
  return new Intl.NumberFormat("en", o).format(v);
}

gsap.config({ autoSleep: 999999, force3D: true, nullTargetWarn: true });
gsap.ticker.lagSmoothing(0);
var tl = gsap.timeline({ paused: true });

// Scene visibility cues (set() = zero-duration, deterministic at boundaries)
CUES.forEach(function (c) {
  if (c.index === 0 || c.showMs <= 0) gsap.set(c.sel, { visibility: "visible" });
  else tl.set(c.sel, { visibility: "visible" }, c.showMs / 1000);
  if (c.hideMs < DURATION_MS) tl.set(c.sel, { visibility: "hidden" }, c.hideMs / 1000);
});
SETCUES.forEach(function (c) { tl.set(c.sel, c.vars, c.atMs / 1000); });

var MISSING = [];
SPECS.forEach(function (s) {
  var targets = gsap.utils.toArray(s.targets);
  if (!targets.length) { MISSING.push(s.targets); return; }
  var vars = { duration: s.durationMs / 1000, ease: s.ease, lazy: false };
  if (s.stagger) vars.stagger = { each: s.stagger.each, from: s.stagger.from };
  if (s.vars.__countUp) {
    targets.forEach(function (el) {
      var end = parseFloat(el.getAttribute("data-value"));
      var format = el.getAttribute("data-format");
      var dec = parseInt(el.getAttribute("data-decimals"), 10);
      var proxy = { v: 0 };
      tl.to(proxy, { v: end, duration: s.durationMs / 1000, ease: s.ease, lazy: false,
        onUpdate: function () { el.textContent = fmtStat(proxy.v, format, dec); } }, s.atMs / 1000);
      el.textContent = fmtStat(0, format, dec);
    });
    return;
  }
  for (var k in s.vars) vars[k] = s.vars[k];
  if (s.from && Object.keys(s.from).length) {
    vars.immediateRender = true;
    var fromVars = { immediateRender: true, lazy: false };
    for (var k2 in s.from) fromVars[k2] = s.from[k2];
    tl.fromTo(targets, fromVars, vars, s.atMs / 1000);
  } else {
    tl.to(targets, vars, s.atMs / 1000);
  }
});

// Force initial state paint
tl.time(0, false); tl.pause(0);

// ADR-0007: video elements as frame swaps. VIDMETA carries scene-local timing;
// setMedia() (called by the renderer after pre-extraction) supplies frame dirs.
var VIDMETA = ${JSON.stringify(
      score.scenes.flatMap((scene) => {
        let acc = 0;
        for (const s of score.scenes) {
          if (s.id === scene.id) break;
          acc += s.durationMs;
        }
        return scene.elements
          .filter((e) => e.type === "video")
          .map((e) => ({ key: `${scene.id}--${e.id}`, sceneStartMs: acc, sceneEndMs: acc + scene.durationMs }));
      })
    )};
var MEDIA = {};
function pad5(n) { return ("0000" + n).slice(-5); }

window.__chitra = {
  durationMs: DURATION_MS,
  fps: ${fps},
  width: ${width},
  height: ${height},
  missingTargets: MISSING,
  setMedia: function (map) { MEDIA = map || {}; },
  seek: function (ms) {
    tl.time(Math.min(ms, DURATION_MS - 0.001) / 1000, false);
    var waits = [];
    VIDMETA.forEach(function (v) {
      var m = MEDIA[v.key];
      var img = document.querySelector('img[data-vid="' + v.key + '"]');
      if (!m || !img) return;
      var local = Math.min(Math.max(ms - v.sceneStartMs, 0), v.sceneEndMs - v.sceneStartMs);
      var idx = Math.min(Math.floor((local / 1000) * m.fps), m.count - 1);
      var src = m.base + "/f" + pad5(idx + 1) + ".jpg";
      if (img.getAttribute("src") !== src) {
        img.setAttribute("src", src);
        if (img.decode) waits.push(img.decode().catch(function () {}));
      }
    });
    return waits.length ? Promise.all(waits).then(function () { return true; }) : true;
  },
  ready: function () {
    var families = ${JSON.stringify([score.style.fonts.display, score.style.fonts.text])};
    return Promise.all(
      families.map(function (f) { return document.fonts.load("16px '" + f + "'"); })
    ).then(function () {
      return document.fonts.ready;
    }).then(function () {
      // Images must be decoded before any capture — a late-arriving image
      // would make frames depend on load timing.
      return Promise.all(Array.prototype.map.call(document.images, function (img) {
        return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
      }));
    }).then(function () {
      var ok = families.every(function (f) { return document.fonts.check("16px '" + f + "'"); });
      var badImages = Array.prototype.filter.call(document.images, function (img) {
        // chitra-vid frames get src injected by the renderer post-load
        return img.getAttribute("src") && !(img.complete && img.naturalWidth > 0);
      }).map(function (img) { return img.getAttribute("src"); });
      return { fontsOk: ok, missingTargets: MISSING, badImages: badImages };
    });
  },
  textRegions: function () {
    var stage = document.getElementById("stage").getBoundingClientRect();
    return TEXTMETA.map(function (m) {
      var el = document.querySelector(m.sel);
      if (!el) return null;
      var st = getComputedStyle(el);
      var vis = st.visibility !== "hidden" && parseFloat(st.opacity || "1") > 0.05;
      // walk up: scene hidden ⇒ not visible
      var scene = document.getElementById("scene-" + m.sceneId);
      if (scene && getComputedStyle(scene).visibility === "hidden") vis = false;
      var r = el.getBoundingClientRect();
      var inner = el.querySelector(".txt") || el;
      var fs = parseFloat(getComputedStyle(inner).fontSize);
      return { sel: m.sel, scene: m.sceneId, visible: vis, overMedia: m.overMedia, color: m.color,
        fontSizePx: fs, x: r.left - stage.left, y: r.top - stage.top, w: r.width, h: r.height };
    }).filter(Boolean);
  },
};
</script>
</body></html>`;

  return { html, durationMs, fps, width, height, sceneBoundsMs };
}
