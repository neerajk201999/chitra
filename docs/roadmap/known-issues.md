# Known Issues (v0.2.0 — 2026-07-16)

Honest ledger. Each item is scheduled (milestone) or explicitly accepted. Fixed items move to the adversarial review record ([docs/reviews/0001](../reviews/0001-adversarial-review.md)).

1. **Render speed ~2–5 fps/worker** (screenshot mode, single browser, PNG disk round-trip). Scheduled: per-scene parallel sessions + static-frame dedup + Linux BeginFrame mode (M5). Mitigated by the per-scene cache (only dirty scenes re-render).
2. **No paint-settle guarantee** between `seek()` and screenshot beyond empirical determinism on macOS; Linux/CI golden-frame verification pending (M5). Determinism claims are same-machine only (see A6).
3. **Audio v2 covers music + SFX** (ADR-0007) + beat-detection (`analyze-audio`) + scored motion (`at.onBeat`, ADR-0011). Final-mux loudness is now measured and warned (A5 fixed). Still no narration/voiceover on the output timeline, no clip-audio pass-through, no multi-track ducking. (M5.)
4. **VLM critic unproven** (A7): no calibration set or measured human-agreement rate for `critique-video`; the deterministic layer's 10/10 seeded catch rate does not cover aesthetic judgment (M2/M4). **This is the biggest honest gap** — the "measurable taste" moat is real for the deterministic layer, unproven for the aesthetic layer.
5. **Expressiveness**: figures (sanitized UI/graphics, ADR-0008), video-in-scene (ADR-0007), cursor/type choreography, particle fields (ADR-0009), and real 3D (ADR-0010) all shipped. Excluded by design: raw keyframes, masks, nested compositions; one chart type. True post-processing (bloom, motion blur) approximated, not native.
6. **Cross-machine determinism untested** (A6): same-machine uninterrupted renders are byte-identical (incl. 3D via SwiftShader); interrupted/resumed renders diverged slightly (SSIM 0.9987); no cross-OS golden-frame CI yet (M5). Claim is scoped accordingly.
7. **Aesthetic critic calibration set is small** (A7): 4 author-labelled cases. Needs ≥20 independent labels before any blind-preference claim. ChitraBench governance separate from the product repo (M4).
8. **Distribution/parallel rendering unimplemented** (design in ADR-0002 consequences; M5).
9. **Example corpus is 2 scores** + `core/figures-library` + `core/audio-library`; agents compose better from a larger gallery (M3).
10. **Outside-tester cold-start data pending** — setup.sh + npm path verified locally end-to-end (clone → build → init → first render in <1 min warm); real-tester confirmation across machines is the open M3 exit signal.

## Resolved from the 2026-07-16 due-diligence audit
- **A1 — figure text bypassed the gates. FIXED.** `textRegions()` now walks figure fragments; MO-FIG-1 size floor + pixel-contrast + safe-zone/overlap apply. Verified against the audit's adversarial fixture (was green, now 3 P1). *(Also fixed a latent bug it exposed: `sharp.extract().stats()` measured the whole frame, so over-media contrast never actually worked — since M1.)*
- **A2 — three-instant sampling. FIXED.** Frame gates now sample every non-ambient animation's end + midpoint plus base instants (deduped, capped 8/scene), with truthful "settled" computation. Overlap/contrast judged only on settled, fully-composed frames.
- **A3 — ungated render. FIXED.** `chitra render -q high` runs full frame gates and refuses P1 before encoding (`--force` overrides); drafts stay fast.
- **A4 — packaging. FIXED.** `main`→`dist/index.js`, `exports` map + `types` added, version `0.2.0` across package/CLI/manifest/plugin; CI now packs, installs, imports, and runs the tarball.
- **A5 — audio loudness. FIXED (measurement).** Final mux is measured with ebur128 and warns when outside −14 LUFS / −1.5 dBTP. Warning, not hard block (short material drifts).
- **A9 — orphaned Chrome on Ctrl-C. FIXED.** SIGINT/SIGTERM close all live browsers. Also: `../` path traversal now rejected in all asset refinements.
- **A6, A7 remain open** (cross-machine determinism CI; independent critic calibration) — tracked as items 6 and 7 above.
