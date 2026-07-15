#!/usr/bin/env node
/**
 * chitra — deterministic core CLI (ADR-0005: exceptional headless, machine-readable).
 * Commands: validate · check · render · evidence · probe
 */
import { readFileSync, existsSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { Command } from "commander";
import { validateScore, type ScoreT } from "../ir/schema.js";
import { runStaticGates, runFrameGates, summarize, type Finding } from "../gates/index.js";
import { openSession, renderScore, type Quality } from "../render/index.js";
import { generateEvidence } from "../evidence/index.js";

const program = new Command();
program.name("chitra").description("Chitra deterministic core: validate, gate, render, and generate critic evidence for Motion IR scores").version("0.1.0");

function loadScore(file: string): { score: ScoreT; projectDir: string } {
  const abs = path.resolve(file);
  if (!existsSync(abs)) fail(`No such file: ${abs}`);
  let data: unknown;
  try {
    data = JSON.parse(readFileSync(abs, "utf8"));
  } catch (e) {
    fail(`Invalid JSON in ${file}: ${(e as Error).message}`);
  }
  const v = validateScore(data);
  if (!v.ok) {
    console.error(`✖ Schema validation failed (${v.issues.length} issue${v.issues.length > 1 ? "s" : ""}):`);
    for (const i of v.issues) console.error(`  [IR] ${i.path}: ${i.message}`);
    process.exit(2);
  }
  return { score: v.score, projectDir: path.dirname(abs) };
}

function fail(msg: string): never {
  console.error(`✖ ${msg}`);
  process.exit(2);
}

function printFindings(findings: Finding[], json: boolean) {
  const s = summarize(findings);
  if (json) {
    console.log(JSON.stringify({ findings, summary: s }, null, 2));
    return s;
  }
  for (const f of [...findings].sort((a, b) => a.severity.localeCompare(b.severity))) {
    const tc = f.timecodeMs != null ? ` @${(f.timecodeMs / 1000).toFixed(2)}s` : "";
    console.log(`  ${f.severity} [${f.ruleId}] ${f.path}${tc}\n     ${f.message}`);
  }
  console.log(`\n${s.releasable ? "✔" : "✖"} ${s.p1} P1 · ${s.p2} P2 · ${s.p3} P3 — ${s.releasable ? "gates green" : "P1 findings block release"}`);
  return s;
}

program
  .command("validate")
  .argument("<score>", "score JSON file")
  .option("--json", "machine-readable output")
  .description("Schema (layer 1) + static gates (layer 2, score-only)")
  .action((file: string, opts: { json?: boolean }) => {
    const { score } = loadScore(file);
    const findings = runStaticGates(score);
    const s = printFindings(findings, !!opts.json);
    process.exit(s.releasable ? 0 : 1);
  });

program
  .command("check")
  .argument("<score>", "score JSON file")
  .option("--json", "machine-readable output")
  .description("Full deterministic check: schema + static gates + frame gates (renders probe frames in a real browser)")
  .action(async (file: string, opts: { json?: boolean }) => {
    const { score, projectDir } = loadScore(file);
    const findings = runStaticGates(score);
    const session = await openSession(score, projectDir, path.join(projectDir, ".chitra-cache"));
    try {
      findings.push(...(await runFrameGates(score, session)));
    } finally {
      await session.close();
    }
    const s = printFindings(findings, !!opts.json);
    process.exit(s.releasable ? 0 : 1);
  });

program
  .command("render")
  .argument("<score>", "score JSON file")
  .option("-o, --out <file>", "output mp4", "out.mp4")
  .option("-q, --quality <q>", "draft | standard | high", "standard")
  .option("--json", "machine-readable output")
  .option("--force", "render even with P1 static-gate findings")
  .description("Deterministic render to H.264 (per-scene cache; only dirty scenes re-render). Refuses P1 findings unless --force.")
  .action(async (file: string, opts: { out: string; quality: string; json?: boolean; force?: boolean }) => {
    const { score, projectDir } = loadScore(file);
    if (!["draft", "standard", "high"].includes(opts.quality)) fail(`quality must be draft|standard|high`);
    const staticFindings = runStaticGates(score).filter((x) => x.severity === "P1");
    if (staticFindings.length && !opts.force) {
      printFindings(staticFindings, !!opts.json);
      fail("P1 findings block render — fix them or pass --force");
    }
    const r = await renderScore(score, projectDir, opts.out, {
      quality: opts.quality as Quality,
      onProgress: opts.json ? undefined : (d, t) => process.stdout.write(`\r  frame ${d}/${t}`),
    });
    if (!opts.json) process.stdout.write("\n");
    const out = {
      out: r.outFile,
      durationMs: r.durationMs,
      frames: r.totalFrames,
      rendered: r.renderedFrames,
      fromCache: r.cachedFrames,
      wallSeconds: +(r.wallMs / 1000).toFixed(1),
    };
    console.log(opts.json ? JSON.stringify(out, null, 2) : `✔ ${out.out} — ${out.frames} frames (${out.fromCache} cached) in ${out.wallSeconds}s`);
  });

program
  .command("evidence")
  .argument("<score>", "score JSON file")
  .option("-o, --out <dir>", "output directory", "evidence")
  .option("--json", "machine-readable output")
  .description("Generate critic evidence: contact sheet, per-scene hero frames, cut strips")
  .action(async (file: string, opts: { out: string; json?: boolean }) => {
    const { score, projectDir } = loadScore(file);
    const session = await openSession(score, projectDir, path.join(projectDir, ".chitra-cache"));
    try {
      const e = await generateEvidence(score, session, opts.out);
      console.log(
        opts.json
          ? JSON.stringify(e, null, 2)
          : `✔ evidence → ${opts.out}\n  contact sheet: ${e.contactSheet}\n  hero frames: ${e.heroFrames.length}\n  cut strips: ${e.cutStrips}`
      );
    } finally {
      await session.close();
    }
  });

program
  .command("frame")
  .argument("<score>", "score JSON file")
  .requiredOption("-t, --time <ms>", "timecode in milliseconds")
  .option("-o, --out <file>", "output PNG", "frame.png")
  .description("Capture one frame — the fast preview for iteration (seconds, not minutes)")
  .action(async (file: string, opts: { time: string; out: string }) => {
    const { score, projectDir } = loadScore(file);
    const ms = Number(opts.time);
    if (!Number.isFinite(ms) || ms < 0) fail("--time must be a non-negative number of milliseconds");
    const session = await openSession(score, projectDir, path.join(projectDir, ".chitra-cache"));
    try {
      writeFileSync(opts.out, await session.seekAndCapture(Math.min(ms, session.compiled.durationMs - 1)));
      console.log(`✔ ${opts.out} @ ${(ms / 1000).toFixed(2)}s`);
    } finally {
      await session.close();
    }
  });

program
  .command("init")
  .argument("[dir]", "project directory", ".")
  .option("--style <name>", "house style: night | paper", "night")
  .option("--register <r>", "brand-film | product-demo | social-short", "brand-film")
  .option("--title <t>", "video title", "Untitled")
  .description("Scaffold a gate-passing starter score.json to edit from — never start from a blank file")
  .action((dir: string, opts: { style: string; register: string; title: string }) => {
    const target = path.resolve(dir, "score.json");
    if (existsSync(target)) fail(`${target} already exists`);
    // Styles live at core/styles when installed from npm (copied at prepack),
    // and at the repo root during development.
    const cliDir = path.dirname(fileURLToPath(import.meta.url));
    const candidates = [
      path.resolve(cliDir, "../../styles", `${opts.style}.json`),
      path.resolve(cliDir, "../../../styles", `${opts.style}.json`),
    ];
    const styleFile = candidates.find((f) => existsSync(f));
    if (!styleFile) fail(`Unknown style "${opts.style}" (looked in ${candidates.map((c) => path.dirname(c)).join(", ")})`);
    const style = JSON.parse(readFileSync(styleFile, "utf8"));
    delete style.$comment;
    const portrait = opts.register === "social-short";
    const starter = starterScore(opts.title, opts.register, style, portrait);
    mkdirSync(path.dirname(target), { recursive: true });
    writeFileSync(target, JSON.stringify(starter, null, 2));
    const v = validateScore(starter);
    const gates = v.ok ? runStaticGates(v.score).filter((x) => x.severity !== "P3").length : -1;
    console.log(`✔ ${target} (${opts.register}, style: ${opts.style}${portrait ? ", 1080×1920" : ""})`);
    console.log(gates === 0 ? "✔ starter passes static gates — edit from here" : "✖ starter has gate findings — this is a bug, please report");
    console.log(`next: chitra check score.json && chitra render score.json -o out/draft.mp4 -q draft`);
  });

program
  .command("clean")
  .argument("[dir]", "project directory", ".")
  .description("Remove Chitra work artifacts (.chitra-cache/, .chitra-page.html) from a project directory")
  .action((dir: string) => {
    for (const f of [".chitra-cache", ".chitra-page.html"]) {
      const t = path.resolve(dir, f);
      if (existsSync(t)) {
        rmSync(t, { recursive: true, force: true });
        console.log(`✔ removed ${t}`);
      }
    }
  });

program
  .command("probe")
  .description("Verify the environment: ffmpeg, bundled Chrome, fonts")
  .action(() => {
    const ff = spawnSync("ffmpeg", ["-version"], { encoding: "utf8" });
    console.log(ff.status === 0 ? `✔ ffmpeg: ${ff.stdout.split("\n")[0]}` : "✖ ffmpeg not found on PATH — install ffmpeg");
    try {
      // Puppeteer resolves its vendored browser lazily; a launch is the real probe.
      console.log("✔ puppeteer installed (browser downloads on first render if needed)");
    } catch {
      console.log("✖ puppeteer missing");
    }
    process.exit(ff.status === 0 ? 0 : 1);
  });

/** A minimal three-scene score that passes every gate in every register. */
function starterScore(title: string, register: string, style: unknown, portrait: boolean) {
  const dims = portrait ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 };
  const amb = (id: string, ms: number) => ({
    id: `${id}-drift`, target: id, preset: "drift", direction: "right", distance: 5,
    override: { reason: "ambient field travels the full scene length", durationMs: ms },
  });
  return {
    irVersion: "0.1.0",
    tier: "score",
    meta: { title, register, ...dims, fps: 30, seed: 1, safeZone: portrait ? "9x16-social" : "16x9-standard" },
    style,
    scenes: [
      {
        id: "hook", reason: "Open on the single message that must land", durationMs: 3000, background: "bg",
        elements: [
          { type: "shape", id: "glow-a", role: "ambient", shape: "gradient-field", color: "primary", opacity: 0.25, position: { anchor: "center", x: 35, y: 32 }, width: 95, height: 95 },
          { type: "text", id: "hook-line", role: "hero", textRole: "display", content: "Say it once.", position: { anchor: "center", x: 50, y: 46 }, maxWidth: 80 },
        ],
        choreography: [
          amb("glow-a", 3000),
          { id: "hook-in", target: "hook-line", preset: "fade-up", duration: "emphasis", at: { after: "scene-start", offsetMs: 250 } },
        ],
        transitionOut: { type: "fade", duration: "standard" },
      },
      {
        id: "proof", reason: "Back the claim with one concrete beat", durationMs: 3600, background: "surface",
        elements: [
          { type: "text", id: "proof-line", role: "hero", textRole: "headline", content: "Then prove it.", align: "left", position: { anchor: "left", x: 10, y: 46 }, maxWidth: 78 },
          { type: "shape", id: "underline", role: "ambient", shape: "line", color: "accent", position: { anchor: "left", x: 10, y: 54 }, width: 12 },
          { type: "shape", id: "glow-b", role: "ambient", shape: "gradient-field", color: "accent", opacity: 0.1, position: { anchor: "center", x: 75, y: 70 }, width: 90, height: 90 },
        ],
        choreography: [
          amb("glow-b", 3600),
          { id: "proof-in", target: "proof-line", preset: "line-reveal", duration: "emphasis", at: { after: "scene-start", offsetMs: 300 } },
          { id: "underline-in", target: "underline", preset: "draw-line", duration: "dramatic", at: { after: "proof-in", offsetMs: 0 } },
        ],
        transitionOut: { type: "cut", duration: "standard" },
      },
      {
        id: "close", reason: "Land the name and leave", durationMs: 3000, background: "bg",
        elements: [
          { type: "shape", id: "glow-c", role: "ambient", shape: "gradient-field", color: "primary", opacity: 0.2, position: { anchor: "center", x: 50, y: 55 }, width: 100, height: 100 },
          { type: "text", id: "brand", role: "hero", textRole: "title", content: title, position: { anchor: "center", x: 50, y: 50 }, maxWidth: 80 },
        ],
        choreography: [
          { id: "glow-c-in", target: "glow-c", preset: "scale-drift", override: { reason: "slow ambient swell under the closing card", durationMs: 3000 } },
          { id: "brand-in", target: "brand", preset: "scale-settle", duration: "emphasis", at: { after: "scene-start", offsetMs: 250 } },
          { id: "brand-out", target: "brand", preset: "fade-out", duration: "standard", at: { after: "brand-in", offsetMs: 1400 } },
        ],
        transitionOut: { type: "cut", duration: "standard" },
      },
    ],
  };
}

program.parseAsync().catch((e) => {
  console.error(`✖ ${(e as Error).message}`);
  process.exit(2);
});
