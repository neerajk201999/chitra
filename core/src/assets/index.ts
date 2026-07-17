/**
 * Asset acquisition (ADR-0006). The ONLY place the toolchain touches the
 * network, and only on explicit command — the render path stays hermetic.
 * sharp handles normalization (resize, format, metadata strip); puppeteer's
 * vendored Chrome handles webpage capture. No new dependencies.
 */
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { ensureChrome } from "../render/chrome.js";

export interface AssetReport {
  out: string;
  width: number;
  height: number;
  bytes: number;
  sha256: string;
  source: string;
}

function assertHttpUrl(url: string): URL {
  const u = new URL(url);
  if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error(`only http(s) URLs are supported, got ${u.protocol}`);
  return u;
}

async function normalize(input: Buffer, outFile: string, maxWidth?: number): Promise<AssetReport> {
  const ext = path.extname(outFile).toLowerCase();
  let img = sharp(input, { animated: false }).rotate(); // apply EXIF orientation, then strip metadata
  if (maxWidth) img = img.resize({ width: maxWidth, withoutEnlargement: true });
  const encoded =
    ext === ".jpg" || ext === ".jpeg"
      ? img.jpeg({ quality: 92, mozjpeg: true })
      : ext === ".webp"
        ? img.webp({ quality: 92 })
        : img.png();
  mkdirSync(path.dirname(path.resolve(outFile)), { recursive: true });
  await encoded.toFile(outFile);
  const meta = await sharp(outFile).metadata();
  const bytes = readFileSync(outFile);
  return {
    out: outFile,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    source: "",
  };
}

/** Download an image from the web and normalize it into the project. */
export async function fetchAsset(url: string, outFile: string, opts: { maxWidth?: number } = {}): Promise<AssetReport> {
  assertHttpUrl(url);
  const res = await fetch(url, { headers: { "user-agent": "chitra-asset-fetch/0.1" }, redirect: "follow" });
  if (!res.ok) throw new Error(`fetch failed: HTTP ${res.status} for ${url}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length === 0) throw new Error(`fetch returned an empty body for ${url}`);
  const report = await normalize(buf, outFile, opts.maxWidth);
  report.source = url;
  return report;
}

/** Capture a webpage screenshot with the vendored Chrome and normalize it. */
export async function snapPage(
  url: string,
  outFile: string,
  opts: { width?: number; height?: number; fullPage?: boolean; delayMs?: number; maxWidth?: number; hide?: string[] } = {}
): Promise<AssetReport> {
  assertHttpUrl(url);
  const width = opts.width ?? 1920;
  const height = opts.height ?? 1080;
  const executablePath = await ensureChrome((pct) =>
    console.error(pct === 0 ? "  downloading Chrome for Testing (one-time, ~150MB)…" : `  chrome download ${pct}%`)
  );
  const browser = await puppeteer.launch({ headless: true, executablePath });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor: 2 });
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60_000 });
    // Let late-loading fonts/hero animations settle before capture.
    await new Promise((r) => setTimeout(r, opts.delayMs ?? 1500));
    // Hide capture chrome: explicit selectors, plus fixed-position consent/cookie
    // overlays. Display:none only — never click banners; no consent is granted.
    await page.evaluate((selectors: string[]) => {
      for (const sel of selectors)
        document.querySelectorAll(sel).forEach((n) => ((n as HTMLElement).style.display = "none"));
      document.querySelectorAll<HTMLElement>("body *").forEach((n) => {
        const cs = getComputedStyle(n);
        if ((cs.position === "fixed" || cs.position === "sticky") && /cookie|consent|gdpr/i.test(n.textContent ?? "") && (n.textContent ?? "").length < 600)
          n.style.display = "none";
      });
    }, opts.hide ?? []);
    const shot = (await page.screenshot({ fullPage: opts.fullPage ?? false, type: "png" })) as Buffer;
    const report = await normalize(Buffer.from(shot), outFile, opts.maxWidth);
    report.source = url;
    return report;
  } finally {
    await browser.close();
  }
}

export function writeAssetLog(projectDir: string, report: AssetReport): void {
  // Provenance ledger: every acquired asset's source + hash, appended, committed
  // with the project so a reviewer can trace where every pixel came from.
  const logFile = path.join(projectDir, "assets", "sources.jsonl");
  mkdirSync(path.dirname(logFile), { recursive: true });
  writeFileSync(logFile, JSON.stringify({ ...report, at: new Date().toISOString() }) + "\n", { flag: "a" });
}
