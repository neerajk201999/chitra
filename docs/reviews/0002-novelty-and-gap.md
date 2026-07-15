# What Is Actually Novel, What Is Borrowed, and Why This Is Not Yet the Best — 2026-07-15

The document every claim traces back to. No marketing register permitted. Update whenever a claim changes status.

## Lineage — what Chitra is built on

Chitra is an **independent implementation on common primitives**, not a wrapper:

```
Remotion:     React code   → bundle   → headless Chrome → frames → FFmpeg
HyperFrames:  HTML file    → seek eng → headless Chrome → frames → FFmpeg
Chitra:       Motion IR    → compiler → headless Chrome → frames → FFmpeg
```

Zero code is taken from HyperFrames or Remotion (both were read, neither is a dependency; Remotion's license forbids derivation and we honor that by clean-room design, ADR-0002). The browser+FFmpeg substrate is the industry-converged primitive — there are only a handful of ways to render deterministic HTML to video, and all three projects independently landed on the same one. GSAP, Chrome, FFmpeg, sharp, zod, and Fontsource fonts are used as libraries under their own licenses.

## Genuinely novel (not found in any studied competitor)

1. **The schema-as-taste-enforcement move.** Animations *cannot express* raw easings/durations — the IR admits only motion-language tokens, with a reasoned override as the audited escape hatch. Competitors enforce taste with prose (HyperFrames' 372K words) or don't enforce it at all (Remotion). Making slop *unrepresentable* rather than *discouraged* is Chitra's core original idea.
2. **Two-tier IR with judgeable intent.** `Direction` (why) + `Score` (what) lets critics evaluate *intent-match* ("did the declared hero moment actually peak?"). OpenMontage has intent fields but nothing consumes them; nobody else has the pairing.
3. **A measured quality engine for motion design.** ID-tagged deterministic gates (reading speed, per-frame contrast over media, beat-grid cuts, anti-slideshow, overlap, blank-frame) with a seeded-defect benchmark reporting a catch rate (currently 10/10 on deterministic-detectable defects). No studied system measures its own quality layer.
4. **Neighbor-aware per-scene render cache** keyed on content hash + compiler version — surgical re-render as a *correctness-guaranteed* feature, not a best-effort optimization.

## Borrowed, with credit (and improved or intended-to-improve)

| Idea | Source | Status in Chitra |
|---|---|---|
| seek-protocol deterministic capture, Chrome flag set | HyperFrames | adopted; their BeginFrame-flag trap documented and avoided |
| frame-purity, seamless-concat distributed design | Remotion | frame-purity adopted; distribution designed, NOT built |
| register system, two-altitude slop test, isolated hybrid critique | Impeccable | adopted and extended to time (pacing, cut, beat rules) |
| composite evidence images, bounded ≤3-pass loop | video-use | adopted (contact sheets, cut strips) |
| per-decision `reason` fields, deterministic pre-render slop gates | OpenMontage | adopted; enforced in code rather than markdown |
| relational timing | EditFrame | partially adopted (after-chains); contain/fit modes not built |

## Why Chitra is not the best yet (the honest distance)

1. **Output ceiling.** The flagship is a clean, competent motion-graphics film. Apple/CRED work has bespoke illustration, 3D, camera language, sound design, and human editorial obsession. The IR's 14 presets and 5 element types cannot express that today. Best-in-class *architecture* ≠ best-in-class *output*.
2. **The moat is half-measured.** Deterministic gates: measured. The VLM critic — the part that judges *aesthetics* — has no calibration data yet (being addressed in `benchmarks/critic-calibration/`).
3. **Zero head-to-head data.** No blind A/B against HyperFrames exists. Until ChitraBench (M4) runs, "beats X" is a hypothesis and must never appear as a statement of fact.
4. **Distribution loses to HyperFrames today.** One-command install, four channels, 20 workflows vs. our clone-and-build with two skills.
5. **Speed.** ~2 fps/worker single-browser rendering; competitors parallelize.

## The path to actually being best (traceable, in order)

1. Calibrated critic (M2): labeled evidence sets → measured agreement/false-positive rate → tune rubric → re-measure.
2. Vocabulary growth without slop (M3): new presets/elements (mask reveals, keyframe-curve presets, video-in-scene, chart family) each entering through the motion-language protocol: draft rule → gate → benchmark case.
3. Distribution parity (M3): npm package, per-harness compiled skills, <10-min cold start verified by outside users.
4. ChitraBench (M4): pre-registered blind A/B on identical briefs vs HyperFrames baselines; publish everything including losses.
5. Speed (M5): per-scene parallel browsers (cache already segments the work), BeginFrame on Linux, static-frame dedup.
