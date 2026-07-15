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
