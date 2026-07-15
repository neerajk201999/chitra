/**
 * Deterministic renderer (ADR-0002, stack-validation §1–§4).
 *
 * Mechanism: compiled page exposes window.__chitra.seek(ms); we drive the
 * paused GSAP master timeline frame by frame and capture PNG screenshots
 * ("screenshot mode" — portable everywhere; BeginFrame mode is a later,
 * Linux-only optimization behind this same interface).
 *
 * Caching: frames land in <cache>/<sceneHash>/ per scene; unchanged scenes
 * are never re-rendered. Encoding pipes cached PNGs to ffmpeg in order.
 */
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { mkdirSync, existsSync, readFileSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import puppeteer, { type Browser, type Page } from "puppeteer";
import type { ScoreT } from "../ir/schema.js";
import { compile, type CompileResult } from "../compile/index.js";

/**
 * Chrome flags mined from HyperFrames' engine (docs/research/stack-validation.md §2).
 * NOTE: --deterministic-mode / --run-all-compositor-stages-before-draw are
 * BeginFrame-mode flags — in screenshot mode they stall the compositor waiting
 * for BeginFrame signals that never come, yielding blank captures (verified
 * empirically; HyperFrames documents the same trap in browserManager.ts).
 */
const DETERMINISTIC_FLAGS = [
  "--disable-threaded-animation",
  "--disable-threaded-scrolling",
  "--disable-checker-imaging",
  "--disable-image-animation-resync",
  "--font-render-hinting=none",
  "--force-color-profile=srgb",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--hide-scrollbars",
  "--disable-dev-shm-usage",
  "--no-sandbox",
];

export type Quality = "draft" | "standard" | "high";
const ENCODE = {
  draft: { preset: "ultrafast", crf: 28 },
  standard: { preset: "medium", crf: 18 },
  high: { preset: "slow", crf: 15 },
} as const;

/**
 * Bumped whenever compiler output changes for identical IR (new presets,
 * markup changes, GSAP upgrades). Part of every scene hash — without it the
 * cache serves frames compiled by an older compiler.
 */
export const COMPILER_CACHE_VERSION = "2";

export function sceneHash(score: ScoreT, sceneIndex: number): string {
  const scene = score.scenes[sceneIndex];
  const basis = JSON.stringify({
    compilerV: COMPILER_CACHE_VERSION,
    scene,
    style: score.style,
    meta: score.meta,
    irV: score.irVersion,
    // A scene's frames depend on its neighbors: the NEXT scene is visible under
    // this scene's transition tail (crossfade/wipe/push), and the PREVIOUS
    // scene's fade-through-black tail paints into this scene's first frames.
    nextScene: score.scenes[sceneIndex + 1] ?? null,
    prevScene: score.scenes[sceneIndex - 1] ?? null,
  });
  return createHash("sha256").update(basis).digest("hex").slice(0, 16);
}

export interface RenderSession {
  browser: Browser;
  page: Page;
  compiled: CompileResult;
  pageFile: string;
  close(): Promise<void>;
  seekAndCapture(ms: number): Promise<Buffer>;
  textRegions(ms: number): Promise<TextRegion[]>;
}

export interface TextRegion {
  sel: string;
  scene: string;
  visible: boolean;
  overMedia: boolean;
  color: string;
  fontSizePx: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Compile the score, write the page next to the project assets, open a driven browser. */
export async function openSession(score: ScoreT, projectDir: string, workDir: string): Promise<RenderSession> {
  const compiled = compile(score);
  mkdirSync(workDir, { recursive: true });
  // Page lives in the project dir so relative asset paths (images) resolve.
  // Absolute path required: file:// URLs cannot be relative.
  const pageFile = path.resolve(projectDir, ".chitra-page.html");
  writeFileSync(pageFile, compiled.html);

  const browser = await puppeteer.launch({ headless: true, args: DETERMINISTIC_FLAGS });
  const page = await browser.newPage();
  await page.setViewport({ width: compiled.width, height: compiled.height, deviceScaleFactor: 1 });
  await page.goto(`file://${pageFile}`, { waitUntil: "load" });
  const readiness = (await page.evaluate("window.__chitra.ready()")) as {
    fontsOk: boolean;
    missingTargets: string[];
    badImages?: string[];
  };
  if (!readiness.fontsOk) throw new Error("Fonts failed to load — compiled page is not deterministic");
  if (readiness.missingTargets.length)
    throw new Error(`Choreography targets missing in DOM: ${readiness.missingTargets.join(", ")} (compiler bug or bad IR target)`);
  if (readiness.badImages?.length)
    throw new Error(`Images failed to load: ${readiness.badImages.join(", ")} — check paths are relative to the score's directory`);

  const stage = await page.$("#stage");
  if (!stage) throw new Error("No #stage in compiled page");

  return {
    browser,
    page,
    compiled,
    pageFile,
    async close() {
      await browser.close();
    },
    async seekAndCapture(ms: number) {
      await page.evaluate(`window.__chitra.seek(${ms})`);
      return Buffer.from(await stage.screenshot({ type: "png" }));
    },
    async textRegions(ms: number) {
      await page.evaluate(`window.__chitra.seek(${ms})`);
      return (await page.evaluate("window.__chitra.textRegions()")) as TextRegion[];
    },
  };
}

export interface RenderResult {
  outFile: string;
  totalFrames: number;
  renderedFrames: number;
  cachedFrames: number;
  durationMs: number;
  wallMs: number;
}

export interface RenderOptions {
  quality?: Quality;
  cacheDir?: string;
  onProgress?: (done: number, total: number) => void;
}

export async function renderScore(
  score: ScoreT,
  projectDir: string,
  outFile: string,
  opts: RenderOptions = {}
): Promise<RenderResult> {
  const t0 = Date.now();
  const quality = opts.quality ?? "standard";
  const cacheDir = opts.cacheDir ?? path.join(projectDir, ".chitra-cache");
  const session = await openSession(score, projectDir, cacheDir);
  const { compiled } = session;
  const fps = compiled.fps;
  const frameMs = 1000 / fps;

  try {
    // Per-scene frame plan
    let rendered = 0;
    let cached = 0;
    let done = 0;
    const framePaths: string[] = [];
    const totalFrames = Math.round((compiled.durationMs / 1000) * fps);

    for (let s = 0; s < score.scenes.length; s++) {
      const bounds = compiled.sceneBoundsMs[s];
      const hash = sceneHash(score, s);
      const dir = path.join(cacheDir, hash);
      const firstFrame = Math.ceil(bounds.startMs / frameMs - 1e-6);
      const endFrame = Math.min(totalFrames, Math.ceil(bounds.endMs / frameMs - 1e-6));
      const count = endFrame - firstFrame;
      const complete = existsSync(path.join(dir, "done")) && readdirSync(dir).length >= count + 1;
      mkdirSync(dir, { recursive: true });
      for (let f = 0; f < count; f++) {
        const file = path.join(dir, `f${String(f).padStart(6, "0")}.png`);
        framePaths.push(file);
        if (complete) {
          cached++;
          done++;
          continue;
        }
        const ms = (firstFrame + f) * frameMs;
        writeFileSync(file, await session.seekAndCapture(ms));
        rendered++;
        done++;
        opts.onProgress?.(done, totalFrames);
      }
      if (!complete) writeFileSync(path.join(dir, "done"), hash);
    }

    // Encode: pipe PNGs in order (stack-validation §4)
    const enc = ENCODE[quality];
    mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
    const music = score.audio?.music;
    if (music) {
      const silent = outFile.replace(/(\.[a-z0-9]+)?$/i, ".video-only.mp4");
      await pipeEncode(framePaths, fps, silent, enc.preset, enc.crf);
      await muxMusic(silent, path.resolve(projectDir, music.src), outFile, {
        durationS: compiled.durationMs / 1000,
        gainDb: music.gainDb,
        fadeOutMs: music.fadeOutMs,
      });
      rmSync(silent, { force: true });
    } else {
      await pipeEncode(framePaths, fps, outFile, enc.preset, enc.crf);
    }

    // Prune cache entries no longer referenced by this score — frame caches are
    // hundreds of full-HD PNGs per scene and grow without bound otherwise
    // (this filled a user's disk once; never again).
    const keep = new Set(score.scenes.map((_, i) => sceneHash(score, i)));
    for (const d of readdirSync(cacheDir, { withFileTypes: true }))
      if (d.isDirectory() && !keep.has(d.name)) rmSync(path.join(cacheDir, d.name), { recursive: true, force: true });

    return {
      outFile,
      totalFrames: framePaths.length,
      renderedFrames: rendered,
      cachedFrames: cached,
      durationMs: compiled.durationMs,
      wallMs: Date.now() - t0,
    };
  } finally {
    await session.close();
  }
}

/**
 * Mux a music bed onto a silent video: pre-gain trim → loudness normalization
 * to -14 LUFS (MO-AUD-1, the streaming/social target) → tail fade → AAC.
 * Music shorter than the video pads with silence; longer is trimmed.
 */
function muxMusic(
  videoFile: string,
  musicFile: string,
  outFile: string,
  opts: { durationS: number; gainDb: number; fadeOutMs: number }
): Promise<void> {
  if (!existsSync(musicFile)) return Promise.reject(new Error(`Music file not found: ${musicFile}`));
  const fadeS = opts.fadeOutMs / 1000;
  const fadeStart = Math.max(0, opts.durationS - fadeS);
  const filter =
    `[1:a]volume=${opts.gainDb}dB,` +
    `loudnorm=I=-14:TP=-1.5:LRA=11,` +
    `apad,atrim=0:${opts.durationS.toFixed(3)},` +
    `afade=t=out:st=${fadeStart.toFixed(3)}:d=${fadeS.toFixed(3)}[a]`;
  return runFfmpeg([
    "-y",
    "-i", videoFile,
    "-i", musicFile,
    "-filter_complex", filter,
    "-map", "0:v", "-c:v", "copy",
    "-map", "[a]", "-c:a", "aac", "-b:a", "192k",
    "-movflags", "+faststart",
    outFile,
  ]);
}

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let err = "";
    ff.stderr.on("data", (d) => (err += d));
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}:\n${err.slice(-2000)}`))));
    ff.on("error", reject);
  });
}

function pipeEncode(frames: string[], fps: number, outFile: string, preset: string, crf: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-f", "image2pipe",
      "-framerate", String(fps),
      "-i", "-",
      "-c:v", "libx264",
      "-preset", preset,
      "-crf", String(crf),
      "-pix_fmt", "yuv420p",
      // BT.709 tagging; Chrome screenshots are sRGB (stack-validation §4)
      "-vf", "scale=in_range=full:out_range=limited,format=yuv420p",
      "-colorspace", "bt709", "-color_primaries", "bt709", "-color_trc", "bt709",
      "-movflags", "+faststart",
      outFile,
    ];
    const ff = spawn("ffmpeg", args, { stdio: ["pipe", "ignore", "pipe"] });
    let err = "";
    ff.stderr.on("data", (d) => (err += d));
    ff.on("close", (code) => (code === 0 ? resolve() : reject(new Error(`ffmpeg exited ${code}:\n${err.slice(-2000)}`))));
    ff.on("error", reject);
    (async () => {
      try {
        for (const f of frames) {
          const buf = readFileSync(f);
          if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
        }
        ff.stdin.end();
      } catch (e) {
        reject(e as Error);
      }
    })();
  });
}
