# Adversarial Adoption Review — 2026-07-15

Reviewed as if by the lead engineers of HyperFrames, Remotion, and EditFrame deciding whether to adopt Chitra. Mandate: identify every architectural weakness, unsupported claim, missing benchmark, scalability issue, UX flaw, and quality gap. No defense permitted. Findings verified hands-on against the code (broken-score CLI runs, render probes, cache measurements).

**Verdict: conditional adopt.** The IR + gates + evidence architecture is genuinely differentiated and the closed loop is real. But v0.1 shipped with silent-failure gaps of its own, overstated claims, and a product surface far narrower than its vision language. Items marked ✅ were fixed in the same change-set as this review; open items carry their milestone.

## Critical

- **A-1 ✅ `validate` passed scores with dangling animation targets.** Schema checks shapes, not references; a typo'd `target` sailed to render-time. Exactly the silent-failure class we criticized HyperFrames for. Fixed: static gate `IR-REF-2`; regression case in the seeded-defect bench.
- **A-2 ✅ Stale-cache correctness bug.** `sceneHash` omitted the compiler version — any compiler/GSAP upgrade would silently serve frames compiled by the old compiler. Fixed: `COMPILER_CACHE_VERSION` in every hash; neighbor semantics (prev + next scene) now explicit and tested.
- **A-3 ✅ No audio.** A "cinematic video" framework producing silent films is not credible for postable output. Fixed at v1 scope: music bed with −14 LUFS loudnorm (verified −14.3 on a real mux), tail fade, declared-BPM beat grid + `MO-AUD-2` beat-cut gate. Still missing: narration/VO, SFX, beat *detection* (M2 remainder).
- **A-4 ✅ Determinism claim overstated.** "Byte-identical, sha256-verified" was proven on one machine, one OS, 9 frames. Cross-OS font rasterization and GPU paths will differ. Fixed: claims qualified to same-machine reproducibility (README, VISION); cross-machine parity is an open M5 item (golden-frame CI on Linux).
- **A-5 ✅ Transition model lied twice.** `fade` revealed the stage background instead of crossfading; `fade-through-black` faded to palette-bg, not black. Fixed: true crossfade (incoming pre-shown, outgoing z-lifted) and a real blackout layer whose tail extends into the next scene. Cut strips verify visually.
- **A-6 (open, M3) Install friction is real.** No npm package; "clone + npm install + tsc + a browser download" vs HyperFrames' one-command installers across four channels. marketplace.json added ✅, but the honest cold-start is ~5–10 minutes and the 10-minute exit bar is untested with outsiders.

## Major

- **A-7 ✅ Iteration UX was render-or-nothing.** No scaffold, no fast preview, no cleanup, and `render` happily rendered red scores. Fixed: `chitra init` (gate-passing starter, both aspect ratios), `chitra frame -t <ms>` (seconds, not minutes), `chitra clean`, and render now refuses P1 findings without `--force`.
- **A-8 ✅ The M2 exit metric existed only as prose.** Fixed: `benchmarks/seeded-defects/` — 10 defined defects, each mapped to its expected rule; measured **10/10** caught. Honest scope: defects were seeded by the gate author; this proves the plumbing, not coverage of the unknown-defect distribution. Aesthetic catch rate remains unmeasured until M4's blind protocol.
- **A-9 (open, M2) `ready()` waited for fonts but not images** ✅ fixed (decode-wait + hard failure listing bad paths) — but there is still no pixel-settle guarantee between `seek()` and `captureScreenshot` beyond empirical determinism on macOS; Linux CI verification pending (M5 golden frames).
- **A-10 (open, M3/M5) Expressiveness ceiling.** 14 presets, no keyframes, no masks, no video-in-scene elements, no nested composition, no per-character type animation, one chart type. The IR can express a clean launch film; it cannot yet express an Apple film. This is the deliberate v0 trade (constraint = quality floor), but the ceiling must rise via new *presets and elements* (curated vocabulary), never via raw-value escape hatches.
- **A-11 (open, M2) VLM critic is unproven.** The critique-video rubric is well-constructed prose with zero eval: no calibration set, no measured agreement with human judgment, no false-positive rate. Until measured, "the critique loop is the moat" is thesis, not fact.
- **A-12 (open, M4) Every competitive claim is unbenchmarked.** "Beat HyperFrames ≥70% blind preference" has no data; nothing has been compared head-to-head. ChitraBench is the single most important unbuilt artifact.
- **A-13 (open, M5) Scalability.** ~2 fps/worker, one browser, sequential frames, PNG disk round-trip. A 60s 4K film is ~an hour. Parallel-by-scene is designed (cache already scene-segmented) but not implemented.

## Minor

- A-14 Ctrl-C mid-render can orphan the Chrome process (no signal handler; puppeteer's default cleanup usually catches it).
- A-15 Overlap/contrast gates sample 3 instants per scene; transient overlaps between samples can slip through.
- A-16 Chart bars at 0.28 fill-opacity are legible but timid; palette-derived neutral ramp wanted.
- A-17 `examples/` has two entries; agents author better from a corpus. Need a gallery (M3).
- A-18 The skills are single-source but uncompiled per harness; Cursor/Codex get a README pointer, not native artifacts (M3).

## Unsupported-claims audit

| Claim | Where | Status |
|---|---|---|
| Byte-identical deterministic renders | README/VISION | ✅ re-scoped to same-machine; verified there |
| Quality Engine catches defects | README | ✅ now measured: 10/10 seeded (deterministic layer only) |
| −14 LUFS delivery | motion-language MO-AUD-1 | ✅ measured −14.3 on real mux |
| "Videos approaching Apple/CRED quality" | VISION | ✗ aspirational; flagship is clean but nowhere near that bar — keep as mission, never as description |
| ≥70% blind preference vs HyperFrames | roadmap M4 | ✗ untested; it is an exit *gate*, not a result |
| Install <10min in 3 harnesses | roadmap M3 | ✗ untested with outside users |
