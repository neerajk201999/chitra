# Roadmap — MVP to v1.0

**Status (2026-07-15): M0 ✅ · M1 ✅ · M2 partial · M3 partial.** Each milestone ships a working repository state and is independently valuable. See [known-issues.md](known-issues.md) for the honest ledger.

## M0 — Memory & thesis ✅ 2026-07-14
Competitor reverse-engineering (6 reports + stack validation, docs/research/), vision, ADR-0001…0005, motion language seed, standards, roadmap.

## M1 — Proof of taste (the vertical slice) ✅ 2026-07-15
Delivered: Motion IR v0 (two tiers, zod) · compiler → HTML/GSAP with determinism guarantees · renderer (seek-protocol screenshot mode → FFmpeg, per-scene content-hash cache) · token registry · gates L1/L2 (14 unit tests green) · evidence generator · CLI (`validate/check/render/evidence/probe`) · 2 house styles (night, paper) · flagship example rendered.
**Exit gate passed:** re-render byte-identical across independent sessions (sha256-verified) · enforced MO rules gated in code with fixtures · flagship survived an internal critique loop that found and fixed 7 real defects (4 caught by gates, 3 by visual review — one of which became a new gate, QE-OVERLAP-1).
Also landed early from M2/M3: evidence sheets + critic/creator skills (prompts), Claude Code plugin manifest, AGENTS.md.

## M2 — The closed loop (the moat) — IN PROGRESS
*Goal: the system catches and fixes its own defects.*
Already landed: evidence generator (contact sheets, hero frames, cut strips) · critique-video skill (isolated critic rubric).
Remaining:
- Evidence generator (contact sheets, hero frames, waveform composites).
- Critic skills v1 (typography, motion, pacing, slop, intent-match) with honest rubrics; Editor with surgical IR patching; ≤3-pass loop; delivery report.
- Audio v1: beat grid, narration timestamps, loudness gates, beat-referenced choreography.
- **Exit gate:** on 10 seeded-defect briefs, the loop detects ≥80% of planted P0/P1 defects and fixes them without regressing other scenes.

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
