# Known Issues (v0.2.0 — 2026-07-15)

Honest ledger. Each item is scheduled (milestone) or explicitly accepted. Fixed items move to the adversarial review record ([docs/reviews/0001](../reviews/0001-adversarial-review.md)).

1. **Render speed ~2 fps/worker** (screenshot mode, single browser, PNG disk round-trip). Scheduled: per-scene parallel sessions + static-frame dedup + Linux BeginFrame mode (M5). Mitigated by the per-scene cache (only dirty scenes re-render).
2. **No paint-settle guarantee** between `seek()` and screenshot beyond empirical determinism on macOS; Linux/CI golden-frame verification pending (M5). Determinism claims are same-machine only.
3. **Audio v2 covers music + SFX** (ADR-0007) — still no narration/voiceover on the output timeline, no beat *detection* (tempo must be declared), no clip-audio pass-through. Loudness (−14 LUFS) and beat-cut gates are live. (M2 remainder.)
4. **VLM critic unproven**: no calibration set or measured human-agreement rate for `critique-video`; the deterministic layer's 10/10 seeded catch rate does not cover aesthetic judgment (M2/M4).
5. **Expressiveness ceiling (largely closed 2026-07-15)**: figures give arbitrary sanitized UI/graphics (ADR-0008); video-in-scene, cursor choreography, and per-character type-in shipped (ADR-0007/0008). Still excluded by design: raw keyframes, masks, nested compositions; one chart type; no particle/network ambient motifs (curated preset candidate — docs/research/benchmark-claude-design.md).
6. **Gate sampling is instant-based** (3 instants/scene): transient overlap or contrast dips between samples can slip through (M2: per-cut + interval sampling).
7. **npm package prepared, not yet published** (owner npmjs login required; this machine's npm defaults to a work registry). Cursor rule + hash manifest now compiled from single-source skills; cold start measured 6s warm-cache, 3–6 min genuinely cold (estimate) — outside-tester verification still pending (M3 exit).
8. **Distribution/parallel rendering unimplemented** (design in ADR-0002 consequences; M5).
9. **Ctrl-C mid-render** may briefly orphan the vendored Chrome process (no explicit signal handler).
10. **Example corpus is 2 scores**; agents compose better from a gallery (M3).

## Integrity findings from the 2026-07-16 due-diligence audit (docs open until fixed)
- **A1. Figure text bypasses the text gates (P1 integrity).** `textRegions()` only reads top-level IR text; text authored inside a `figure` fragment is NOT size/contrast/safe-zone/reading-time/overlap checked. This contradicted ADR-0008's "gates run on its pixels" wording (now corrected). The moat is "measurable quality" — this is a real hole. Fix: register figure DOM text after sanitization, enforce token-only styling with a real CSS parser. (M4 Creative QA.)
- **A2. Three-instant gate sampling misses transient violations (P1).** Frame gates sample 3 instants/scene; a headline can enter off-safe-zone and settle, passing green. Fix: sample animation boundaries + interval checks.
- **A3. `chitra render` doesn't run frame gates unless the user ran `check` (P2).** Add a `chitra release` that enforces validate→check→render→evidence with a hash-keyed receipt.
- **A4. Packaging: `main` points at a missing root file, no `exports` map, version identity (0.1.0 vs README 0.2.0) inconsistent (P1 launch-blocker).**
- **A5. Audio −14 LUFS is a target, not a verified invariant** — normalizes the bed, doesn't measure the final mux. Add two-pass final-loudness measurement/gate.
- **A6. Determinism is same-machine-uninterrupted only.** Interrupted/resumed renders diverged slightly (SSIM 0.9987); cross-machine untested. Scope the claim; add interruption + golden-frame CI (M5).
- **A7. Critic is unvalidated** — 4 author-biased cases. Needs ≥20 independent-labelled cases before any aesthetic-quality claim.
