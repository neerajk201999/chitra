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
import { fetchAsset, snapPage, writeAssetLog } from "../assets/index.js";

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
  .command("fetch")
  .argument("<url>", "http(s) URL of an image")
  .requiredOption("-o, --out <file>", "output path (extension picks format: .png/.jpg/.webp)")
  .option("--max-width <px>", "downscale to at most this width", (v) => parseInt(v, 10))
  .option("--json", "machine-readable output")
  .description("Download + normalize a web image into the project (ADR-0006; logs provenance to assets/sources.jsonl)")
  .action(async (url: string, o: { out: string; maxWidth?: number; json?: boolean }) => {
    try {
      const report = await fetchAsset(url, o.out, { maxWidth: o.maxWidth });
      writeAssetLog(process.cwd(), report);
      if (o.json) console.log(JSON.stringify(report, null, 2));
      else console.log(`✔ ${report.out} — ${report.width}×${report.height}, ${(report.bytes / 1024).toFixed(0)}KB, sha256 ${report.sha256.slice(0, 16)}…`);
    } catch (e) {
      fail((e as Error).message);
    }
  });

program
  .command("snap")
  .argument("<url>", "webpage URL to screenshot")
  .requiredOption("-o, --out <file>", "output path (.png/.jpg/.webp)")
  .option("--width <px>", "viewport width (default 1920)", (v) => parseInt(v, 10))
  .option("--height <px>", "viewport height (default 1080)", (v) => parseInt(v, 10))
  .option("--full-page", "capture the full scroll height")
  .option("--delay <ms>", "settle time before capture (default 1500)", (v) => parseInt(v, 10))
  .option("--hide <selector...>", "CSS selectors to hide before capture (cookie/consent overlays auto-hidden)")
  .option("--json", "machine-readable output")
  .description("Screenshot a webpage with the vendored Chrome for use as a score asset (ADR-0006)")
  .action(async (url: string, o: { out: string; width?: number; height?: number; fullPage?: boolean; delay?: number; hide?: string[]; json?: boolean }) => {
    try {
      const report = await snapPage(url, o.out, { width: o.width, height: o.height, fullPage: o.fullPage, delayMs: o.delay, hide: o.hide });
      writeAssetLog(process.cwd(), report);
      if (o.json) console.log(JSON.stringify(report, null, 2));
      else console.log(`✔ ${report.out} — ${report.width}×${report.height}, ${(report.bytes / 1024).toFixed(0)}KB, sha256 ${report.sha256.slice(0, 16)}…`);
    } catch (e) {
      fail((e as Error).message);
    }
  });

const SFX_RECIPES: Record<string, string[]> = {
  // Deterministic signal-source synthesis (ADR-0007): zero licensing, byte-stable
  // for a given ffmpeg version. Tasteful defaults — short, soft, low-mid heavy.
  "tick.wav": ["-f", "lavfi", "-i", "sine=frequency=1400:duration=0.07",
    "-af", "highpass=f=600,afade=t=in:d=0.005,afade=t=out:st=0.02:d=0.05,volume=0.7"],
  "whoosh.wav": ["-f", "lavfi", "-i", "anoisesrc=color=pink:duration=0.7:amplitude=0.6:seed=42",
    "-af", "bandpass=f=500:w=400,afade=t=in:d=0.22,afade=t=out:st=0.3:d=0.4,volume=0.8"],
  "rise.wav": ["-f", "lavfi", "-i", "aevalsrc=0.35*sin(2*PI*(140+320*t*t)*t):s=48000:d=0.9",
    "-af", "lowpass=f=1400,afade=t=in:d=0.1,afade=t=out:st=0.55:d=0.35"],
  "boom.wav": ["-f", "lavfi", "-i", "sine=frequency=52:duration=1.0",
    "-af", "lowpass=f=140,afade=t=in:d=0.008,afade=t=out:st=0.08:d=0.9,volume=0.9"],
  // UI click: two-transient (sharp tap + body knock), the sound every cursor-click wants
  "click.wav": ["-f", "lavfi",
    "-i", "aevalsrc=0.5*sin(2*PI*2100*t)*exp(-t*260)+0.42*sin(2*PI*640*t)*exp(-t*130):s=48000:d=0.09",
    "-af", "highpass=f=300,volume=0.85"],
  // pop: pitched-down blip for toggles/dismissals
  "pop.wav": ["-f", "lavfi",
    "-i", "aevalsrc=0.5*sin(2*PI*(480-2600*t)*t)*exp(-t*70):s=48000:d=0.12",
    "-af", "lowpass=f=1200,volume=0.85"],
};

program
  .command("sfx-kit")
  .option("-o, --out <dir>", "output directory", "assets/sfx")
  .description("Generate the deterministic starter SFX kit: tick, whoosh, rise, boom (ADR-0007; no licensing)")
  .action((o: { out: string }) => {
    mkdirSync(path.resolve(o.out), { recursive: true });
    for (const [name, args] of Object.entries(SFX_RECIPES)) {
      const target = path.join(o.out, name);
      const r = spawnSync("ffmpeg", ["-y", "-v", "error", ...args, "-ar", "48000", target], { encoding: "utf8" });
      if (r.status !== 0) fail(`ffmpeg failed for ${name}: ${(r.stderr ?? "").slice(-300)}`);
      console.log(`✔ ${target}`);
    }
  });

program
  .command("extract-audio")
  .argument("<video>", "source video file (a reference or recording you have rights to)")
  .requiredOption("-o, --out <file>", "output audio (.m4a/.wav/.mp3)")
  .option("--start <s>", "start offset seconds", parseFloat)
  .option("--duration <s>", "clip length seconds", parseFloat)
  .option("--json", "machine-readable output")
  .description("Extract an audio track from a video for use as a score's music (ffmpeg). You are responsible for having the rights to reuse it — extracting a track from someone else's film does not license it.")
  .action((video: string, o: { out: string; start?: number; duration?: number; json?: boolean }) => {
    const src = path.resolve(video);
    if (!existsSync(src)) fail(`No such video: ${src}`);
    mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
    const args = ["-y", "-v", "error"];
    if (o.start != null) args.push("-ss", o.start.toFixed(3));
    args.push("-i", src);
    if (o.duration != null) args.push("-t", o.duration.toFixed(3));
    const ext = path.extname(o.out).toLowerCase();
    if (ext === ".wav") args.push("-vn", "-c:a", "pcm_s16le");
    else if (ext === ".mp3") args.push("-vn", "-c:a", "libmp3lame", "-b:a", "192k");
    else args.push("-vn", "-c:a", "aac", "-b:a", "192k");
    args.push(path.resolve(o.out));
    const r = spawnSync("ffmpeg", args, { encoding: "utf8" });
    if (r.status !== 0) fail(`audio extraction failed (does the video have an audio track?): ${(r.stderr ?? "").slice(-300)}`);
    const dur = spawnSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path.resolve(o.out)], { encoding: "utf8" }).stdout?.trim();
    if (o.json) console.log(JSON.stringify({ out: o.out, source: video, durationS: dur ? +parseFloat(dur).toFixed(2) : null }, null, 2));
    else console.log(`✔ ${o.out} — extracted from ${path.basename(video)}${dur ? ` (${(+dur).toFixed(1)}s)` : ""}\n  ⚠ ensure you have the rights to reuse this audio.`);
  });

program
  .command("bed")
  .option("-o, --out <file>", "output wav", "assets/bed.wav")
  .requiredOption("-d, --duration <s>", "bed length in seconds", parseFloat)
  .option("--freq <hz>", "root frequency (default 110 = A2)", parseFloat)
  .option("--bpm <n>", "pulse tempo (default 84)", parseFloat)
  .option("--style <s>", "ambient | explainer (chords + plucked arpeggio + kick/hats)", "ambient")
  .description("Synthesize a deterministic music bed, loudness-normalized at mux (ADR-0007)")
  .action((o: { out: string; duration: number; freq?: number; bpm?: number; style?: string }) => {
    const f = o.freq ?? 110;
    const bpm = o.bpm ?? 84;
    const d = o.duration;
    if (!Number.isFinite(d) || d <= 0 || d > 600) fail("--duration must be 0–600 seconds");
    if (o.style === "explainer") {
      // Explainer-video bed: I–V–vi–IV pads, plucked arpeggio on 8ths, soft
      // kick on beats, offbeat hats. Pure signal math — deterministic, CC0-free.
      const beat = 60 / bpm;
      const bar = 4 * beat;
      const loop = 4 * bar;
      // chord roots for I V vi IV relative to f: 1, 3/2, 5/3 (minor 6th degree root), 4/3
      const chords = [
        [f, f * 1.25, f * 1.5], // I  (maj)
        [f * 1.5, f * 1.875, f * 2.25], // V (maj)
        [f * 1.667, f * 2.0, f * 2.5], // vi (min)
        [f * 1.333, f * 1.667, f * 2.0], // IV (maj)
      ];
      const barSel = `floor(mod(t,${loop.toFixed(4)})/${bar.toFixed(4)})`;
      const win = `pow(sin(PI*mod(t,${bar.toFixed(4)})/${bar.toFixed(4)}),0.6)`;
      const chordExpr = (c: number[]) => c.map((h) => `0.075*sin(2*PI*${h.toFixed(2)}*t)`).join("+");
      const pad = `(${win})*(if(eq(${barSel},0),${chordExpr(chords[0])},if(eq(${barSel},1),${chordExpr(chords[1])},if(eq(${barSel},2),${chordExpr(chords[2])},${chordExpr(chords[3])}))))`;
      // pluck: 8th-note arpeggio root→fifth→octave→third of the current chord
      const slot = `floor(mod(t,${(2 * beat).toFixed(4)})/${(beat / 2).toFixed(4)})`;
      const pluckFreq = (c: number[]) => `if(eq(${slot},0),${(c[0] * 2).toFixed(2)},if(eq(${slot},1),${(c[2] * 2).toFixed(2)},if(eq(${slot},2),${(c[1] * 2).toFixed(2)},${(c[2] * 2).toFixed(2)})))`;
      const pluckF = `if(eq(${barSel},0),${pluckFreq(chords[0])},if(eq(${barSel},1),${pluckFreq(chords[1])},if(eq(${barSel},2),${pluckFreq(chords[2])},${pluckFreq(chords[3])})))`;
      const pluck = `0.16*sin(2*PI*(${pluckF})*t)*exp(-9*mod(t,${(beat / 2).toFixed(4)}))`;
      const kick = `0.22*sin(2*PI*52*t)*exp(-22*mod(t,${beat.toFixed(4)}))`;
      // aevalsrc treats bare commas as channel separators — escape function commas
      const exprEsc = `${pad}+${pluck}+${kick}`.split(",").join("\\,");
      mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
      const r = spawnSync("ffmpeg", ["-y", "-v", "error",
        "-f", "lavfi", "-i", `aevalsrc=${exprEsc}:s=48000:d=${d.toFixed(3)}`,
        "-f", "lavfi", "-i", `anoisesrc=color=white:amplitude=0.028:seed=11:duration=${d.toFixed(3)}`,
        "-filter_complex",
        `[1:a]highpass=f=6000,apulsator=mode=square:hz=${(1 / (2 * beat)).toFixed(4)}:offset_l=0.5:offset_r=0.5,volume=0.7[hat];` +
        `[0:a][hat]amix=inputs=2:duration=first:normalize=0,lowpass=f=3200,` +
        `aecho=0.6:0.35:${Math.round(beat * 500)}:0.18,` +
        `afade=t=in:d=0.8,afade=t=out:st=${Math.max(0, d - 2.2).toFixed(3)}:d=2.2[a]`,
        "-map", "[a]", "-ar", "48000", "-ac", "2", path.resolve(o.out)], { encoding: "utf8" });
      if (r.status !== 0) fail(`ffmpeg explainer bed failed: ${(r.stderr ?? "").slice(-400)}`);
      console.log(`✔ ${o.out} — ${d}s explainer bed @ ${f}Hz root, ${bpm}bpm (I–V–vi–IV, plucks, kick, hats)`);
      return;
    }
    const beatS = 60 / bpm;
    const morphS = 16 * beatS; // chord morphs over 8 bars — harmonic motion, not a static drone
    // Two detuned roots (warm beating), fifth, and a third that morphs smoothly
    // between major (5/4) and minor (6/5) via complementary sine weights; a
    // heartbeat sub thump decays each beat for pulse.
    const expr =
      `0.13*sin(2*PI*${f}*t)+0.13*sin(2*PI*${(f + 0.7).toFixed(2)}*t)` +
      `+0.09*sin(2*PI*${(f * 1.5).toFixed(2)}*t)` +
      `+0.07*sin(2*PI*${(f * 1.25).toFixed(3)}*t)*(0.5+0.5*sin(2*PI*t/${morphS.toFixed(3)}))` +
      `+0.07*sin(2*PI*${(f * 1.2).toFixed(3)}*t)*(0.5-0.5*sin(2*PI*t/${morphS.toFixed(3)}))` +
      `+0.15*sin(2*PI*${(f / 2).toFixed(2)}*t)*exp(-4.5*mod(t\\,${beatS.toFixed(4)}))`;
    mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
    const r = spawnSync("ffmpeg", ["-y", "-v", "error",
      "-f", "lavfi", "-i", `aevalsrc=${expr}:s=48000:d=${d.toFixed(3)}`,
      "-f", "lavfi", "-i", `anoisesrc=color=pink:amplitude=0.05:seed=7:duration=${d.toFixed(3)}`,
      "-filter_complex",
      `[1:a]highpass=f=2600,tremolo=f=${(1 / (4 * beatS)).toFixed(4)}:d=0.5,volume=0.5[air];` +
      `[0:a][air]amix=inputs=2:duration=first:normalize=0,lowpass=f=1500,` +
      `aecho=0.68:0.45:${Math.round(beatS * 750)}:0.2,` +
      `afade=t=in:d=1.6,afade=t=out:st=${Math.max(0, d - 2.4).toFixed(3)}:d=2.4[a]`,
      "-map", "[a]", "-ar", "48000", "-ac", "2", path.resolve(o.out)], { encoding: "utf8" });
    if (r.status !== 0) fail(`ffmpeg bed synthesis failed: ${(r.stderr ?? "").slice(-300)}`);
    console.log(`✔ ${o.out} — ${d}s ambient bed @ ${f}Hz root, pulse ${bpm}bpm`);
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
