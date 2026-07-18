# Roadmap — MVP to v1.0

**Status (2026-07-18): M0 ✅ · M1 ✅ · M2 partial · M3 near-complete · M4 (Creative Intelligence) in progress — now governed by the six-phase architect program below.** See [known-issues.md](known-issues.md) for the honest ledger.

> **The architect program (owner directive, 2026-07-18).** Standing operating
> plan; every task must serve a phase. Phase 1 ✅ [capability-matrix.md](../research/capability-matrix.md)
> (verified, not assumed — supersedes prior parity claims) · Phase 3 ✅
> [user-workflows.md](../research/user-workflows.md) (evidence: revision loops
> are pain #1 → the critique loop is the #1 feature; "AI drafts, human directs"
> is a standing design constraint — no silent creative decisions) · Phase 5
> started: [creative-systems.md](../creative/creative-systems.md) (all 12
> creative concepts formalized: definition → proxies → subjective remainder →
> evaluation) + ADR-0013 conceit gate (CC-CONC-1..6, CC-CONF-6, `conceit` in
> the Direction IR).
>
> **Phase 2 — foundational gaps, in priority order (from the matrix):**
> 1. `chitra preview` — scrub the compiled HTML timeline in a browser (the
>    compile target is already seekable; this closes the human-review gap).
> 2. `caption` element with word timing — designed, gate-checked captions.
> 3. Narration/TTS timeline — provider interface (ElevenLabs first), word
>    timestamps as first-class timing anchors (`at.onWord`).
> 4. Curated transition breadth — wipe/slide (+ one shader class), each mapped
>    to a CC-CAM/CC-RHY meaning.
> 5. Brand ingestion pulled forward from M5 — URL/repo → tokens incl.
>    `motionPersonality` (creative-systems §11).
>
> **Phase 4 — differentiation (only after Phase 2):** multi-aspect re-layout
> (one Score → 16:9/9:16/1:1, gated); pr-to-video/changelog skill (video-CI —
> the wedge); living motion brand (Style Memory). **Phase 6 — continuous:**
> camera block for 2D IR and the four queued tractable proxies
> (creative-systems "standing gaps") are the current architecture debts.

> **Course correction (2026-07-16, ADR-0012).** Two outside reviews + our own VISION confirmed a drift: ADR-0006→0011 were all renderer/expressiveness features (media, video, figures, particles, 3D, audio) while the creative-intelligence layer VISION calls "the product" (Direction → Design → taste) stayed unbuilt and the Direction tier stayed orphaned. **Renderer is now declared feature-complete unless a concrete target film exposes a specific missing capability.** Center of gravity shifts to M4. Honest self-scoring: Rendering ~90%, Determinism ~100%, Motion IR ~90%, Quality gates ~80% (leaks — see known-issues), **Creative Direction ~20%, Narrative ~10%, Taste model ~20%, Storyboarding ~10%, Brand ~10%.** The low numbers are the whole game now.

## M0 — Memory & thesis ✅ 2026-07-14
Competitor reverse-engineering (6 reports + stack validation, docs/research/), vision, ADR-0001…0005, motion language seed, standards, roadmap.

## M1 — Proof of taste (the vertical slice) ✅ 2026-07-15
Delivered: Motion IR v0 (two tiers, zod) · compiler → HTML/GSAP with determinism guarantees · renderer (seek-protocol screenshot mode → FFmpeg, per-scene content-hash cache) · token registry · gates L1/L2 (14 unit tests green) · evidence generator · CLI (`validate/check/render/evidence/probe`) · 2 house styles (night, paper) · flagship example rendered.
**Exit gate passed:** re-render byte-identical across independent sessions (sha256-verified) · enforced MO rules gated in code with fixtures · flagship survived an internal critique loop that found and fixed 7 real defects (4 caught by gates, 3 by visual review — one of which became a new gate, QE-OVERLAP-1).
Also landed early from M2/M3: evidence sheets + critic/creator skills (prompts), Claude Code plugin manifest, AGENTS.md.

## M2 — The closed loop (the moat) — IN PROGRESS (2026-07-15: deterministic half done)
*Goal: the system catches and fixes its own defects.*
Landed: evidence generator · critique-video skill · **seeded-defect eval measuring 10/10 deterministic catch rate** ([benchmarks/seeded-defects](../../benchmarks/seeded-defects/results.md)) · audio v1 (music bed, −14 LUFS loudnorm verified, declared-BPM grid + MO-AUD-2) · true crossfade & fade-through-black · IR-REF-2 · adversarial review round 1 with 8 findings fixed ([docs/reviews/0001](../reviews/0001-adversarial-review.md)).
Landed 2026-07-15 (later): critic-calibration harness — 4 labeled cases (control, monotony, slop-aesthetic, broken-hierarchy) whose defects pass deterministic gates by construction; run-001 scored 4/4 verdicts, 4/4 mustFinds, 0 false positives (author-biased — see run notes). Novelty/lineage/gap analysis in [docs/reviews/0002](../reviews/0002-novelty-and-gap.md). Run-001's gate candidate shipped as MO-EDIT-5 (no dead air).
Landed 2026-07-17: calibration set expanded 4 → **12 cases across all three registers** (two clean controls; new aesthetic defects: tone-mismatch, color-soup, rushed-close, dead-center-parade, social-whiplash, wallpaper-drift, caption-carpet — every case passes deterministic gates by construction, builder refuses leaks) + **mechanized scorer** (`score-run.mjs`: verdict accuracy, mustFind recall via dimension+severity match with gist adjudication, control-violation detection; self-tested with synthetic perfect/bad runs). Building the demo base exposed and fixed a latent runtime bug: stat count-up read data attributes off the wrapper instead of .stat-num — NaN → Intl RangeError killed the entire page runtime (cache v14).
Remaining:
- run-002+: independent critic runs (fresh sessions) against the 12-case set; then independent human labels; grow toward ~20 cases before publishing agreement stats.
- Narration/voiceover (word timestamps), SFX hooks, beat detection (undeclared tempo).
- Interval-based gate sampling (close the between-instants gap).
- **Exit gate:** deterministic layer ≥80% on seeded defects (✅ 100%) AND critic layer measured against the calibration set with published agreement stats.

> **Priority lens (2026-07-15):** [docs/research/moats.md](../research/moats.md) ranks the five-year moats: calibration data → ChitraBench → motion-language spec → creative ladder (ADR-0006 candidate). M3 remains necessary execution, but feature polish beyond it is explicitly deprioritized; CLI is declared done.

## M3 — Distribution (install anywhere) — IN PROGRESS (2026-07-15)
*Goal: `install → first non-embarrassing video < 10 minutes` in Claude Code, Cursor, Codex.*
Landed 2026-07-15 (v3): **ADR-0008 figures & interaction choreography** — sanitized token-themed HTML-fragment mockups (agent-authored UI as first-class elements, gated on pixels), cursor element with waypoint moves + click rings, type-in preset (char cadence + caret); IR-CUR-1 gate; proven against the Anthropic Claude Design benchmark ([docs/research/benchmark-claude-design.md](../research/benchmark-claude-design.md)). Committed CC0-equivalent audio library (3 synthesized beds + SFX kit, core/audio-library/).
Landed 2026-07-15 (later): **media asset pipeline (ADR-0006)** — `chitra fetch` (download+normalize via sharp) and `chitra snap` (webpage capture via vendored Chrome, consent overlays auto-hidden, never clicked); asset bytes content-hashed into scene hashes; MO-MED-1..4 rules + static gate; provenance ledger (`assets/sources.jsonl`); proven end-to-end by the Wokelo launch film (live wokelo.ai screenshot as a scored scene). Also: right/bottom-anchor compiler bug found by the critique loop and fixed (compiler cache v3).
Landed: npm publish readiness (`@neeraj201999/chitra`, tarball verified) · MIT LICENSE · per-harness skill compiler (`scripts/build-skills.mjs`: Cursor rule + sha256 manifest, `--check` for CI) · MO-EDIT-5 no-dead-air gate (from calibration run-001) · render-cache auto-pruning (a full-disk incident is now structurally impossible) · scripted cold start measured: 6s warm-cache end-to-end (clone→install→build→init→first frame); genuinely-cold estimate 3–6 min (downloads dominate).
Landed 2026-07-16 (release-readiness pass): packaging fixed (`main`/`exports`/`types`, CI packs+installs+imports the tarball) · `scripts/setup.sh` one-command bootstrap · `.claude/skills/` auto-discovery (no plugin install) · agent-first README with literal URLs · the 2026-07-16 audit's release blockers A1–A5/A9 all fixed (figure-text gating, boundary sampling, auto-gated `-q high`, final-loudness measurement, signal handling, path-traversal). Clean-clone path verified end-to-end (setup → init → first render <1 min warm).
Landed 2026-07-17: package renamed `@neeraj201999/chitra` — the unscoped name `chitra-video` belongs to an unrelated project on the same npm account; a scoped name removes any possibility of the two colliding. Published to npm.
Remaining:
- **Exit gate:** cold-start test in 3 harnesses by 3 outside testers hits the 10-minute bar (testers being onboarded now — the "hand it to friends" milestone).

## M3.5 — Expressiveness & audio v2 (owner-directed priority, 2026-07-15) — LANDED same day
Owner call: close the Remotion expressiveness gap and the HyperFrames workflow gap now, ahead of M4. Landed: **video-in-scene** (ADR-0007: ffmpeg frame pre-extraction, deterministic, content-hashed, MO-MED-gated) · **SFX on choreography** (sounds fire at resolved animation starts; MO-AUD-3 sparsity gate) · **deterministic starter audio** (`chitra sfx-kit`, `chitra bed` — zero-license ffmpeg synthesis) · workflow skills (product-launch, screen-demo, social-short) · renderer-frontier survey (docs/research/render-stack-frontier.md). Proven by the akta.pro launch film: transcribed voiceover → real UI stills + moving clip + bed + SFX, all gates green.
Remaining honest gaps vs Remotion: keyframes/masks/nested comps (curated-preset policy, not a bug), clip audio pass-through, narration/TTS timeline.

## M4 — ChitraBench (define "best")
*Goal: the public benchmark for motion-design quality.*
- Fixed brief suite (per register), scoring harness (gates + calibrated VLM rubrics), blind A/B protocol.
- Publish Chitra vs HyperFrames (and raw-Remotion-skill baselines) results, reproducibly.
- **Exit gate:** ≥70% blind preference over HyperFrames on identical briefs; methodology withstands external scrutiny (pre-registered protocol).

## M5 — Ecosystem → v1.0
Brand ingestion ("BRAND.md for motion": logo, palette, type, motion personality → tokens), style/block registry with `chitra add`, remaining workflows (feature-demo, PR-to-video, screen-recording ingestion via video-use patterns), distributed rendering (chunk-and-concat), WebCodecs backend spike.


## M4 — Creative Intelligence (the missing brain) — STARTED 2026-07-16
*Goal: Chitra makes the creative decisions a top director + motion designer would — before rendering. The pipeline begins at intent, not at Motion IR (ADR-0012).*
Landed: ADR-0012 (creative pipeline architecture) · **docs/creative/creative-constitution.md** (the encoded WHY across narrative/rhythm/camera/type/colour/composition/brand — CC-* rules) · Direction tier wired into the CLI (`chitra plan`) · **Brief↔Score conformance gate** (`chitra conform`; CC-CONF-1..5: register match, no dropped beat, no scene without a WHY, hero moments executed, pacing peak gets air) · 37 tests.
Remaining (priority order):
- **Reference Decomposer**: reference video → measurable Style DNA (camera, rhythm, typography, palette, motion, narrative, emotion). Unlocks "make it like this reference."
- **Creative Director engine**: product brief → cinematic concept (emotion, arc, register) as a typed Brief IR the agent fills and gates check.
- **Storyboard IR tier**: shot list (intent, hero, camera, type, timing) between Brief and Score, with conformance gates both directions.
- **Style Memory**: learn from accepted human revisions (diff → style delta) so future films inherit taste and brand stay consistent.
- **Creative QA**: promote CC-* constitution principles to calibrated gates (narrative/composition/pacing/rhythm), beyond motion mechanics.
- **Then ChitraBench** end-to-end (benchmarking a creative system, not a renderer).
- **Exit gate:** on a fixed brief + reference, blind evaluators cannot distinguish Chitra's creative *decisions* (storyboard, pacing, type, palette choices) from a professional's on ≥ the ChitraBench bar.

## Standing risks (tracked here, reviewed each milestone)
1. **Taste ceiling** — encoded rules may plateau below "Apple-grade." Mitigation: ChitraBench measures it honestly; revision loop + growing rule registry; human escalation is a feature, not a failure.
2. **VLM critic reliability** (false confidence, rubric drift). Mitigation: calibration sets, isolated critics, deterministic gates carry the floor.
3. **HyperFrames adds a critique loop** (they can read this playbook too). Mitigation: speed + the benchmark + IR-level structural advantages they can't retrofit onto raw HTML without breaking their installed base.
4. **Render-stack entropy** (Chrome/Puppeteer drift). Mitigation: pinned browser, golden-frame CI, renderer abstraction.
5. **Scope gravity** (GUI editor, hosted platform, 3D). Mitigation: VISION.md's refusal list; ADR required to expand scope.
