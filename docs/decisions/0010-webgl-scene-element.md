# ADR-0010 — WebGL scene element (real 3D) — SCOPED, NOT YET BUILT

**Status:** accepted · building 2026-07-15. Determinism spike PASSED: headless Chrome with `--use-angle=swiftshader` renders Three.js byte-identically on re-render and produces a genuine 3D card (perspective, clearcoat, PMREM environment). WebGL flags added conditionally (only when a scene3d is present) so 2D renders stay byte-identical to before.

## Context

The single reason Chitra cannot reproduce a 3D-rendered reference "exactly" is
that it has no real 3D. CSS `perspective` on a figure approximates a flat card;
it cannot do travelling specular highlights, depth of field, or true rotation.
Remotion ships `@remotion/three`. This is the honest visual gap
(docs/research/honest-gap-vs-remotion-editframe.md §1).

## Proposed decision (to implement in a later, dedicated pass)

1. **`scene3d` element** — a vetted, self-contained Three.js scene we drive, not
   arbitrary user script. Author picks from curated 3D primitives (card, phone,
   logo-extrude, particle-cloud) parameterized by tokens; we own the Three code.
2. **Determinism via seek clock.** The scene never reads the wall clock; its only
   time input is our `seek(ms)`. Three.js is deterministic under a fixed clock
   and fixed geometry/seed, exactly like GSAP — so byte-identical re-render holds.
   Requires allowing ONE vetted `<canvas>`+module in the compiled page (a
   controlled exception to the figure sanitizer, scoped to our own bundle).
3. **Gated like everything else.** 3D scenes render to pixels the frame gates
   already read; a new MO-3D rule bounds camera speed and requires the subject to
   settle (no perpetual spin = slop).

## Why not now

Doing this half-way (a janky 3D card) would be worse than an honest "not yet."
It needs its own pass: bundle a pinned Three build, prove determinism across
machines (golden-frame CI, currently an M5 item), design the curated primitive
set. Scoped here so the gap is on the record and the plan is real. ADR-0011
(audio-reactive) ships first because it is tractable and unblocks scored motion
for the 2D films that are most of the market.
