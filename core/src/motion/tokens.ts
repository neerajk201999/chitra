/**
 * The machine-readable mirror of docs/motion/motion-language.md.
 * Rule IDs (MO-*) here MUST stay in sync with that document — the doc is the law,
 * this file is its executable form. Every value change requires a doc change in the same commit.
 */

export const IR_VERSION = "0.1.0";

// ── Duration scale (MO-DUR) ────────────────────────────────────────────────
export const DURATIONS = {
  instant: 100,
  quick: 200,
  standard: 300,
  emphasis: 500,
  dramatic: 800,
  cinematic: 1200,
} as const;
export type DurationToken = keyof typeof DURATIONS;

// ── Easing families (MO-EASE) — resolved to GSAP ease strings ─────────────
export const EASINGS = {
  "enter-settle": "power3.out", // default for entrances
  "exit-swift": "power2.in", // exits only
  "move-through": "power2.inOut", // on-screen travel
  "spring-standard": "back.out(1.2)", // gentle overshoot settle
  "spring-energetic": "back.out(1.7)", // pronounced overshoot (brand-film only)
  linear: "none", // continuous ambient motion only
} as const;
export type EasingToken = keyof typeof EASINGS;

// ── Registers ──────────────────────────────────────────────────────────────
export const REGISTERS = {
  "brand-film": {
    minMotionRatio: 0.5, // fraction of runtime with intentional motion
    cutRhythm: "musical",
    maxSceneMs: 8000,
    minSceneMs: 1200,
  },
  "product-demo": {
    minMotionRatio: 0.25,
    cutRhythm: "content",
    maxSceneMs: 15000,
    minSceneMs: 1500,
  },
  "social-short": {
    minMotionRatio: 0.5,
    cutRhythm: "fast",
    maxSceneMs: 5000,
    minSceneMs: 800,
  },
} as const;
export type Register = keyof typeof REGISTERS;

// ── Choreography limits (MO-CHOR) ─────────────────────────────────────────
export const CHOREOGRAPHY = {
  maxStaggerEachMs: 60, // MO-CHOR-1
  maxStaggerTotalMs: DURATIONS.emphasis, // MO-CHOR-1
  maxSimultaneousElements: 8, // MO-CHOR-1
  exitDurationRatio: 0.75, // MO-DUR-2
  heroAmplitudeRatio: 2, // MO-CHOR-2
} as const;

// ── Typography (MO-TYPE) ───────────────────────────────────────────────────
export const TYPOGRAPHY = {
  minTextPx1080: { "brand-film": 24, "product-demo": 24, "social-short": 48 },
  minFigureTextPx1080: 12, // MO-FIG-1 advisory floor — diegetic UI text in mockups
  hardFigureTextPx1080: 8, // MO-FIG-1 hard floor — illegible after video encoding
  minContrast: 4.5, // WCAG AA body copy, held per frame (MO-TYPE-2)
  minUiContrast: 3.0, // WCAG AA large-text / UI-component tier (buttons, figure labels, display)
  readingWpm: 200, // MO-EDIT-1
  readingSafety: 1.4, // MO-EDIT-1
  sceneEntryGraceMs: 300, // MO-EDIT-1
} as const;

// ── Platform safe zones (MO-TYPE-4), fraction of frame inset ─────────────
export const SAFE_ZONES = {
  none: { top: 0, bottom: 0, left: 0, right: 0 },
  "16x9-standard": { top: 0.05, bottom: 0.05, left: 0.05, right: 0.05 },
  "9x16-social": { top: 0.12, bottom: 0.18, left: 0.06, right: 0.06 }, // captions/UI chrome
} as const;
export type SafeZone = keyof typeof SAFE_ZONES;

// ── Animation presets — the choreography vocabulary ───────────────────────
// Each preset is a named, taste-approved movement. Directors pick presets;
// raw property animation requires an IR `override` with a reason (MO-EASE-1).
export const PRESETS = {
  "fade-up": { defaultEasing: "enter-settle", defaultDuration: "emphasis", kind: "enter" },
  "fade-in": { defaultEasing: "enter-settle", defaultDuration: "standard", kind: "enter" },
  "scale-settle": { defaultEasing: "spring-standard", defaultDuration: "emphasis", kind: "enter" },
  "slide-in": { defaultEasing: "enter-settle", defaultDuration: "emphasis", kind: "enter" },
  "wipe-reveal": { defaultEasing: "move-through", defaultDuration: "emphasis", kind: "enter" },
  "line-reveal": { defaultEasing: "enter-settle", defaultDuration: "emphasis", kind: "enter" }, // text by lines (MO-TYPE-3)
  "blur-focus": { defaultEasing: "enter-settle", defaultDuration: "dramatic", kind: "enter" },
  "count-up": { defaultEasing: "move-through", defaultDuration: "cinematic", kind: "feature" },
  "draw-line": { defaultEasing: "move-through", defaultDuration: "dramatic", kind: "feature" },
  "drift": { defaultEasing: "linear", defaultDuration: "cinematic", kind: "ambient" }, // slow ambient travel
  "scale-drift": { defaultEasing: "linear", defaultDuration: "cinematic", kind: "ambient" }, // ken-burns style
  // Interaction choreography (ADR-0008): staged product moments
  "cursor-move": { defaultEasing: "move-through", defaultDuration: "cinematic", kind: "feature" }, // waypoints, cursor targets only
  "cursor-click": { defaultEasing: "spring-standard", defaultDuration: "standard", kind: "feature" }, // dip + click ring
  "type-in": { defaultEasing: "linear", defaultDuration: "cinematic", kind: "enter" }, // per-char reveal + caret
  "pulse": { defaultEasing: "spring-standard", defaultDuration: "standard", kind: "feature" }, // reaction: dip-and-settle, no alpha
  // Particle fields (ADR-0009): dot-matrix motifs
  "particle-shimmer": { defaultEasing: "move-through", defaultDuration: "cinematic", kind: "ambient" }, // looping per-dot twinkle
  "particle-form": { defaultEasing: "spring-standard", defaultDuration: "dramatic", kind: "enter" }, // radial assemble
  "particle-morph": { defaultEasing: "move-through", defaultDuration: "cinematic", kind: "feature" }, // formation → formation
  "hide": { defaultEasing: "linear", defaultDuration: "standard", kind: "exit" }, // instant state declaration (match-cut continuity)
  "fade-out": { defaultEasing: "exit-swift", defaultDuration: "standard", kind: "exit" },
  "fade-down-out": { defaultEasing: "exit-swift", defaultDuration: "standard", kind: "exit" },
  "scale-out": { defaultEasing: "exit-swift", defaultDuration: "standard", kind: "exit" },
} as const;
export type PresetName = keyof typeof PRESETS;

// ── Scene transitions ──────────────────────────────────────────────────────
export const TRANSITIONS = ["cut", "fade", "fade-through-black", "wipe", "push"] as const;
export type TransitionType = (typeof TRANSITIONS)[number];

// ── Type scale (modular, per 1080p; compiler scales to output) ────────────
export const TYPE_SCALE = {
  display: 128,
  headline: 84,
  title: 56,
  body: 32,
  caption: 24,
  kicker: 24, // uppercase, tracked; floor of MO-TYPE-1 by construction
} as const;
export type TypeRole = keyof typeof TYPE_SCALE;

export function resolveDuration(token: DurationToken): number {
  return DURATIONS[token];
}
export function resolveEasing(token: EasingToken): string {
  return EASINGS[token];
}
