import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateScore, type ScoreT } from "../src/ir/schema.js";
import { compile, resolveSceneTimeline, totalDurationMs } from "../src/compile/index.js";
import { runStaticGates } from "../src/gates/index.js";
import { sceneHash } from "../src/render/index.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const flagship = JSON.parse(
  readFileSync(path.join(here, "../../examples/launch-film/score.json"), "utf8")
);

function validFixture(): ScoreT {
  const v = validateScore(structuredClone(flagship));
  if (!v.ok) throw new Error("flagship fixture must validate: " + JSON.stringify(v.issues));
  return v.score;
}

describe("IR schema (Quality Engine layer 1)", () => {
  it("accepts the flagship score", () => {
    expect(validateScore(flagship).ok).toBe(true);
  });
  it("rejects raw duration overrides without a reason", () => {
    const s = structuredClone(flagship);
    s.scenes[0].choreography[0].override = { durationMs: 3600 }; // no reason
    const r = validateScore(s);
    expect(r.ok).toBe(false);
  });
  it("rejects stagger above the MO-CHOR-1 per-item cap", () => {
    const s = structuredClone(flagship);
    s.scenes[2].choreography[1].stagger = { eachMs: 120, from: "start" };
    expect(validateScore(s).ok).toBe(false);
  });
  it("rejects unknown presets and bad hex colors", () => {
    const s1 = structuredClone(flagship);
    s1.scenes[0].choreography[1].preset = "explode";
    expect(validateScore(s1).ok).toBe(false);
    const s2 = structuredClone(flagship);
    s2.style.palette.bg = "black";
    expect(validateScore(s2).ok).toBe(false);
  });
});

describe("timeline resolution", () => {
  it("chains relational timing (after + offset)", () => {
    const score = validFixture();
    const resolved = resolveSceneTimeline(score.scenes[0]);
    const kicker = resolved.find((r) => r.anim.id === "kicker-in")!;
    const thesis = resolved.find((r) => r.anim.id === "thesis-in")!;
    expect(kicker.startMs).toBe(250);
    expect(thesis.startMs).toBe(kicker.startMs + kicker.durationMs + 120);
  });
  it("throws on unknown dependency", () => {
    const score = validFixture();
    score.scenes[0].choreography[1].at = { after: "nonexistent", offsetMs: 0 };
    expect(() => resolveSceneTimeline(score.scenes[0])).toThrow(/unknown animation/);
  });
});

describe("static gates (Quality Engine layer 2)", () => {
  it("flagship passes with zero P1/P2", () => {
    const f = runStaticGates(validFixture());
    expect(f.filter((x) => x.severity !== "P3")).toEqual([]);
  });
  it("MO-EDIT-1 catches unreadable hold times", () => {
    const score = validFixture();
    const el = score.scenes[1].elements[0];
    if (el.type === "text") el.content = "This sentence is far too long to read in the time this scene allows it to remain on screen for anyone.";
    const f = runStaticGates(score);
    expect(f.some((x) => x.ruleId === "MO-EDIT-1" && x.severity === "P1")).toBe(true);
  });
  it("MO-CHOR-2 catches competing heroes", () => {
    const score = validFixture();
    for (const el of score.scenes[1].elements) (el as { role?: string }).role = "hero";
    const f = runStaticGates(score);
    expect(f.some((x) => x.ruleId === "MO-CHOR-2")).toBe(true);
  });
  it("MO-EDIT-5 catches scenes that open on dead air", () => {
    const score = validFixture();
    // push every entrance in scene 1 past the 20%/600ms deadline
    for (const a of score.scenes[1].choreography)
      if (!a.override) a.at = { after: "scene-start", offsetMs: 2000 };
    const f = runStaticGates(score);
    expect(f.some((x) => x.ruleId === "MO-EDIT-5")).toBe(true);
    expect(runStaticGates(validFixture()).some((x) => x.ruleId === "MO-EDIT-5")).toBe(false);
  });

  it("MO-SLOP-1 catches fade-only text-card slideshows", () => {
    const score = validFixture();
    score.scenes = score.scenes.slice(0, 2).map((sc, i) => ({
      ...sc,
      id: `card-${i}`,
      elements: sc.elements.filter((e) => e.type === "text"),
      choreography: sc.elements
        .filter((e) => e.type === "text")
        .map((e, j) => ({
          id: `a-${j}`,
          target: e.id,
          preset: "fade-in",
          at: { after: "scene-start" as const, offsetMs: 0 },
        })),
      transitionOut: { type: "cut" as const, duration: "standard" as const },
    })) as ScoreT["scenes"];
    const v = validateScore(score);
    expect(v.ok).toBe(true);
    const f = runStaticGates(v.ok ? v.score : score);
    expect(f.some((x) => x.ruleId === "MO-SLOP-1")).toBe(true);
  });
});

describe("compiler determinism surface", () => {
  it("compiles to identical HTML for identical input", () => {
    const a = compile(validFixture()).html;
    const b = compile(validFixture()).html;
    expect(a).toBe(b);
  });
  it("scene hashes change only for touched scenes", () => {
    const base = validFixture();
    const edited = validFixture();
    const el = edited.scenes[3].elements.find((e) => e.type === "text");
    if (el && el.type === "text") el.content = "Changed.";
    // Editing scene 3 dirties scenes 2..4: 2's transition tail shows 3, and
    // 3's fade-through-black tail paints into 4. Distant scenes stay cached.
    expect(sceneHash(edited, 2)).not.toBe(sceneHash(base, 2));
    expect(sceneHash(edited, 3)).not.toBe(sceneHash(base, 3));
    expect(sceneHash(edited, 4)).not.toBe(sceneHash(base, 4));
    expect(sceneHash(edited, 0)).toBe(sceneHash(base, 0));
    expect(sceneHash(edited, 5)).toBe(sceneHash(base, 5));
  });
  it("total duration is the sum of scenes", () => {
    const s = validFixture();
    expect(totalDurationMs(s)).toBe(s.scenes.reduce((a, x) => a + x.durationMs, 0));
  });
  it("page exposes the seek contract", () => {
    const { html } = compile(validFixture());
    for (const needle of ["window.__chitra", "seek: function", "textRegions", "@font-face"])
      expect(html).toContain(needle);
    // Our runtime (the last script block — after the vendored GSAP bundle)
    // must never read the wall clock or use unseeded randomness.
    const runtime = html.split("<script>").pop()!;
    expect(runtime).not.toContain("Date.now");
    expect(runtime).not.toContain("Math.random");
  });
});

describe("media assets (ADR-0006)", () => {
  const withImage = (scrim: number, color?: string) => {
    const s = validFixture();
    s.scenes[0].elements.push({
      type: "image", id: "shot", role: "support", src: "assets/shot.png",
      fit: "cover", position: { anchor: "center", x: 50, y: 50 },
      width: 60, height: 60, radius: 2, scrim,
    } as never);
    if (color) (s.scenes[1].elements as { color?: string }[]).forEach((e) => { if (e.color === "text" || e.color === undefined) e.color = color; });
    return s;
  };
  it("rejects remote and absolute src (render path must stay hermetic)", () => {
    const s = structuredClone(flagship);
    s.scenes[0].elements.push({ type: "image", id: "x", src: "https://example.com/a.png" });
    expect(validateScore(s).ok).toBe(false);
    s.scenes[0].elements[s.scenes[0].elements.length - 1].src = "/etc/a.png";
    expect(validateScore(s).ok).toBe(false);
  });
  it("MO-MED-1: text over unscrimmed media is a P2; scrim clears it", () => {
    const bad = runStaticGates(withImage(0)).filter((f) => f.ruleId === "MO-MED-1");
    expect(bad.length).toBeGreaterThan(0);
    expect(bad[0].severity).toBe("P2");
    const good = runStaticGates(withImage(0.4)).filter((f) => f.ruleId === "MO-MED-1");
    expect(good.length).toBe(0);
  });
  it("sceneHash digests asset bytes: editing the image invalidates its scene", async () => {
    const { mkdtempSync, writeFileSync: wf, mkdirSync: mk } = await import("node:fs");
    const os = await import("node:os");
    const dir = mkdtempSync(path.join(os.tmpdir(), "chitra-asset-"));
    mk(path.join(dir, "assets"), { recursive: true });
    wf(path.join(dir, "assets/shot.png"), Buffer.from("fake-png-v1"));
    const s = withImage(0.4);
    const h1 = sceneHash(s, 0, dir);
    const h0 = sceneHash(s, 1, dir); // neighbor: also depends on the asset
    wf(path.join(dir, "assets/shot.png"), Buffer.from("fake-png-v2"));
    expect(sceneHash(s, 0, dir)).not.toBe(h1);
    expect(sceneHash(s, 1, dir)).not.toBe(h0);
    expect(sceneHash(s, 4, dir)).toBe(sceneHash(s, 4, dir));
    expect(() => sceneHash({ ...s, scenes: s.scenes.map((sc, i) => i === 0 ? { ...sc, elements: sc.elements.map((e) => e.type === "image" ? { ...e, src: "assets/missing.png" } : e) } : sc) } as never, 0, dir)).toThrow(/asset not found/);
  });
});

describe("video-in-scene + audio v2 (ADR-0007)", () => {
  it("rejects remote video src and accepts local clips with sfx", () => {
    const s = structuredClone(flagship);
    s.scenes[0].elements.push({ type: "video", id: "clip", src: "https://x.com/a.mp4" });
    expect(validateScore(s).ok).toBe(false);
    const s2 = structuredClone(flagship);
    s2.scenes[0].elements.push({ type: "video", id: "clip", src: "assets/a.mp4" });
    s2.scenes[0].choreography[1].sfx = { src: "assets/sfx/whoosh.wav", gainDb: -14 };
    expect(validateScore(s2).ok).toBe(true);
  });
  it("MO-AUD-3 flags SFX-dense scenes", () => {
    const s = validFixture();
    for (const a of s.scenes[1].choreography) (a as { sfx?: object }).sfx = { src: "assets/sfx/tick.wav", gainDb: -14 };
    const f = runStaticGates(s).filter((x) => x.ruleId === "MO-AUD-3");
    expect(s.scenes[1].choreography.length).toBeGreaterThan(2);
    expect(f.length).toBe(1);
  });
  it("compiles video elements to frame-swap imgs with a media runtime", () => {
    const s = validFixture();
    s.scenes[0].elements.push({ type: "video", id: "clip", src: "assets/a.mp4", fit: "cover",
      position: { anchor: "center", x: 50, y: 50 }, width: 60, height: 60, radius: 2, scrim: 0, startMs: 0, role: "hero" } as never);
    const { html } = compile(s);
    expect(html).toContain('data-vid="cold-open--clip"');
    expect(html).toContain("setMedia");
    expect(html).toContain("VIDMETA");
  });
});

describe("figures & interaction choreography (ADR-0008)", () => {
  it("sanitizer strips scripts, handlers, and external refs but keeps UI markup", async () => {
    const { sanitizeFragment } = await import("../src/compile/index.js");
    const dirty = `<div class="card" onclick="evil()" style="background:var(--surface)">
      <script>alert(1)</script><iframe src="https://x.com"></iframe>
      <img src="https://remote/x.png"/><a href="javascript:void(0)">ok</a>
      <button style="background:url(https://a/b.png)">Send</button></div>`;
    const clean = sanitizeFragment(dirty);
    for (const bad of ["<script", "<iframe", "onclick", "https://remote", "javascript:", "url(https"])
      expect(clean.toLowerCase()).not.toContain(bad);
    expect(clean).toContain('class="card"');
    expect(clean).toContain("var(--surface)");
    expect(clean).toContain("<button");
  });
  it("IR-CUR-1 gates waypoint misuse and wrong-kind targets", () => {
    const s = validFixture();
    s.scenes[0].elements.push({ type: "cursor", id: "cur" } as never);
    s.scenes[0].choreography.push(
      { id: "bad-way", target: "thesis", preset: "fade-in", waypoints: [{ x: 10, y: 10 }], at: { after: "scene-start", offsetMs: 0 } } as never,
      { id: "no-way", target: "cur", preset: "cursor-move", at: { after: "scene-start", offsetMs: 0 } } as never,
      { id: "bad-type", target: "cur", preset: "type-in", at: { after: "scene-start", offsetMs: 0 } } as never,
    );
    const hits = runStaticGates(s).filter((x) => x.ruleId === "IR-CUR-1");
    expect(hits.length).toBe(3);
  });
  it("type-in splits target text into char spans with a caret", () => {
    const s = validFixture();
    s.scenes[0].choreography.push({ id: "t", target: "thesis", preset: "type-in", at: { after: "scene-start", offsetMs: 0 } } as never);
    const html = compile(validFixture()).html;
    const typedHtml = compile(s).html;
    expect(html).not.toContain('class="ch"');
    expect(typedHtml).toContain('class="ch"');
    expect(typedHtml).toContain('class="caret"');
  });
});

describe("figure internals as nested comps (ADR-0008)", () => {
  it("figureId/innerId compiles to a scoped selector and gates on the figure's existence", () => {
    const s = validFixture();
    s.scenes[0].choreography.push({ id: "inner", target: "ghost/menu", preset: "fade-up", at: { after: "scene-start", offsetMs: 100 } } as never);
    const hits = runStaticGates(s).filter((x) => x.ruleId === "IR-REF-2");
    expect(hits.length).toBe(1); // no figure named ghost
    const v = validateScore(structuredClone(s));
    expect(v.ok).toBe(true); // syntax itself is legal
  });
});

describe("figure state continuity (IR-FIG-1)", () => {
  it("flags internals changed in scene N but not re-declared in the continuing scene", () => {
    const s = validFixture();
    const fig = { type: "figure", id: "card", src: "figures/x.html", position: { anchor: "center", x: 50, y: 46 }, width: 40, height: 24 };
    s.scenes[0].elements.push(structuredClone(fig) as never);
    s.scenes[1].elements.push(structuredClone(fig) as never);
    s.scenes[0].choreography.push({ id: "ph-out", target: "card/ph", preset: "fade-out", at: { after: "scene-start", offsetMs: 300 } } as never);
    const hits = runStaticGates(s).filter((x) => x.ruleId === "IR-FIG-1");
    expect(hits.length).toBe(1);
    // re-declaring with `hide` clears it
    s.scenes[1].choreography.push({ id: "ph-off", target: "card/ph", preset: "hide", at: { after: "scene-start", offsetMs: 0 } } as never);
    expect(runStaticGates(s).filter((x) => x.ruleId === "IR-FIG-1").length).toBe(0);
  });
});

describe("particle fields (ADR-0009)", () => {
  const withField = (over: object = {}) => {
    const s = validFixture();
    s.scenes[0].elements.push({ type: "particles", id: "field", formation: "grid", cols: 8, rows: 6, dotSize: 7, position: { anchor: "center", x: 50, y: 50 }, width: 40, height: 40, ...over } as never);
    const v = validateScore(s);
    return v.ok ? v.score : s;
  };
  it("renders a deterministic dot field and shimmer is seek-stable", () => {
    const s = withField();
    s.scenes[0].choreography.push({ id: "sh", target: "field", preset: "particle-shimmer", at: { after: "scene-start", offsetMs: 0 } } as never);
    const a = compile(s).html, b = compile(s).html;
    expect(a).toBe(b);
    expect((a.match(/class="pdot"/g) || []).length).toBe(48);
  });
  it("MO-PART-1 caps dot count and confines morphTo to particle-morph", () => {
    const big = runStaticGates(withField({ cols: 24, rows: 24 })).filter((x) => x.ruleId === "MO-PART-1");
    expect(big.some((x) => x.severity === "P1")).toBe(true);
    const s = withField();
    s.scenes[0].choreography.push({ id: "bad", target: "field", preset: "particle-shimmer", morphTo: "ring", at: { after: "scene-start", offsetMs: 0 } } as never);
    expect(runStaticGates(s).some((x) => x.ruleId === "MO-PART-1")).toBe(true);
  });
  it("particle presets must target a particles element", () => {
    const s = validFixture();
    s.scenes[0].choreography.push({ id: "wrong", target: "thesis", preset: "particle-form", at: { after: "scene-start", offsetMs: 0 } } as never);
    expect(runStaticGates(s).some((x) => x.ruleId === "MO-PART-1")).toBe(true);
  });
});

describe("audio-reactive timeline (ADR-0011)", () => {
  it("onBeat resolves to scene-relative time and errors without beats", async () => {
    const { resolveSceneTimeline } = await import("../src/compile/index.js");
    const s = validFixture();
    s.scenes[1].choreography[0].at = { onBeat: 2, offsetMs: 0 } as never;
    const beats = [0, 1000, 2000, 3000];
    // scene 1 starts at scene0.duration; onBeat 2 = 2000ms absolute
    const start = s.scenes[0].durationMs;
    const r = resolveSceneTimeline(s.scenes[1], { sceneStartMs: start, beats });
    expect(r[0].startMs).toBe(Math.max(0, 2000 - start));
    expect(() => resolveSceneTimeline(s.scenes[1], { sceneStartMs: start })).toThrow(/beats/);
  });
  it("MO-AUD-4 blocks onBeat without a declared beat grid", () => {
    const s = validFixture();
    s.scenes[0].choreography[0].at = { onBeat: 1, offsetMs: 0 } as never;
    expect(runStaticGates(s).some((x) => x.ruleId === "MO-AUD-4" && x.severity === "P1")).toBe(true);
  });
});

describe("real 3D scene (ADR-0010)", () => {
  const with3d = (over: object = {}) => {
    const s = validFixture();
    s.scenes[0].elements.push({ type: "scene3d", id: "card3d", primitive: "card", baseColor: "surface", envTint: "accent", position: { anchor: "center", x: 50, y: 45 }, width: 70, height: 48, ...over } as never);
    const v = validateScore(s);
    return v.ok ? v.score : s;
  };
  it("inlines Three + a canvas only when a scene3d is present; deterministic compile", () => {
    const plain = compile(validFixture()).html;
    expect(plain).not.toContain('data-3d=');
    expect(plain).not.toContain("PMREMGenerator");
    const s = with3d();
    const a = compile(s).html, b = compile(s).html;
    expect(a).toBe(b); // deterministic source
    expect(a).toContain('data-3d="cold-open--card3d"');
    expect(a).toContain("WebGLRenderer");
    expect(a).toContain("window.__three3d");
  });
  it("MO-3D-1 flags agitated spin", () => {
    expect(runStaticGates(with3d({ spinDeg: 38 })).some((x) => x.ruleId === "MO-3D-1")).toBe(true);
    expect(runStaticGates(with3d({ spinDeg: 16 })).some((x) => x.ruleId === "MO-3D-1")).toBe(false);
  });
});
