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
const { runStaticGates } = await core("gates/index.js");
const { openSession } = await core("render/index.js");
const { generateEvidence } = await core("evidence/index.js");

const flagship = JSON.parse(readFileSync(path.join(root, "examples/launch-film/score.json"), "utf8"));
const clone = () => structuredClone(flagship);

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
];

for (const c of CASES) {
  const dir = path.join(here, "cases", c.name);
  mkdirSync(dir, { recursive: true });
  const score = clone();
  c.mutate(score);
  const v = validateScore(score);
  if (!v.ok) throw new Error(`${c.name}: schema-invalid mutant: ${JSON.stringify(v.issues[0])}`);
  const p1 = runStaticGates(v.score).filter((x) => x.severity === "P1");
  if (p1.length) throw new Error(`${c.name}: deterministic P1s leak into a critic case: ${p1[0].ruleId}`);
  writeFileSync(path.join(dir, "score.json"), JSON.stringify(score, null, 2));
  if (c.direction) writeFileSync(path.join(dir, "direction.json"), JSON.stringify(c.direction, null, 2));
  console.log(`▸ ${c.name}: generating evidence…`);
  const session = await openSession(v.score, dir, path.join(dir, ".chitra-cache"));
  try {
    await generateEvidence(v.score, session, path.join(dir, "evidence"));
  } finally {
    await session.close();
  }
  console.log(`✔ ${c.name}`);
}
console.log("done — see labels.json + README.md for the scoring protocol");
