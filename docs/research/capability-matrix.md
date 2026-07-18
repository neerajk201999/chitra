# Capability Matrix — Chitra vs the field (verified 2026-07-18)

Phase 1 of the architect program. Built from three fresh research passes
(Remotion+EditFrame; HyperFrames+video-use+Replit Video; user workflows —
see [user-workflows.md](user-workflows.md)) checked against the repo's actual
shipped state. Supersedes the parity claims in
[honest-gap-vs-remotion-editframe.md](honest-gap-vs-remotion-editframe.md)
(whose two "fundamental gaps" — real 3D, scored motion — have since closed via
ADR-0010/0011). Every row states WHY the capability exists before what we do
about it. **Approaches:** ADOPT (build equivalent) · IMPROVE (build better) ·
REPLACE (better abstraction for the same problem) · OMIT (refuse, with reason).

## Verified competitor snapshots (July 2026)

- **Remotion 4.0.x** (~53.5k★, source-available + anti-fork clause; 5.0
  unreleased): React/`useCurrentFrame()` model, ~50 packages (transitions,
  captions+Whisper, ElevenLabs TTS, three/skia/lottie/rive, motion-blur, paths,
  google-fonts, zod-props data-driven video, Lambda/CloudRun, experimental
  WebCodecs web-renderer via **Mediabunny** (MIT), MCP/plugins/llms.txt,
  paid Editor Starter). Verified friction: render cost, CSS-animation ban,
  license anxiety, React-only. **License consequence: ideas only, never code.**
- **HyperFrames (HeyGen, Apache-2.0, ~36k★, v0.7.62)**: HTML + `data-*` timing,
  seekable-runtime capture, 19 routed agent skills, `frame.md` brand-token
  ingestion, block catalog, media pipeline (transcribe/captions/bg-removal/
  grading), browser studio+timeline, Lambda farm, determinism linting, published
  launch compositions. No output-side quality loop (still true). Skills layer
  is explicitly their moat.
- **EditFrame** (closed, post-pivot, ≈no adoption signal): `ef-*` web
  components, CSS-animation-first, JIT streaming player, cloud rendering,
  editor-GUI components, agent skills. Watch, don't chase.
- **video-use (browser-use, MIT, ~17k★)**: transcript-first *editing of real
  footage* — word-timestamped transcript as the addressing scheme, EDL,
  self-eval at cut boundaries. Complementary job; treats HyperFrames/Remotion
  as pluggable overlay renderers.
- **Replit Video** (closed, hosted): conversational React-animation artifact +
  Seedance assets; aesthetic ceiling, chat-only control. Validates demand for
  zero-skill video; validates that hiding all control loses serious users.

## The matrix

Legend: ✅ have (parity or better) · 🟡 partial · ❌ missing · 🚫 refused.

| # | Capability (owner) | Why it exists (user problem) | Chitra status | Gap | Priority | Approach |
|---|---|---|---|---|---|---|
| 1 | Deterministic frame-accurate render (all) | Reproducible output, CI-able video | ✅ byte-identical + per-scene cache (stronger than any of them) | none | — | KEEP — it's a moat |
| 2 | Quality gates + self-critique loop (nobody else) | Catch defects before humans review (pain #1: revision rounds) | ✅ unique | none | — | IMPROVE — critic calibration IS the product (run-002+) |
| 3 | Typed two-tier creative IR w/ conformance (nobody) | Legible, overridable creative decisions ("AI drafts, human directs") | ✅ unique (Direction+conceit → Score → conform) | none | — | IMPROVE — Storyboard tier (ADR-0012) still missing |
| 4 | Live preview / player (Remotion Player+Studio, EditFrame JIT, HF studio) | Humans review by scrubbing, not by reading PNGs | ❌ MP4 + evidence stills only | **real** | **P1** | ADOPT cheaply: our compile target is already a seekable HTML page — serve it with a scrub bar (`chitra preview`). No GUI editor (see #17) |
| 5 | Word-timed captions (Remotion captions, HF, OpusClip-class) | Social-short table stakes; accessibility | ❌ none | **real** | **P1** | ADOPT: `caption` element + word-timing from transcript; style-gated (safe-zone, contrast) so ours are *designed* captions |
| 6 | Narration/TTS timeline (Remotion elevenlabs) | Voiceover drives launch/demo films; timing must follow speech | ❌ (planned M2) | **real** | **P2** | ADOPT: ElevenLabs behind a provider interface + word timestamps as first-class timing anchors (`at.onWord`) — video-use proved the addressing scheme |
| 7 | Transition breadth (Remotion transitions, HF shader-transitions) | Cuts carry meaning; limited vocabulary limits rhythm | 🟡 cut/fade/crossfade/fade-through-black | partial | **P2** | ADOPT curated: wipe + slide + one shader-class; each must map to a CC-CAM/CC-RHY meaning, never a catalog of 50 |
| 8 | Brand ingestion (HF `frame.md`) | Films must inherit the brand, not a default; repeat customers | ❌ (planned M5) | **real — validated 3× (HF ships it, workflow research demands it, CC-BRAND needs it)** | **P2 (pulled forward from M5)** | IMPROVE: URL/repo → tokens (palette, type, radius, density) + **motionPersonality** token (creative-systems §11) — theirs stops at visuals; ours encodes motion character |
| 9 | Workflow/domain skills breadth (HF's 19 routed skills) | Encode production know-how per video genre | 🟡 create/critique + 3 workflows | partial | **P2** | IMPROVE selectively: pr-to-video/changelog (=video-CI wedge), music-to-video (have onBeat already). Skip genres off-wedge (faceless-explainer, slideshow) until asked |
| 10 | Multi-aspect delivery (nobody does re-layout; OpusClip crops) | Every deliverable ships 16:9+9:16+1:1; re-layout is manual re-composition | ❌ per-score aspect | **whitespace** | **P3 (Phase 4 differentiation)** | REPLACE: one Score, per-register safe-zones + per-aspect composition rules → three gated renders. Nobody solves re-layout; our IR can |
| 11 | Data-driven/parameterized video (Remotion zod props) | Thousands of personalized renders | 🟡 IR is zod-typed; no param loop | partial | P3 | ADOPT thin: `chitra render --props` batch loop; our schema already validates |
| 12 | Real-footage ingestion/editing (video-use) | Talking-head/screen recordings are most of real marketing video | 🟡 video-in-scene clips only | partial | P3 (M5) | ADOPT the *interface*: accept word-timestamped transcripts as edit anchors; leave full EDL editing to video-use (different product; interop > compete) |
| 13 | Vector/anim runtimes: Lottie, Rive, GIF (Remotion) | Designers bring existing assets | ❌ | real but off-wedge | P4 | ADOPT later behind gates (imported motion must still pass MO-*); target-film rule applies |
| 14 | Motion blur / noise / paths / shapes utils (Remotion) | Craft texture | 🟡 particles, limited shapes | partial | P4 | ADOPT per target-film need only (T1/T2 rule) |
| 15 | Distributed/cloud rendering (Remotion Lambda, HF Lambda) | Long/many renders | ❌ | real at scale, not for 5–90s films | P4 (M5) | ADOPT later: chunk-and-concat exists as design; per-scene cache already kills most re-render cost |
| 16 | WebCodecs/browser rendering (Remotion web-renderer, Replit) | Kill server infra; the industry's converged direction | ❌ Chrome screenshot | strategic | P4 (M5 spike) | REPLACE backend eventually on **Mediabunny (MIT)** — the layer Remotion itself commoditized; renderer abstraction (ADR-0002) planned for this |
| 17 | GUI editor / timeline (Remotion Editor Starter $, EditFrame components, HF studio) | Timeline-thinking humans | 🚫 | — | — | OMIT (VISION refusal): our human-override surface is the IR + preview + surgical edits. Revisit only with ChitraBench evidence that review (not editing) needs more than #4 |
| 18 | Hosted credit-metered service (Replit) | Zero-install users | 🚫 for now | — | — | OMIT: MIT + local-first is the wedge vs both licensing models (Remotion headcount fees, Replit credit "casino") |
| 19 | Avatars / generative footage (HeyGen, Seedance) | Human presence without filming | 🚫 | — | — | OMIT: off-thesis (real UI + motion design); interop via `video` element if users bring clips |
| 20 | Agent-native docs/MCP/plugins (Remotion, EditFrame, HF) | Agents are the new users | ✅ skills-first since M0 | none | — | KEEP; add llms.txt-style entry point cheaply |
| 21 | Block/template catalog (HF catalog, Remotion templates) | Don't re-derive common patterns | 🟡 figures-library + 2 styles + examples | partial | P3 (M5 `chitra add`) | ADOPT curated, gate-checked blocks — every block ships passing gates, unlike raw catalogs |
| 22 | Determinism linting (HF) | Wall-clock/random breaks reproducibility | ✅ schema forbids it structurally | none | — | KEEP (structural > lint) |

## What the matrix says (the honest summary)

1. **Nobody attacks our core.** The quality loop (#2), the typed creative IR
   (#3), and byte-determinism (#1) remain unowned by any competitor — including
   HyperFrames, whose 372k-word skills layer still never watches its own
   render. The moat thesis survives verification.
2. **The real foundational gaps are few and cheap relative to their value:**
   preview (#4 — nearly free given our HTML compile target), captions (#5),
   narration (#6), transition breadth (#7), brand ingestion (#8). None
   requires new architecture; all fit existing ADRs.
3. **The differentiation lane is confirmed by demand evidence, not vibes:**
   multi-aspect re-layout (#10), video-CI/pr-to-video (#9), the living motion
   brand (#8+Style Memory). These map 1:1 to the top unsolved pains in
   [user-workflows.md](user-workflows.md).
4. **License geometry favors us:** Remotion = anti-fork source-available;
   EditFrame = closed; HyperFrames = Apache but HeyGen-owned distribution.
   MIT + local-first + no metering is a wedge *by itself*. Mediabunny (MIT) is
   the sanctioned substrate for the eventual WebCodecs backend — never Remotion
   code.
5. **Refusals stay refused** (GUI editor, hosted metering, avatars) — with the
   matrix documenting why, so the next "competitor has X" conversation starts
   from rationale, not anxiety.
