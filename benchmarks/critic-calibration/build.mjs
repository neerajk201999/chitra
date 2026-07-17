#!/usr/bin/env node
/**
 * Critic calibration set builder (roadmap M2 exit, aesthetic half).
 *
 * Derives 4 labeled cases from the flagship score. Each case passes (or nearly
 * passes) the DETERMINISTIC gates — the defects live in the aesthetic layer
 * that only the VLM critic (skills/critique-video) can judge. Evidence
 * (contact sheet, hero frames, cut strips) is generated for each case; a
 * critic session is then scored against labels.json per the README protocol.
 *
 * Usage: node benchmarks/critic-calibration/build.mjs   (repo root, core built)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const core = (m) => import(path.join(root, "core/dist", m));
const { validateScore } = await core("ir/schema.js");
const { runStaticGates, runFrameGates } = await core("gates/index.js");
const { openSession } = await core("render/index.js");
const { generateEvidence } = await core("evidence/index.js");

const flagship = JSON.parse(readFileSync(path.join(root, "examples/launch-film/score.json"), "utf8"));
const social = JSON.parse(readFileSync(path.join(root, "examples/social-short/score.json"), "utf8"));
const demo = JSON.parse(readFileSync(path.join(here, "bases/product-demo.json"), "utf8"));
const BASES = { flagship, social, demo };
const clone = (base = "flagship") => structuredClone(BASES[base]);

const CASES = [
  {
    name: "control-clean",
    note: "The flagship as shipped. Control for false positives.",
    mutate: (s) => s,
  },
  {
    name: "uniform-monotony",
    note: "Every entrance is a centered fade; rhythm is metronomic. Durations alternate just enough to slip past MO-SLOP-2. Pure critic territory: motion monotony.",
    mutate(s) {
      s.scenes.forEach((sc, i) => {
        // strip compositional variety: everything centered
        sc.elements.forEach((el) => {
          if (el.type === "text") {
            el.align = "center";
            el.position = { anchor: "center", x: 50, y: el.position.y ?? 50 };
          }
        });
        // metronomic choreography: same preset, same offsets, alternating duration token
        sc.choreography = sc.choreography.map((a, j) => {
          if (a.override) return a; // keep ambient full-length drifts (gate coverage)
          return {
            id: a.id,
            target: a.target,
            preset: "fade-in",
            duration: j % 2 ? "standard" : "emphasis",
            at: { after: "scene-start", offsetMs: 300 + j * 350 },
          };
        });
        sc.transitionOut = { type: i === s.scenes.length - 1 ? "cut" : "fade", duration: "standard" };
      });
    },
  },
  {
    name: "slop-aesthetic",
    note: "The category-guessable AI look: purple-glow dark tech aesthetic, rocket emoji, every scene a centered card with scale-settle. Two-altitude test should fail at first order.",
    mutate(s) {
      s.style.palette = { bg: "#0f0a1e", surface: "#1e1433", primary: "#8b5cf6", accent: "#c084fc", text: "#f5f3ff", textDim: "#a78bfa", onMedia: "#ffffff" };
      s.style.grain = 0;
      s.scenes.forEach((sc) => {
        sc.elements.forEach((el) => {
          if (el.type === "shape" && el.shape === "gradient-field") {
            el.color = "primary";
            el.opacity = Math.min(0.5, (el.opacity ?? 0.3) + 0.15);
            el.position = { anchor: "center", x: 50, y: 50 };
            el.width = 110;
            el.height = 110;
          }
          if (el.type === "text") {
            el.align = "center";
            el.position = { anchor: "center", x: 50, y: el.position.y ?? 50 };
          }
        });
        sc.choreography = sc.choreography.map((a) => (a.override ? a : { ...a, preset: "scale-settle", easing: "spring-energetic" }));
      });
      s.scenes[0].elements[2].content = "\u{1F680} Ship 10x faster.";
      s.scenes[3].elements[1].content = "✨ Direct.";
      s.scenes[5].elements[1].content = "\u{1F680} Chitra";
    },
  },
  {
    name: "broken-hierarchy",
    note: "Direction declares the chart as the hero moment; the score renders it small in a corner while a decorative glow dominates. Gates see a legal scene; only intent-match critique catches it.",
    mutate(s) {
      const scene = s.scenes.find((sc) => sc.id === "where-tools-invest");
      const chart = scene.elements.find((e) => e.type === "chart-bar");
      chart.position = { anchor: "bottom-right", x: 94, y: 90 };
      chart.width = 24;
      chart.height = 16;
      const glow = scene.elements.find((e) => e.type === "shape");
      glow.opacity = 0.45;
      glow.position = { anchor: "center", x: 50, y: 50 };
      glow.width = 120;
      glow.height = 120;
    },
    direction: {
      irVersion: "0.1.0",
      tier: "direction",
      title: "Chitra — Taste is the product",
      register: "brand-film",
      logline: "The industry builds renderers; Chitra builds judgment.",
      narrativeArc: "Setup: everyone renders. Tension: nobody directs. Peak: the investment chart makes the imbalance undeniable. Release: Chitra closes the loop.",
      tone: ["confident", "restrained", "evidence-led"],
      audience: "developers and design-literate founders",
      scenes: [
        { id: "where-tools-invest", narrativeRole: "the peak — evidence lands", shotIntent: "The viewer's eye goes straight to the chart; the Critique bar's smallness IS the argument.", heroMoment: "The investment chart dominates the frame and the tiny Critique bar lands the thesis.", pacingWeight: 1.5 },
      ],
    },
  },

  // ── 2026-07-17 expansion: register diversity + a second control ──────────

  {
    name: "tone-mismatch",
    note: "Private-wealth gravitas copy set to candy palette + bouncy springs. Every gate passes; the emotional register contradiction is pure critic territory (CC-COL-1, CC-NARR-5).",
    mutate(s) {
      s.style.palette = { bg: "#fdf3f8", surface: "#ffffff", primary: "#be185d", accent: "#c2410c", text: "#3b1c2e", textDim: "#8a4a6b", onMedia: "#ffffff" };
      s.style.grain = 0;
      const copy = {
        0: ["PRIVET CAPITAL", "Generational wealth, preserved."],
        // scene indices beyond 0 rewritten below by element role
      };
      const lines = [
        "Wealth, preserved.",
        "Discretion is the product.",
        "A century of stewardship.",
        "Preserve.", // loop scene stacks several display words — keep them short
        "Your legacy, unbroken.",
        "Privet Capital",
      ];
      const loopWords = ["Preserve.", "Steward.", "Endure."];
      s.scenes.forEach((sc, i) => {
        const texts = sc.elements.filter((e) => e.type === "text" && e.textRole !== "kicker" && e.textRole !== "caption");
        if (texts.length > 1 && texts.every((t) => t.content.split(" ").length <= 2)) {
          // stacked single-word scene (the flagship loop): swap word-for-word so
          // nothing wraps into its neighbors
          texts.forEach((t, j) => (t.content = loopWords[Math.min(j, loopWords.length - 1)]));
        } else {
          const hero = sc.elements.find((e) => e.type === "text" && e.role === "hero");
          if (hero) hero.content = lines[Math.min(i, lines.length - 1)];
        }
        sc.choreography = sc.choreography.map((a) =>
          a.override ? a : { ...a, easing: "spring-energetic" }
        );
      });
      void copy;
    },
  },
  {
    name: "color-soup",
    note: "Olive-lime accent against warm terracotta primary on cream; decorative gradients cranked. Contrast gates pass everywhere (every text role ≥4.5:1); the palette is simply tasteless (CC-COL-1/2, harmony not measurable by WCAG).",
    mutate(s) {
      s.style.palette = { bg: "#f6ede4", surface: "#ffffff", primary: "#94482a", accent: "#3f6212", text: "#2d2318", textDim: "#6d5f4e", onMedia: "#ffffff" };
      s.scenes.forEach((sc) => {
        sc.elements.forEach((el) => {
          if (el.type === "shape" && el.shape === "gradient-field") {
            el.opacity = Math.min(0.55, (el.opacity ?? 0.3) + 0.2);
            el.width = Math.min(130, (el.width ?? 90) + 20);
            el.height = Math.min(130, (el.height ?? 90) + 20);
          }
        });
      });
    },
  },
  {
    name: "rushed-close",
    note: "The close squeaks past the CC-RHY-4 gate (just above 12% of runtime) but is crammed: logo, tag, and a CTA all land in the final beat with quick exits. The film ends like a door slamming (CC-RHY-4 in spirit).",
    mutate(s) {
      const close = s.scenes[s.scenes.length - 1];
      const total = s.scenes.reduce((a, sc) => a + sc.durationMs, 0);
      // shrink the close to ~13% of runtime, then stuff it. Copy is shortened
      // so reading-time stays LEGAL — the planted defect is density, not a
      // deterministic violation (the builder would refuse a P1 leak).
      const target = Math.round((total - close.durationMs) * 0.13 / 0.87 / 100) * 100 + 200;
      close.durationMs = Math.max(1600, target);
      const tag = close.elements.find((e) => e.id === "tag");
      if (tag) tag.content = "Direct. Gate. Ship.";
      close.elements.push({
        type: "text", id: "cta-extra", role: "support", textRole: "caption",
        content: "Start free today.", color: "accent",
        position: { anchor: "center", x: 50, y: 70 },
      });
      close.choreography = close.choreography.filter((a) => a.override || !a.preset.includes("out"));
      close.choreography.push({
        id: "cta-extra-in", target: "cta-extra", preset: "fade-up", duration: "quick",
        at: { after: "scene-start", offsetMs: 500 },
      });
    },
  },
  {
    name: "dead-center-parade",
    base: "social",
    note: "Every element dead-centered in every scene; palette/scale nudged per scene so MO-EDIT-3 passes on paper, but the film is a poster parade with zero compositional life (CC-CAM-3, CC-COMP-3).",
    mutate(s) {
      s.scenes.forEach((sc, i) => {
        sc.elements.forEach((el) => {
          if (el.type === "text") {
            el.align = "center";
            el.position = { anchor: "center", x: 50, y: 48 };
            if (el.maxWidth) el.maxWidth = 80;
          }
          if (el.type === "shape" && el.shape === "line") el.position = { anchor: "center", x: 50, y: 58 };
        });
        sc.background = i === 1 ? "surface" : "bg"; // palette axis for MO-EDIT-3
      });
    },
  },
  {
    name: "social-whiplash",
    base: "social",
    note: "Entrances reverse screen direction every beat (left, right, left) with no narrative reason — continuity chaos that MO-CHOR-4 (draft, ungated) names but nothing enforces.",
    mutate(s) {
      const dirs = ["left", "right", "left"];
      s.scenes.forEach((sc, i) => {
        sc.choreography = sc.choreography.map((a) => {
          if (a.override) return a;
          return { ...a, preset: "slide-in", direction: dirs[i % dirs.length], distance: 14 };
        });
      });
    },
  },
  {
    name: "control-premium",
    base: "demo",
    note: "A clean, restrained product demo (second control, different register). Calibrated critics may file minor polish notes; blockers or >3 findings indicate over-triggering.",
    mutate: (s) => s,
  },
  {
    name: "wallpaper-drift",
    base: "demo",
    note: "Ambient glows inflated to dominate every frame while content sits small and dim — the film reads as a screensaver with captions (CC-COL-3 contrast-as-hierarchy, CC-NARR-3 product-as-protagonist).",
    mutate(s) {
      s.scenes.forEach((sc) => {
        sc.elements.forEach((el) => {
          if (el.type === "shape" && el.shape === "gradient-field") {
            el.opacity = Math.min(0.6, (el.opacity ?? 0.2) + 0.3);
            el.width = 135;
            el.height = 135;
            el.position = { anchor: "center", x: 50, y: 50 };
          }
          if (el.type === "text" && el.role === "hero") {
            el.color = "text-dim";
          }
        });
      });
    },
  },
  {
    name: "caption-carpet",
    base: "demo",
    note: "Three extra dim captions per scene at legal positions — no overlaps, sizes above floor, hero role intact — but the frames have no visual rest and nothing leads the eye (CC-COMP-3 density, CC-TYPE-4 one thought per card).",
    mutate(s) {
      const extras = [
        ["SOC 2 Type II certified", 8, 88],
        ["Syncs with NetSuite and Xero", 50, 88],
        ["Loved by 2,400 finance teams", 92, 88],
      ];
      s.scenes.forEach((sc, i) => {
        extras.forEach(([content, x], j) => {
          const anchor = j === 0 ? "left" : j === 2 ? "right" : "center";
          sc.elements.push({
            type: "text", id: `carpet-${j}`, role: "support", textRole: "caption",
            content, color: "text-dim", align: anchor === "right" ? "right" : anchor === "left" ? "left" : "center",
            position: { anchor, x: anchor === "center" ? 50 : x, y: 88 },
          });
          sc.choreography.push({
            id: `carpet-${j}-in`, target: `carpet-${j}`, preset: "fade-in", duration: "standard",
            at: { after: "scene-start", offsetMs: 400 + j * 120 },
          });
        });
        void i;
      });
    },
  },
];

for (const c of CASES) {
  const dir = path.join(here, "cases", c.name);
  mkdirSync(dir, { recursive: true });
  const score = clone(c.base ?? "flagship");
  c.mutate(score);
  const v = validateScore(score);
  if (!v.ok) throw new Error(`${c.name}: schema-invalid mutant: ${JSON.stringify(v.issues[0])}`);
  const p1 = runStaticGates(v.score).filter((x) => x.severity === "P1");
  if (p1.length) throw new Error(`${c.name}: deterministic P1s leak into a critic case: ${p1[0].ruleId}`);
  writeFileSync(path.join(dir, "score.json"), JSON.stringify(score, null, 2));
  if (c.direction) writeFileSync(path.join(dir, "direction.json"), JSON.stringify(c.direction, null, 2));
  console.log(`▸ ${c.name}: frame gates + evidence…`);
  const session = await openSession(v.score, dir, path.join(dir, ".chitra-cache"));
  try {
    // "Passes deterministic gates by construction" must include the RENDERED
    // frame gates (overlap, contrast, safe zones, blanks) — a static-only check
    // let an accidental text collision contaminate a case once.
    const frameP1 = (await runFrameGates(v.score, session)).filter((x) => x.severity === "P1");
    if (frameP1.length)
      throw new Error(`${c.name}: rendered-frame P1 leaks into a critic case: ${frameP1[0].ruleId} — ${frameP1[0].message}`);
    await generateEvidence(v.score, session, path.join(dir, "evidence"));
  } finally {
    await session.close();
  }
  console.log(`✔ ${c.name}`);
}
console.log("done — see labels.json + README.md for the scoring protocol");
