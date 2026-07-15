/**
 * Quality Engine — Layer 2: deterministic gates (ADR-0004).
 * Every rule is ID-tagged to docs/motion/motion-language.md. Static gates
 * read the Score; frame gates read the actual render (text regions + pixels).
 * Severity: P1 blocks release, P2 should fix, P3 note.
 */
import sharp from "sharp";
import type { SceneT, ScoreT } from "../ir/schema.js";
import { resolveSceneTimeline, totalDurationMs } from "../compile/index.js";
import {
  CHOREOGRAPHY,
  DURATIONS,
  PRESETS,
  REGISTERS,
  SAFE_ZONES,
  TYPE_SCALE,
  TYPOGRAPHY,
  type PresetName,
  type Register,
  type SafeZone,
} from "../motion/tokens.js";
import type { RenderSession } from "../render/index.js";

export interface Finding {
  ruleId: string;
  severity: "P1" | "P2" | "P3";
  path: string; // IR path (scenes[2].choreography[1]) or timecode context
  message: string;
  timecodeMs?: number;
}

const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

// ── Static gates ───────────────────────────────────────────────────────────
export function runStaticGates(score: ScoreT): Finding[] {
  const f: Finding[] = [];
  const reg = REGISTERS[score.meta.register as Register];
  const scale = Math.min(score.meta.width, score.meta.height) / 1080;
  const minPx = TYPOGRAPHY.minTextPx1080[score.meta.register as Register] * scale;

  score.scenes.forEach((scene, si) => {
    const p = (rest: string) => `scenes[${si}]${rest}`;
    const resolved = safeResolve(scene);
    if (!resolved) {
      f.push({ ruleId: "IR-REF-1", severity: "P1", path: p(".choreography"), message: "Choreography references an unknown animation id (broken relational timing)" });
      return;
    }

    // Register scene-length bounds
    if (scene.durationMs > reg.maxSceneMs)
      f.push({ ruleId: "MO-EDIT-2", severity: "P2", path: p(".durationMs"), message: `Scene runs ${scene.durationMs}ms; ${score.meta.register} scenes should stay ≤ ${reg.maxSceneMs}ms` });
    if (scene.durationMs < reg.minSceneMs)
      f.push({ ruleId: "MO-EDIT-2", severity: "P1", path: p(".durationMs"), message: `Scene runs ${scene.durationMs}ms; below the ${reg.minSceneMs}ms floor for ${score.meta.register} — unreadable` });

    // MO-CHOR-2: hero discipline
    const heroes = scene.elements.filter((e) => (e as { role?: string }).role === "hero");
    if (heroes.length > 2)
      f.push({ ruleId: "MO-CHOR-2", severity: "P1", path: p(".elements"), message: `${heroes.length} hero elements — one hero motion per scene, everything else supports it` });
    else if (heroes.length === 2)
      f.push({ ruleId: "MO-CHOR-2", severity: "P2", path: p(".elements"), message: "Two hero elements compete; prefer one" });

    // MO-CHOR-1: simultaneity + stagger totals
    for (const r of resolved) {
      if (r.anim.stagger) {
        const n = targetCount(scene, r.anim.target);
        const total = r.anim.stagger.eachMs * Math.max(0, n - 1);
        if (total > CHOREOGRAPHY.maxStaggerTotalMs)
          f.push({ ruleId: "MO-CHOR-1", severity: "P1", path: p(`.choreography[${scene.choreography.indexOf(r.anim)}]`), message: `Stagger total ${total}ms across ${n} targets exceeds ${CHOREOGRAPHY.maxStaggerTotalMs}ms cap` });
      }
    }
    const overlapPeak = peakConcurrency(resolved);
    if (overlapPeak > CHOREOGRAPHY.maxSimultaneousElements)
      f.push({ ruleId: "MO-CHOR-1", severity: "P1", path: p(".choreography"), message: `${overlapPeak} elements animate simultaneously (max ${CHOREOGRAPHY.maxSimultaneousElements})` });

    // MO-DUR-2: exit/entrance ratio
    const enters = new Map<string, number>();
    for (const r of resolved) if (PRESETS[r.anim.preset as PresetName].kind === "enter") enters.set(r.anim.target, r.durationMs);
    for (const r of resolved) {
      if (PRESETS[r.anim.preset as PresetName].kind === "exit") {
        const enterD = enters.get(r.anim.target);
        if (enterD && r.durationMs > enterD)
          f.push({ ruleId: "MO-DUR-2", severity: "P2", path: p(`.choreography[${scene.choreography.indexOf(r.anim)}]`), message: `Exit (${r.durationMs}ms) slower than entrance (${enterD}ms); exits run at ~75% of entrances` });
      }
    }

    // MO-EASE-1/2: overrides
    scene.choreography.forEach((a, ai) => {
      if (a.override) {
        f.push({ ruleId: "MO-EASE-1", severity: "P3", path: p(`.choreography[${ai}]`), message: `Token override in use ("${a.override.reason}") — verify it earns its exception` });
        const kind = PRESETS[a.preset as PresetName].kind;
        if (a.override.gsapEase && kind === "enter" && /\.in(?![A-Za-z(])/.test(a.override.gsapEase))
          f.push({ ruleId: "MO-EASE-2", severity: "P1", path: p(`.choreography[${ai}]`), message: `Entrance with ease-in ("${a.override.gsapEase}") — entrances settle out, never accelerate in` });
      }
    });

    // MO-EDIT-1: reading time
    scene.elements.forEach((el, ei) => {
      if (el.type !== "text") return;
      const enter = resolved.find((r) => r.anim.target === el.id && PRESETS[r.anim.preset as PresetName].kind === "enter");
      const exit = resolved.find((r) => r.anim.target === el.id && PRESETS[r.anim.preset as PresetName].kind === "exit");
      const visibleFrom = enter ? enter.startMs + enter.durationMs * 0.5 : 0;
      const visibleTo = exit ? exit.startMs : scene.durationMs;
      const needMs = (wordCount(el.content) / TYPOGRAPHY.readingWpm) * 60000 * TYPOGRAPHY.readingSafety + TYPOGRAPHY.sceneEntryGraceMs;
      const haveMs = visibleTo - visibleFrom;
      if (haveMs < needMs)
        f.push({ ruleId: "MO-EDIT-1", severity: "P1", path: p(`.elements[${ei}]`), message: `"${el.content.slice(0, 40)}…" visible ${Math.round(haveMs)}ms, needs ${Math.round(needMs)}ms at ${TYPOGRAPHY.readingWpm}wpm×${TYPOGRAPHY.readingSafety}` });

      // MO-TYPE-1: min size
      const px = TYPE_SCALE[el.textRole as keyof typeof TYPE_SCALE] * scale;
      if (px < minPx)
        f.push({ ruleId: "MO-TYPE-1", severity: "P1", path: p(`.elements[${ei}]`), message: `Text renders at ${Math.round(px)}px; minimum for ${score.meta.register} is ${Math.round(minPx)}px` });
    });

    // Elements with no entrance and scenes with no motion
    const animated = new Set(resolved.map((r) => r.anim.target.replace(/\*$/, "")));
    const coverage = motionCoverage(resolved, scene.durationMs);
    if (coverage < reg.minMotionRatio)
      f.push({ ruleId: "MO-REG-1", severity: "P2", path: p(""), message: `Motion covers ${(coverage * 100).toFixed(0)}% of scene; ${score.meta.register} floor is ${reg.minMotionRatio * 100}%` });
    void animated;
  });

  // MO-EDIT-3: adjacent diversity + slideshow risk
  for (let i = 1; i < score.scenes.length; i++) {
    const a = signature(score.scenes[i - 1]);
    const b = signature(score.scenes[i]);
    const diffs = (a.bg !== b.bg ? 1 : 0) + (a.types !== b.types ? 1 : 0) + (a.layout !== b.layout ? 1 : 0) + (a.motion !== b.motion ? 1 : 0);
    if (diffs < 2)
      f.push({ ruleId: "MO-EDIT-3", severity: "P2", path: `scenes[${i}]`, message: `Scene nearly identical in composition to previous (differs on ${diffs}/4 axes) — anti-slideshow rule` });
  }
  const slideshow = score.scenes.filter((s) => {
    const kinds = new Set(s.choreography.map((c) => c.preset));
    const textOnly = s.elements.every((e) => e.type === "text");
    return textOnly && [...kinds].every((k) => String(k).startsWith("fade"));
  });
  if (slideshow.length >= Math.max(2, Math.floor(score.scenes.length * 0.5)))
    f.push({ ruleId: "MO-SLOP-1", severity: "P1", path: "scenes", message: `${slideshow.length}/${score.scenes.length} scenes are fade-only text cards — slideshow slop` });

  // MO-DUR (uniformity slop): identical duration+preset everywhere
  const allAnims = score.scenes.flatMap((s) => s.choreography);
  if (allAnims.length >= 6) {
    const sigs = new Set(allAnims.map((a) => `${a.preset}:${a.duration ?? "d"}`));
    if (sigs.size === 1)
      f.push({ ruleId: "MO-SLOP-2", severity: "P2", path: "scenes", message: "Every animation is the same preset+duration — uniform-timing slop; vary rhythm with intent" });
  }

  return f;
}

function safeResolve(scene: SceneT) {
  try {
    return resolveSceneTimeline(scene);
  } catch {
    return null;
  }
}

function targetCount(scene: SceneT, target: string): number {
  if (target.endsWith("*")) return scene.elements.filter((e) => e.id.startsWith(target.slice(0, -1))).length;
  const el = scene.elements.find((e) => e.id === target);
  if (el?.type === "chart-bar") return el.series.length;
  return 1;
}

function peakConcurrency(resolved: ReturnType<typeof resolveSceneTimeline>): number {
  const events: Array<[number, number]> = [];
  for (const r of resolved) {
    if (PRESETS[r.anim.preset as PresetName].kind === "ambient") continue;
    events.push([r.startMs, 1], [r.startMs + r.durationMs, -1]);
  }
  events.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  let cur = 0, peak = 0;
  for (const [, d] of events) { cur += d; peak = Math.max(peak, cur); }
  return peak;
}

function motionCoverage(resolved: ReturnType<typeof resolveSceneTimeline>, durationMs: number): number {
  const iv = resolved
    .map((r) => [r.startMs, Math.min(durationMs, r.startMs + r.durationMs)] as [number, number])
    .sort((a, b) => a[0] - b[0]);
  let covered = 0, end = 0;
  for (const [s, e] of iv) {
    if (e <= end) continue;
    covered += e - Math.max(s, end);
    end = e;
  }
  return durationMs === 0 ? 0 : covered / durationMs;
}

function signature(scene: SceneT) {
  return {
    bg: `${scene.background}:${scene.backgroundImage ?? ""}`,
    types: scene.elements.map((e) => e.type).sort().join(","),
    layout: scene.elements.map((e) => (e as { position?: { anchor?: string } }).position?.anchor ?? "center").sort().join(","),
    motion: [...new Set(scene.choreography.map((c) => `${c.preset}:${c.direction ?? ""}`))].sort().join(","),
  };
}

// ── Frame gates (need a live render session) ──────────────────────────────
const luminance = (r: number, g: number, b: number) => {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
};
const hexLum = (hex: string) => luminance(parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16));
const contrast = (l1: number, l2: number) => (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

export async function runFrameGates(score: ScoreT, session: RenderSession): Promise<Finding[]> {
  const f: Finding[] = [];
  const zone = SAFE_ZONES[score.meta.safeZone as SafeZone];
  const W = score.meta.width, H = score.meta.height;
  const safe = { x0: W * zone.left, y0: H * zone.top, x1: W * (1 - zone.right), y1: H * (1 - zone.bottom) };

  // Sample each scene at entry-settled point, midpoint, and pre-exit point.
  for (let si = 0; si < score.scenes.length; si++) {
    const b = session.compiled.sceneBoundsMs[si];
    const times = [b.startMs + Math.min(700, (b.endMs - b.startMs) * 0.35), (b.startMs + b.endMs) / 2, b.endMs - Math.min(250, (b.endMs - b.startMs) * 0.15)];
    for (const t of times) {
      const regions = (await session.textRegions(t)).filter((r) => r.visible && r.scene === score.scenes[si].id);
      const shot = t === times[1] ? await session.seekAndCapture(t) : null;

      for (const r of regions) {
        // MO-TYPE-4: safe zones
        if (r.x < safe.x0 - 1 || r.y < safe.y0 - 1 || r.x + r.w > safe.x1 + 1 || r.y + r.h > safe.y1 + 1)
          f.push({ ruleId: "MO-TYPE-4", severity: "P1", path: r.sel, timecodeMs: Math.round(t), message: `Text outside ${score.meta.safeZone} safe zone at ${(t / 1000).toFixed(2)}s` });

        // MO-TYPE-2: contrast — pixel-sampled when over media, palette-computed otherwise
        if (r.overMedia && shot) {
          const region = await sharp(shot)
            .extract({
              left: Math.max(0, Math.round(r.x)),
              top: Math.max(0, Math.round(r.y)),
              width: Math.min(W - Math.round(Math.max(0, r.x)), Math.max(1, Math.round(r.w))),
              height: Math.min(H - Math.round(Math.max(0, r.y)), Math.max(1, Math.round(r.h))),
            })
            .stats();
          const bgLum = luminance(region.channels[0].mean, region.channels[1].mean, region.channels[2].mean);
          const ratio = contrast(hexLum(r.color), bgLum);
          if (ratio < TYPOGRAPHY.minContrast)
            f.push({ ruleId: "MO-TYPE-2", severity: "P1", path: r.sel, timecodeMs: Math.round(t), message: `Text contrast ${ratio.toFixed(1)}:1 over media at ${(t / 1000).toFixed(2)}s (min ${TYPOGRAPHY.minContrast}:1)` });
        }
      }
    }

    // QE-OVERLAP-1: visible text regions must not intersect (settled sample)
    const settled = await session.textRegions(times[1]);
    const vis = settled.filter((r) => r.visible && r.scene === score.scenes[si].id);
    for (let a = 0; a < vis.length; a++) {
      for (let bIdx = a + 1; bIdx < vis.length; bIdx++) {
        const A = vis[a], B = vis[bIdx];
        const ox = Math.min(A.x + A.w, B.x + B.w) - Math.max(A.x, B.x);
        const oy = Math.min(A.y + A.h, B.y + B.h) - Math.max(A.y, B.y);
        if (ox > 2 && oy > 2)
          f.push({ ruleId: "QE-OVERLAP-1", severity: "P1", path: `${A.sel} ∩ ${B.sel}`, timecodeMs: Math.round(times[1]), message: `Text elements overlap by ${Math.round(ox)}×${Math.round(oy)}px at ${(times[1] / 1000).toFixed(2)}s` });
      }
    }

    // Blank-frame detection at scene midpoint
    const mid = await session.seekAndCapture((b.startMs + b.endMs) / 2);
    const stats = await sharp(mid).stats();
    const sd = stats.channels.reduce((s, c) => s + c.stdev, 0) / stats.channels.length;
    if (sd < 1.0)
      f.push({ ruleId: "QE-BLANK-1", severity: "P1", path: `scenes[${si}]`, timecodeMs: Math.round((b.startMs + b.endMs) / 2), message: `Scene midpoint is a near-uniform frame (stdev ${sd.toFixed(2)}) — likely blank render or dead scene` });
  }

  // Static contrast for non-media text (cheap, exact, whole score)
  const p = score.style.palette;
  const bgFor = (scene: SceneT) => (scene.background === "surface" ? p.surface : scene.background === "primary" ? p.primary : p.bg);
  score.scenes.forEach((scene, si) => {
    if (scene.background === "image") return;
    scene.elements.forEach((el, ei) => {
      if (el.type !== "text") return;
      const colorHex = el.color === "text" ? p.text : el.color === "text-dim" ? p.textDim : el.color === "primary" ? p.primary : el.color === "accent" ? p.accent : p.onMedia;
      const ratio = contrast(hexLum(colorHex), hexLum(bgFor(scene)));
      const min = el.textRole === "display" || el.textRole === "headline" ? 3 : TYPOGRAPHY.minContrast; // large-text allowance
      if (ratio < min)
        f.push({ ruleId: "MO-TYPE-2", severity: "P1", path: `scenes[${si}].elements[${ei}]`, message: `Palette contrast ${ratio.toFixed(1)}:1 for "${el.content.slice(0, 30)}" (min ${min}:1)` });
    });
  });

  return f;
}

export function summarize(findings: Finding[]): { p1: number; p2: number; p3: number; releasable: boolean } {
  const p1 = findings.filter((x) => x.severity === "P1").length;
  const p2 = findings.filter((x) => x.severity === "P2").length;
  const p3 = findings.filter((x) => x.severity === "P3").length;
  return { p1, p2, p3, releasable: p1 === 0 };
}
export { totalDurationMs };
