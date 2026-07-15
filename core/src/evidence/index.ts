/**
 * Evidence generator (ADR-0004 layer 3 input): what the VLM critics actually see.
 * - Per-scene hero frames (full resolution, at the scene's settled midpoint)
 * - A labeled contact sheet: 3 samples per scene (entry-settled / mid / pre-exit)
 *   with scene ids + timecodes co-rendered into the image (video-use's
 *   composite-evidence pattern: context lives IN the picture).
 * - Cut strips: last frame of scene N beside first frame of N+1, for judging
 *   transitions and adjacent-diversity by eye.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import type { ScoreT } from "../ir/schema.js";
import type { RenderSession } from "../render/index.js";

const THUMB_W = 480;

function label(text: string, w: number, h: number): Buffer {
  const svg = `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${w}" height="${h}" fill="#111111"/>
    <text x="10" y="${h / 2 + 5}" font-family="monospace" font-size="14" fill="#e8e8e8">${text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")}</text></svg>`;
  return Buffer.from(svg);
}

export interface EvidenceResult {
  contactSheet: string;
  heroFrames: string[];
  cutStrips: string;
}

export async function generateEvidence(
  score: ScoreT,
  session: RenderSession,
  outDir: string
): Promise<EvidenceResult> {
  mkdirSync(outDir, { recursive: true });
  const { width, height } = session.compiled;
  const thumbH = Math.round((THUMB_W / width) * height);
  const labelH = 26;
  const cellH = thumbH + labelH;

  // Hero frames + contact rows
  const heroFrames: string[] = [];
  const rows: Buffer[] = [];
  for (let si = 0; si < score.scenes.length; si++) {
    const sc = score.scenes[si];
    const b = session.compiled.sceneBoundsMs[si];
    const dur = b.endMs - b.startMs;
    const times: Array<[string, number]> = [
      ["in", b.startMs + Math.min(700, dur * 0.35)],
      ["mid", b.startMs + dur / 2],
      ["out", b.endMs - Math.min(250, dur * 0.15)],
    ];

    const heroBuf = await session.seekAndCapture(b.startMs + dur / 2);
    const heroPath = path.join(outDir, `hero-${String(si).padStart(2, "0")}-${sc.id}.png`);
    writeFileSync(heroPath, heroBuf);
    heroFrames.push(heroPath);

    const cells: Buffer[] = [];
    for (const [tag, t] of times) {
      const frame = await sharp(await session.seekAndCapture(t)).resize(THUMB_W, thumbH).png().toBuffer();
      const cell = await sharp({ create: { width: THUMB_W, height: cellH, channels: 3, background: "#111111" } })
        .composite([
          { input: frame, top: 0, left: 0 },
          { input: label(`${sc.id} · ${tag} · ${(t / 1000).toFixed(2)}s`, THUMB_W, labelH), top: thumbH, left: 0 },
        ])
        .png()
        .toBuffer();
      cells.push(cell);
    }
    const row = await sharp({ create: { width: THUMB_W * 3 + 16, height: cellH + 8, channels: 3, background: "#000000" } })
      .composite(cells.map((c, i) => ({ input: c, top: 4, left: i * (THUMB_W + 8) })))
      .png()
      .toBuffer();
    rows.push(row);
  }

  const sheetW = THUMB_W * 3 + 16;
  const sheet = await sharp({
    create: { width: sheetW, height: rows.length * (cellH + 8), channels: 3, background: "#000000" },
  })
    .composite(rows.map((r, i) => ({ input: r, top: i * (cellH + 8), left: 0 })))
    .png()
    .toBuffer();
  const contactSheet = path.join(outDir, "contact-sheet.png");
  writeFileSync(contactSheet, sheet);

  // Cut strips: N.out | N+1.in pairs
  const cutCells: Buffer[] = [];
  for (let si = 0; si < score.scenes.length - 1; si++) {
    const a = session.compiled.sceneBoundsMs[si];
    const bNext = session.compiled.sceneBoundsMs[si + 1];
    const frameMs = 1000 / session.compiled.fps;
    const last = await sharp(await session.seekAndCapture(a.endMs - frameMs)).resize(THUMB_W, thumbH).png().toBuffer();
    const first = await sharp(await session.seekAndCapture(bNext.startMs + frameMs)).resize(THUMB_W, thumbH).png().toBuffer();
    const cell = await sharp({ create: { width: THUMB_W * 2 + 8, height: cellH + 8, channels: 3, background: "#000000" } })
      .composite([
        { input: last, top: 4, left: 0 },
        { input: first, top: 4, left: THUMB_W + 8 },
        {
          input: label(
            `cut ${score.scenes[si].id} → ${score.scenes[si + 1].id} @ ${(a.endMs / 1000).toFixed(2)}s (${score.scenes[si].transitionOut.type})`,
            THUMB_W * 2 + 8,
            labelH
          ),
          top: thumbH + 4,
          left: 0,
        },
      ])
      .png()
      .toBuffer();
    cutCells.push(cell);
  }
  const cutStrips = path.join(outDir, "cut-strips.png");
  if (cutCells.length) {
    const strip = await sharp({
      create: { width: THUMB_W * 2 + 8, height: cutCells.length * (cellH + 16), channels: 3, background: "#000000" },
    })
      .composite(cutCells.map((c, i) => ({ input: c, top: i * (cellH + 16), left: 0 })))
      .png()
      .toBuffer();
    writeFileSync(cutStrips, strip);
  }

  return { contactSheet, heroFrames, cutStrips };
}
