# Known Issues (v0.2.0 — 2026-07-15)

Honest ledger. Each item is scheduled (milestone) or explicitly accepted. Fixed items move to the adversarial review record ([docs/reviews/0001](../reviews/0001-adversarial-review.md)).

1. **Render speed ~2 fps/worker** (screenshot mode, single browser, PNG disk round-trip). Scheduled: per-scene parallel sessions + static-frame dedup + Linux BeginFrame mode (M5). Mitigated by the per-scene cache (only dirty scenes re-render).
2. **No paint-settle guarantee** between `seek()` and screenshot beyond empirical determinism on macOS; Linux/CI golden-frame verification pending (M5). Determinism claims are same-machine only.
3. **Audio v1 covers music only** — no narration/voiceover, no SFX, no beat *detection* (tempo must be declared). Loudness (−14 LUFS) and beat-cut gates are live. (M2 remainder.)
4. **VLM critic unproven**: no calibration set or measured human-agreement rate for `critique-video`; the deterministic layer's 10/10 seeded catch rate does not cover aesthetic judgment (M2/M4).
5. **Expressiveness ceiling**: no keyframes, masks, video-in-scene, nested compositions, per-character type animation; one chart type. Raised only via curated presets/elements, never raw escape hatches (M3+).
6. **Gate sampling is instant-based** (3 instants/scene): transient overlap or contrast dips between samples can slip through (M2: per-cut + interval sampling).
7. **Skills not compiled per harness** — Claude Code plugin + AGENTS.md today; native Cursor/Codex artifacts + hash manifest are M3. No npm package yet; cold-start ~5–10 min, untested with outside users (M3 exit).
8. **Distribution/parallel rendering unimplemented** (design in ADR-0002 consequences; M5).
9. **Ctrl-C mid-render** may briefly orphan the vendored Chrome process (no explicit signal handler).
10. **Example corpus is 2 scores**; agents compose better from a gallery (M3).
