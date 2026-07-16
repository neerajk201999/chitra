# Target films — the standing engineering acceptance benchmarks

ADR-0012 froze renderer work "unless a concrete target film exposes a specific
missing capability." These two references ARE the target films. Every claimed
capability below is verified against the live code/tests, not asserted. They are
also ChitraBench seed workloads (reconstruction class).

**"Beat Remotion/HyperFrames/EditFrame" is defined by VISION.md**: blind
preference ≥70% on identical briefs, zero critical gate findings, determinism,
incremental revision, <10-min cold start — measured by ChitraBench (M4), with
losses published. Not a feature-count contest: Remotion is infrastructure; we
win on *outcomes* (better film, same brief, fewer retries, measurable quality).

## T1 — "Introducing Claude Design" (Anthropic, 81s, music-driven product film)

| Requirement | Status | Evidence |
|---|---|---|
| Serif interstitial word cards | ✅ | paper style, 8s recreation |
| Product-UI mockups (dialogs, menus, phone) | ✅ | figures (ADR-0008), recreation |
| Choreographed cursor (move/click), typing w/ caret | ✅ | cursor/type-in presets, recreation |
| Match cuts + canvas-responds-to-intent | ✅ | recreation scenes 2→3 (IR-FIG-1 gated) |
| Count-up stats + charts | ✅ | stat/chart-bar (M1) |
| Beat-cut music | ✅ | analyze-audio + onBeat (ADR-0011) |
| Dark globe w/ animated network arcs | ⚠️ approximation | particles scatter/ring + drift + circle dome; true animated arcs = only remaining gap; judge in full build |
| **Full 81s end-to-end build** | ❌ NOT DONE | only first 8.1s built; the rest is composition, not capability |

**T1 acceptance:** full-length recreation, gates green, side-by-side judged by the user.

## T2 — Card-vault fintech film (9.2s, 720×900, 3D card + phone + dot-matrix seal)

| Requirement | Status | Evidence |
|---|---|---|
| Real 3D card, perspective + traveling highlights | ✅ | scene3d (ADR-0010), byte-identical renders |
| **Branded card face ON the 3D body** | ✅ 2026-07-16 | `faceSrc`: HTML-designed face → rasterized by own pipeline → data-URI texture (WebGL rejects file:// siblings — solved) |
| Dot-matrix shimmer (card chip + end seal) | ✅ | particles (ADR-0009) |
| Phone-with-card wallet shots | ✅ | phone-frame figure + card figure |
| Beat-scored motion on the actual track | ✅ | vaultline rebuild, beats 209/882/3111/6014ms |
| Reference audio extraction | ✅ | chitra extract-audio (rights caveat) |
| Card-swap moment (Mastercard→VISA→RuPay) | ⚠️ untested | figures + pulse/fade should express it; verify in full build |
| Bloom/motion blur | ⚠️ approximation | glow fields + emissive; no true post-processing (accepted; revisit only if the full build reads flat) |
| **Full 9.2s end-to-end build w/ 3D card** | ❌ NOT DONE | 2D version built; 3D hero shot proven as frame |

**T2 acceptance:** full recreation with the 3D branded card, side-by-side vs reference, SSIM/visual judgment by the user.

## Honest reading

Capability-wise both films are now expressible (T1 fully; T2 minus true
post-processing bloom, judged acceptable-or-not in the full build). What is NOT
yet demonstrated is the **end-to-end craft** — full-length builds that survive
the gates and the user's eye. That, plus the M4 creative layer (so Chitra makes
these decisions itself instead of being hand-directed), is the remaining work.
Neither film should be claimed as "done" until its acceptance row is green.
