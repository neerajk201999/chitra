#!/usr/bin/env node
/**
 * Seeded-defect evaluation (roadmap M2 exit metric).
 *
 * Takes the flagship score, injects N precisely-defined defects — each mapped
 * to the rule that SHOULD catch it — runs the deterministic Quality Engine
 * (static + frame gates), and reports the measured catch rate.
 *
 * Usage: node benchmarks/seeded-defects/run.mjs   (from repo root; core must be built)
 * Writes: benchmarks/seeded-defects/results.md
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

const flagshipDir = path.join(root, "examples/launch-film");
const flagship = JSON.parse(readFileSync(path.join(flagshipDir, "score.json"), "utf8"));
const clone = () => structuredClone(flagship);

/** Each defect: a realistic authoring mistake + the rule that must catch it. */
const DEFECTS = [
  {
    name: "unreadable-copy",
    expect: "MO-EDIT-1",
    frames: false,
    mutate(s) {
      s.scenes[1].elements[0].content =
        "This headline contains far too many words to be read comfortably in the short time this scene allows it to remain visible on screen.";
    },
  },
  {
    name: "competing-heroes",
    expect: "MO-CHOR-2",
    frames: false,
    mutate(s) {
      for (const el of s.scenes[1].elements) el.role = "hero";
    },
  },
  {
    name: "sub-floor-scene-length",
    expect: "MO-EDIT-2",
    frames: false,
    mutate(s) {
      s.scenes[3].durationMs = 700;
    },
  },
  {
    name: "dangling-animation-target",
    expect: "IR-REF-2",
    frames: false,
    mutate(s) {
      s.scenes[0].choreography[1].target = "kickr";
    },
  },
  {
    name: "broken-relational-chain",
    expect: "IR-REF-1",
    frames: false,
    mutate(s) {
      s.scenes[0].choreography[2].at.after = "nonexistent-anim";
    },
  },
  {
    name: "fade-only-slideshow",
    expect: "MO-SLOP-1",
    frames: false,
    mutate(s) {
      s.scenes = s.scenes.slice(0, 3).map((sc, i) => ({
        ...sc,
        id: `card-${i}`,
        background: "bg",
        elements: sc.elements.filter((e) => e.type === "text"),
        choreography: sc.elements
          .filter((e) => e.type === "text")
          .map((e, j) => ({ id: `a${i}-${j}`, target: e.id, preset: "fade-in", at: { after: "scene-start", offsetMs: 0 } })),
        transitionOut: { type: "cut", duration: "standard" },
      }));
    },
  },
  {
    name: "off-beat-cuts",
    expect: "MO-AUD-2",
    frames: false,
    mutate(s) {
      s.audio = { music: { src: "music.wav", gainDb: -6, bpm: 120, firstBeatMs: 0, fadeOutMs: 800 } };
      s.scenes[0].durationMs = 3650; // 150ms off a 500ms grid
    },
  },
  {
    name: "text-overlap",
    expect: "QE-OVERLAP-1",
    frames: true,
    mutate(s) {
      s.scenes[0].elements[1].position.y = 51; // kicker into the display line
    },
  },
  {
    name: "low-contrast-text",
    expect: "MO-TYPE-2",
    frames: true,
    mutate(s) {
      s.scenes[4].background = "primary"; // caption text-dim on primary ≈ 2:1
    },
  },
  {
    name: "blank-scene",
    expect: "QE-BLANK-1",
    frames: true,
    mutate(s) {
      s.style.grain = 0;
      s.scenes.splice(2, 0, {
        id: "dead-scene",
        reason: "seeded defect: a scene that renders as a uniform frame",
        durationMs: 2000,
        background: "bg",
        elements: [
          { type: "shape", id: "ghost", role: "ambient", shape: "rect", color: "surface", opacity: 0.01, position: { anchor: "center" }, width: 10, height: 10 },
        ],
        choreography: [],
        transitionOut: { type: "cut", duration: "standard" },
      });
    },
  },
];

const rows = [];
let caught = 0;
for (const d of DEFECTS) {
  const mutant = clone();
  d.mutate(mutant);
  const v = validateScore(mutant);
  let findings = [];
  let note = "";
  if (!v.ok) {
    note = "rejected at schema layer";
    findings = v.issues.map((i) => ({ ruleId: "IR-SCHEMA", severity: "P1", message: i.message }));
  } else {
    findings = runStaticGates(v.score);
    if (d.frames) {
      const session = await openSession(v.score, flagshipDir, path.join(flagshipDir, ".chitra-cache"));
      try {
        findings.push(...(await runFrameGates(v.score, session)));
      } finally {
        await session.close();
      }
    }
  }
  const hit = findings.find((f) => f.ruleId === d.expect && (f.severity === "P1" || f.severity === "P2"));
  if (hit) caught++;
  rows.push({ name: d.name, expect: d.expect, caught: !!hit, layer: d.frames ? "frame" : "static", note: hit ? hit.message.slice(0, 90) : note || "MISSED" });
  console.log(`${hit ? "✔" : "✖"} ${d.name} → ${d.expect} ${hit ? "" : "(MISSED)"}`);
}

const rate = ((caught / DEFECTS.length) * 100).toFixed(0);
const md = `# Seeded-Defect Evaluation — ${new Date().toISOString().slice(0, 10)}

Deterministic Quality Engine (layers 1–2) against ${DEFECTS.length} seeded authoring defects in the flagship score.

**Catch rate: ${caught}/${DEFECTS.length} (${rate}%)** — M2 exit gate requires ≥80% on deterministic-detectable defects.

| defect | layer | expected rule | caught | detail |
|---|---|---|---|---|
${rows.map((r) => `| ${r.name} | ${r.layer} | ${r.expect} | ${r.caught ? "✔" : "✖ MISSED"} | ${r.note.replace(/\|/g, "\\|")} |`).join("\n")}

Scope note: this measures the *deterministic* gates only. Aesthetic defects (weak composition,
category-guessable styling, limp pacing) are the VLM critic's job (skills/critique-video) and are
NOT counted here — that layer's catch rate requires the M4 human-judged protocol.

Reproduce: \`node benchmarks/seeded-defects/run.mjs\` from the repo root (core built, ffmpeg on PATH).
`;
mkdirSync(here, { recursive: true });
writeFileSync(path.join(here, "results.md"), md);
console.log(`\ncatch rate: ${caught}/${DEFECTS.length} (${rate}%) → results.md`);
process.exit(caught / DEFECTS.length >= 0.8 ? 0 : 1);
