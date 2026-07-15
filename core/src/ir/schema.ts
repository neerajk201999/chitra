/**
 * The Chitra Motion IR — two tiers (ADR-0003).
 * Tier 1 (Direction): intent, written by director agents, read by critics.
 * Tier 2 (Score): deterministic execution, compiled to the render backend.
 * Both are zod-validated; validation IS Quality Engine layer 1 (ADR-0004).
 */
import { z } from "zod";
import {
  DURATIONS,
  EASINGS,
  IR_VERSION,
  PRESETS,
  REGISTERS,
  SAFE_ZONES,
  TRANSITIONS,
  TYPE_SCALE,
} from "../motion/tokens.js";

const id = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, "ids are kebab-case, start with a letter");
const reason = z.string().min(8, "every creative decision carries a real reason");
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "6-digit hex color");

const durationToken = z.enum(Object.keys(DURATIONS) as [string, ...string[]]);
const easingToken = z.enum(Object.keys(EASINGS) as [string, ...string[]]);
const presetName = z.enum(Object.keys(PRESETS) as [string, ...string[]]);
const register = z.enum(Object.keys(REGISTERS) as [string, ...string[]]);
const typeRole = z.enum(Object.keys(TYPE_SCALE) as [string, ...string[]]);
const transition = z.enum(TRANSITIONS);

// ── Tier 1: Direction ──────────────────────────────────────────────────────
export const SceneDirection = z.object({
  id,
  narrativeRole: z.string().min(4), // e.g. "cold open — state the tension"
  shotIntent: z.string().min(8), // what the viewer should feel/notice
  heroMoment: z.string().optional(), // what visually peaks here, if anything
  pacingWeight: z.number().min(0.25).max(3).default(1), // relative hold emphasis
});

export const Direction = z.object({
  irVersion: z.literal(IR_VERSION),
  tier: z.literal("direction"),
  title: z.string().min(1),
  register,
  logline: z.string().min(10),
  narrativeArc: z.string().min(20), // setup → tension → peak → release
  tone: z.array(z.string()).min(1).max(5),
  audience: z.string().min(4),
  scenes: z.array(SceneDirection).min(1),
});
export type DirectionT = z.infer<typeof Direction>;

// ── Tier 2: Score — shared pieces ─────────────────────────────────────────
const Anchor = z.enum([
  "center",
  "top-left",
  "top",
  "top-right",
  "left",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
]);

/** Position on a 100×100 unit stage; anchor defines the reference point. */
const Position = z.object({
  anchor: Anchor.default("center"),
  x: z.number().min(-20).max(120).optional(), // stage units; omit → anchor default
  y: z.number().min(-20).max(120).optional(),
});

const TextElement = z.object({
  type: z.literal("text"),
  id,
  role: z.enum(["hero", "support", "ambient"]).default("support"),
  textRole: typeRole,
  content: z.string().min(1),
  color: z.enum(["text", "text-dim", "primary", "accent", "on-media"]).default("text"),
  maxWidth: z.number().min(10).max(100).optional(), // stage units
  align: z.enum(["left", "center", "right"]).default("center"),
  position: Position.default({ anchor: "center" }),
});

const ShapeElement = z.object({
  type: z.literal("shape"),
  id,
  role: z.enum(["hero", "support", "ambient"]).default("ambient"),
  shape: z.enum(["rect", "line", "circle", "gradient-field"]),
  color: z.enum(["primary", "accent", "surface", "text-dim"]).default("surface"),
  opacity: z.number().min(0).max(1).default(1),
  position: Position.default({ anchor: "center" }),
  width: z.number().min(0).max(140).default(20),
  height: z.number().min(0).max(140).default(20),
  radius: z.number().min(0).max(50).default(0), // corner radius, stage units
});

const ImageElement = z.object({
  type: z.literal("image"),
  id,
  role: z.enum(["hero", "support", "ambient"]).default("support"),
  // Project-relative path only. Remote URLs are forbidden by ADR-0006: the render
  // path never touches the network — acquisition is `chitra fetch`/`chitra snap`.
  src: z
    .string()
    .min(1)
    .refine((s) => !/^[a-z][a-z0-9+.-]*:\/\//i.test(s) && !s.startsWith("/"), {
      message: "image src must be a project-relative path (use `chitra fetch <url>` to download assets first)",
    }),
  fit: z.enum(["cover", "contain"]).default("cover"),
  position: Position.default({ anchor: "center" }),
  width: z.number().min(1).max(140).default(100),
  height: z.number().min(1).max(140).default(100),
  radius: z.number().min(0).max(50).default(0),
  scrim: z.number().min(0).max(0.8).default(0), // darkening overlay for text legibility
});

const VideoElement = z.object({
  type: z.literal("video"),
  id,
  role: z.enum(["hero", "support", "ambient"]).default("hero"),
  // Same hermetic rule as images (ADR-0006/0007): project-relative only.
  src: z
    .string()
    .min(1)
    .refine((s) => !/^[a-z][a-z0-9+.-]*:\/\//i.test(s) && !s.startsWith("/"), {
      message: "video src must be a project-relative path (acquire clips first, e.g. ffmpeg trim of a recording)",
    }),
  startMs: z.number().int().min(0).default(0), // offset into the source clip
  fit: z.enum(["cover", "contain"]).default("cover"),
  position: Position.default({ anchor: "center" }),
  width: z.number().min(1).max(140).default(100),
  height: z.number().min(1).max(140).default(100),
  radius: z.number().min(0).max(50).default(0),
  scrim: z.number().min(0).max(0.8).default(0),
});

/** ADR-0009: deterministic dot-matrix particle field. Authors pick a formation
 *  and behavior preset; dots are never hand-placed. */
const ParticlesElement = z.object({
  type: z.literal("particles"),
  id,
  role: z.enum(["hero", "support", "ambient"]).default("ambient"),
  formation: z.enum(["grid", "ring", "scatter"]).default("grid"),
  color: z.enum(["primary", "accent", "text", "on-media"]).default("accent"),
  cols: z.number().int().min(2).max(24).default(8), // grid columns
  rows: z.number().int().min(2).max(24).default(6), // grid rows
  count: z.number().int().min(4).max(400).default(48), // ring/scatter dot count
  radius: z.number().min(5).max(60).default(20), // ring radius, stage units
  dotSize: z.number().min(1).max(40).default(7), // px at 1080
  seed: z.number().int().min(0).max(99999).default(1),
  position: Position.default({ anchor: "center" }),
  width: z.number().min(5).max(140).default(40),
  height: z.number().min(5).max(140).default(40),
});

/** ADR-0008: agent-authored UI mockup — a sandboxed, token-themed HTML fragment.
 *  Scripts/handlers/external refs are stripped at compile; gates run on its pixels. */
const FigureElement = z.object({
  type: z.literal("figure"),
  id,
  role: z.enum(["hero", "support"]).default("hero"),
  src: z
    .string()
    .min(1)
    .regex(/\.html$/, "figure src must be an .html fragment")
    .refine((s) => !/^[a-z][a-z0-9+.-]*:\/\//i.test(s) && !s.startsWith("/"), {
      message: "figure src must be a project-relative .html fragment",
    }),
  position: Position.default({ anchor: "center" }),
  width: z.number().min(5).max(140).default(60),
  height: z.number().min(5).max(140).default(60),
  radius: z.number().min(0).max(50).default(0),
  shadow: z.boolean().default(true), // soft elevation, theme-aware
});

/** ADR-0008: stylized pointer for staged interaction moments. */
const CursorElement = z.object({
  type: z.literal("cursor"),
  id,
  role: z.literal("support").default("support"),
  variant: z.enum(["arrow", "hand"]).default("arrow"),
  position: Position.default({ anchor: "center" }),
  scale: z.number().min(0.6).max(2).default(1),
});

const StatElement = z.object({
  type: z.literal("stat"),
  id,
  role: z.enum(["hero", "support"]).default("hero"),
  value: z.number(),
  format: z.enum(["plain", "percent", "compact", "currency-usd"]).default("plain"),
  decimals: z.number().int().min(0).max(2).default(0),
  label: z.string().optional(),
  color: z.enum(["text", "primary", "accent"]).default("text"),
  position: Position.default({ anchor: "center" }),
});

const ChartBarElement = z.object({
  type: z.literal("chart-bar"),
  id,
  role: z.enum(["hero", "support"]).default("hero"),
  series: z
    .array(z.object({ label: z.string(), value: z.number().min(0) }))
    .min(2)
    .max(8),
  highlight: z.number().int().min(0).optional(), // index of emphasized bar
  position: Position.default({ anchor: "center" }),
  width: z.number().min(20).max(100).default(60),
  height: z.number().min(10).max(80).default(40),
});

export const Element = z.discriminatedUnion("type", [
  TextElement,
  ShapeElement,
  ImageElement,
  VideoElement,
  FigureElement,
  CursorElement,
  ParticlesElement,
  StatElement,
  ChartBarElement,
]);
export type ElementT = z.infer<typeof Element>;

// ── Choreography ───────────────────────────────────────────────────────────
/** Relational timing: after scene-start or a named animation, plus offset. */
const At = z.object({
  after: z.union([z.literal("scene-start"), id]).default("scene-start"),
  offsetMs: z.number().int().min(0).max(10000).default(0),
});

const Stagger = z.object({
  eachMs: z.number().int().min(10).max(60), // MO-CHOR-1 cap encoded in schema
  from: z.enum(["start", "center", "end"]).default("start"),
});

export const Animation = z.object({
  id,
  /** Element id; group prefix with trailing '*'; or `figureId/innerId` to
   *  choreograph an element INSIDE a figure fragment (ADR-0008 nested comps).
   *  Inner ids are author-defined in the fragment; unresolved selectors fail
   *  loudly at session open (missingTargets). */
  target: z
    .string()
    .regex(/^[a-z][a-z0-9-]*(\*|\/[a-z][a-z0-9-]*)?$/, "target is an element id, a group prefix ending in *, or figureId/innerId"),
  preset: presetName,
  duration: durationToken.optional(), // defaults from preset
  easing: easingToken.optional(), // defaults from preset
  at: At.default({ after: "scene-start", offsetMs: 0 }),
  stagger: Stagger.optional(),
  distance: z.number().min(1).max(60).optional(), // travel in stage units (slide/fade-up/drift)
  direction: z.enum(["up", "down", "left", "right"]).optional(),
  /** ADR-0008: cursor-move only (gated IR-CUR-1) — the sole waypoint surface in the IR. */
  waypoints: z
    .array(z.object({ x: z.number().min(-20).max(120), y: z.number().min(-20).max(120) }))
    .min(1)
    .max(8)
    .optional(),
  /** ADR-0009: particle-morph only (gated MO-PART-1) — target formation for a dot field. */
  morphTo: z.enum(["grid", "ring", "scatter"]).optional(),
  /** Escape hatch (MO-EASE-1): raw values allowed ONLY with a reason. Flagged by gates. */
  override: z
    .object({ reason, durationMs: z.number().min(50).max(5000).optional(), gsapEase: z.string().optional() })
    .optional(),
  /** ADR-0007: a sound fired at this animation's resolved start (mixed at mux).
   *  Sparse by rule (MO-AUD-3) — hero entrances and transitions, not every move. */
  sfx: z
    .object({
      src: z
        .string()
        .min(1)
        .refine((s) => !/^[a-z][a-z0-9+.-]*:\/\//i.test(s) && !s.startsWith("/"), {
          message: "sfx src must be a project-relative path (generate a kit with `chitra sfx-kit`)",
        }),
      gainDb: z.number().min(-40).max(6).default(-14),
    })
    .optional(),
});
export type AnimationT = z.infer<typeof Animation>;

// ── Scene ──────────────────────────────────────────────────────────────────
export const Scene = z.object({
  id,
  reason, // why this scene exists (OpenMontage's best idea)
  durationMs: z.number().int().min(500).max(20000),
  background: z.enum(["bg", "surface", "primary", "image"]).default("bg"),
  backgroundImage: z.string().optional(),
  elements: z.array(Element).min(1).max(12),
  choreography: z.array(Animation).default([]),
  transitionOut: z
    .object({ type: transition, duration: durationToken.default("standard") })
    .default({ type: "cut", duration: "standard" }),
});
export type SceneT = z.infer<typeof Scene>;

// ── Style (resolved house style; styles/ presets produce this) ────────────
export const Style = z.object({
  name: z.string(),
  palette: z.object({
    bg: hex,
    surface: hex,
    primary: hex,
    accent: hex,
    text: hex,
    textDim: hex,
    onMedia: hex.default("#ffffff"),
  }),
  fonts: z.object({
    display: z.enum(["Space Grotesk", "Instrument Serif", "Inter"]),
    text: z.enum(["Inter", "Space Grotesk"]),
    mono: z.enum(["JetBrains Mono"]).default("JetBrains Mono"),
  }),
  displayWeight: z.number().int().min(300).max(700).default(500),
  textWeight: z.number().int().min(300).max(600).default(400),
  trackingDisplay: z.number().min(-0.05).max(0.02).default(-0.02), // em
  grain: z.number().min(0).max(0.12).default(0), // film-grain opacity
});
export type StyleT = z.infer<typeof Style>;

// ── Tier 2 root: Score ─────────────────────────────────────────────────────
export const Score = z.object({
  irVersion: z.literal(IR_VERSION),
  tier: z.literal("score"),
  meta: z.object({
    title: z.string().min(1),
    register,
    width: z.number().int().min(320).max(4096).default(1920),
    height: z.number().int().min(320).max(4096).default(1080),
    fps: z.union([z.literal(24), z.literal(30), z.literal(60)]).default(30),
    seed: z.number().int().min(0).default(1),
    safeZone: z.enum(Object.keys(SAFE_ZONES) as [string, ...string[]]).default("16x9-standard"),
  }),
  style: Style,
  scenes: z.array(Scene).min(1),
  /** Audio v1: music bed with loudness normalization and an optional declared beat grid. */
  audio: z
    .object({
      music: z
        .object({
          src: z.string().min(1), // path relative to the score's directory
          gainDb: z.number().min(-30).max(0).default(-6), // pre-normalization trim
          bpm: z.number().min(40).max(220).optional(), // declared tempo → enables MO-AUD-2 beat-cut gate
          firstBeatMs: z.number().int().min(0).default(0), // offset of beat 1 in the music file
          fadeOutMs: z.number().int().min(0).max(5000).default(800),
        })
        .optional(),
    })
    .optional(),
});
export type ScoreT = z.infer<typeof Score>;

export type ValidationIssue = { path: string; message: string };

export function validateScore(data: unknown): { ok: true; score: ScoreT } | { ok: false; issues: ValidationIssue[] } {
  const r = Score.safeParse(data);
  if (r.success) return { ok: true, score: r.data };
  return {
    ok: false,
    issues: r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  };
}

export function validateDirection(data: unknown): { ok: true; direction: DirectionT } | { ok: false; issues: ValidationIssue[] } {
  const r = Direction.safeParse(data);
  if (r.success) return { ok: true, direction: r.data };
  return {
    ok: false,
    issues: r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  };
}
