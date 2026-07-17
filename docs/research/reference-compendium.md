# Reference compendium — the best solved work per creative domain

Curated 2026-07-17 for one purpose: when building or directing in a domain,
consult the people who already solved it instead of improvising. Each entry is
load-bearing — either it shaped a Chitra decision, or it is the named next
source for an open problem. Keep this list SHORT; a link that nobody consults
is noise. (Agents: skim the domain you're working in, not the whole file.)

## Motion principles (the physics of feeling)
- **Disney's 12 principles of animation** (Thomas & Johnston, *The Illusion of
  Life*) — squash/stretch, anticipation, follow-through, slow-in/slow-out.
  Chitra's easing families + `spring-*` tokens encode the subset that applies
  to interface/brand motion.
- **Material Design — Motion** (m3.material.io/styles/motion) — duration/easing
  token system for UI motion; closest public analog to our MO-DUR/MO-EASE scale.
- **IBM Design Language — Motion** (productive vs expressive motion registers) —
  the intellectual parent of our register system (product-demo vs brand-film).
- **GSAP easing visualizer** (gsap.com/docs/v3/Eases) — ground truth for what
  our ease tokens actually do.

## Editing & film grammar (why cuts land)
- **Walter Murch, *In the Blink of an Eye*** — the Rule of Six (emotion first),
  why cuts on motion/meaning read as invisible. CC-RHY-3's source.
- **Every Frame a Painting** (YouTube corpus) — the most watchable film-grammar
  education that exists; "How Does an Editor Think and Feel?" for cut rhythm.
- **Barry Braverman, *Video Shooter*** — composition/negative-space craft that
  transfers directly to stage-unit layout (CC-CAM-3).

## Typography
- **Butterick's *Practical Typography*** (practicaltypography.com) — the single
  best terse reference; line length, hierarchy, and the "one type idea" rule
  (CC-TYPE-2 provenance).
- **Modular scale** (type-scale.com) — our TYPE_SCALE (display 128 → caption 24
  @1080p) is a modular scale; adjust ratios there, not ad hoc.

## Color & light
- **OKLCH / Björn Ottosson's OKLab** (bottosson.github.io/posts/oklab) —
  perceptually uniform color math; the right space for palette derivation and
  contrast-preserving tints (future: style-token generation in OKLCH).
- **WCAG 2.1 contrast** (1.4.3 text 4.5:1, 1.4.11 non-text/UI 3:1) — encoded in
  MO-TYPE-2's two-tier thresholds. The spec, not a blog summary, is the law.
- **Google HCT / Material color utilities** (github.com/material-foundation/
  material-color-utilities) — tonal-palette generation from a seed color;
  candidate engine for brand-ingestion palettes (M5).

## Audio: beats, loudness, music
- **madmom** (github.com/CPJKU/madmom) + **librosa** (librosa.org) — the
  reference beat/onset trackers; our energy-flux detector in
  `core/src/audio/analyze.ts` is a deliberate zero-dependency approximation.
  If beat quality ever gates a film, port madmom's DBN downbeat tracker logic.
- **EBU R128 / ITU-R BS.1770** — loudness law behind our −14 LUFS target and
  the ebur128 verification pass. Streaming targets: Spotify/YouTube ≈ −14.
- **ElevenLabs Music API** — current best generative music for brief-matched,
  licensed tracks (needs owner API key; the honest top tier above our
  synthesized beds).

## Rendering engineering (peers, read their source)
- **Remotion** (github.com/remotion-dev/remotion) — frame model, lazy
  browser provisioning (we now match), `@remotion/three`. License forbids
  code derivation; read for architecture only.
- **HyperFrames** (github.com/heygen-com/hyperframes) — seek-protocol +
  chrome-headless-shell + video pre-extraction (docs/research/stack-validation).
- **Replit "Browsers don't want to be cameras"** (blog.replit.com) — virtualized
  clock + WebCodecs capture; the post-screenshot future if we outgrow
  screenshot mode (M5 BeginFrame notes).
- **Revideo** (github.com/midrender/revideo) — generator-based animation model;
  the strongest alternative timeline formalism to study.

## Aesthetic evaluation (the A7 critic-calibration gap — ACTIVE)
State of the art moved fast; these are the sources for building our calibrated
critic and ChitraBench:
- **VideoAesBench** (Jan 2026, w/ GitHub) — VLM benchmark specifically for
  video *aesthetic* judgment subdimensions. First stop for critic calibration.
- **MVQA-68K** (arxiv.org/pdf/2509.11589) — causally-annotated video quality
  dataset with interpretability; template for our labelled-case format.
- **VBench-2.0** (CVPR 2025 lineage) — 18-capability video-gen benchmark;
  methodology model for ChitraBench's pre-registered protocol.
- **VQ-Insight** (arxiv.org/pdf/2506.18564) — teaching VLMs quality judgment
  via progressive RL; relevant to critic prompt design.
- **"Can VLMs Assess Graphic Design Aesthetics?"** (arxiv.org/html/2603.01083)
  — the closest paper to our exact question (design, not footage); read before
  claiming any critic accuracy number.

## Using this list
When a task touches a domain: read the entry's primary source, cite it in the
ADR/doc that results, and add what you learned to motion-language.md or the
constitution — the compendium feeds the law; it never replaces it.
