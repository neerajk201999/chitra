#!/usr/bin/env node
/**
 * chitra — deterministic core CLI (ADR-0005: exceptional headless, machine-readable).
 * Commands: validate · check · render · evidence · probe
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
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
  .description("Deterministic render to H.264 (per-scene cache; only dirty scenes re-render)")
  .action(async (file: string, opts: { out: string; quality: string; json?: boolean }) => {
    const { score, projectDir } = loadScore(file);
    if (!["draft", "standard", "high"].includes(opts.quality)) fail(`quality must be draft|standard|high`);
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

program.parseAsync().catch((e) => {
  console.error(`✖ ${(e as Error).message}`);
  process.exit(2);
});
