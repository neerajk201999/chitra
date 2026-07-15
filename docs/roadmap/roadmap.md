# Roadmap — MVP to v1.0

**Status (2026-07-15): M0 ✅ · M1 ✅ · M2 partial · M3 partial.** Each milestone ships a working repository state and is independently valuable. See [known-issues.md](known-issues.md) for the honest ledger.

## M0 — Memory & thesis ✅ 2026-07-14
Competitor reverse-engineering (6 reports + stack validation, docs/research/), vision, ADR-0001…0005, motion language seed, standards, roadmap.

## M1 — Proof of taste (the vertical slice) ✅ 2026-07-15
Delivered: Motion IR v0 (two tiers, zod) · compiler → HTML/GSAP with determinism guarantees · renderer (seek-protocol screenshot mode → FFmpeg, per-scene content-hash cache) · token registry · gates L1/L2 (14 unit tests green) · evidence generator · CLI (`validate/check/render/evidence/probe`) · 2 house styles (night, paper) · flagship example rendered.
**Exit gate passed:** re-render byte-identical across independent sessions (sha256-verified) · enforced MO rules gated in code with fixtures · flagship survived an internal critique loop that found and fixed 7 real defects (4 caught by gates, 3 by visual review — one of which became a new gate, QE-OVERLAP-1).
Also landed early from M2/M3: evidence sheets + critic/creator skills (prompts), Claude Code plugin manifest, AGENTS.md.

## M2 — The closed loop (the moat) — IN PROGRESS (2026-07-15: deterministic half done)
*Goal: the system catches and fixes its own defects.*
Landed: evidence generator · critique-video skill · **seeded-defect eval measuring 10/10 deterministic catch rate** ([benchmarks/seeded-defects](../../benchmarks/seeded-defects/results.md)) · audio v1 (music bed, −14 LUFS loudnorm verified, declared-BPM grid + MO-AUD-2) · true crossfade & fade-through-black · IR-REF-2 · adversarial review round 1 with 8 findings fixed ([docs/reviews/0001](../reviews/0001-adversarial-review.md)).
Remaining:
- VLM critic calibration: a labeled set of good/flawed renders; measure critique-video's agreement + false-positive rate.
- Narration/voiceover (word timestamps), SFX hooks, beat detection (undeclared tempo).
- Interval-based gate sampling (close the between-instants gap).
- **Exit gate:** deterministic layer ≥80% on seeded defects (✅ 100%) AND critic layer measured against the calibration set with published agreement stats.

## M3 — Distribution (install anywhere)
*Goal: `install → first non-embarrassing video < 10 minutes` in Claude Code, Cursor, Codex.*
- Skill compiler (single source → per-harness artifacts), hash manifest, router + 2 workflow skills (product-launch, social-short), domain skills.
- Docs site-in-repo; quickstarts per harness.
- **Exit gate:** cold-start test in 3 harnesses by 3 outside testers hits the 10-minute bar.

## M4 — ChitraBench (define "best")
*Goal: the public benchmark for motion-design quality.*
- Fixed brief suite (per register), scoring harness (gates + calibrated VLM rubrics), blind A/B protocol.
- Publish Chitra vs HyperFrames (and raw-Remotion-skill baselines) results, reproducibly.
- **Exit gate:** ≥70% blind preference over HyperFrames on identical briefs; methodology withstands external scrutiny (pre-registered protocol).

## M5 — Ecosystem → v1.0
Brand ingestion ("BRAND.md for motion": logo, palette, type, motion personality → tokens), style/block registry with `chitra add`, remaining workflows (feature-demo, PR-to-video, screen-recording ingestion via video-use patterns), distributed rendering (chunk-and-concat), WebCodecs backend spike.

## Standing risks (tracked here, reviewed each milestone)
1. **Taste ceiling** — encoded rules may plateau below "Apple-grade." Mitigation: ChitraBench measures it honestly; revision loop + growing rule registry; human escalation is a feature, not a failure.
2. **VLM critic reliability** (false confidence, rubric drift). Mitigation: calibration sets, isolated critics, deterministic gates carry the floor.
3. **HyperFrames adds a critique loop** (they can read this playbook too). Mitigation: speed + the benchmark + IR-level structural advantages they can't retrofit onto raw HTML without breaking their installed base.
4. **Render-stack entropy** (Chrome/Puppeteer drift). Mitigation: pinned browser, golden-frame CI, renderer abstraction.
5. **Scope gravity** (GUI editor, hosted platform, 3D). Mitigation: VISION.md's refusal list; ADR required to expand scope.
