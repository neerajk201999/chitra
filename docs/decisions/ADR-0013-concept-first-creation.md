# ADR-0013 — Concept-first creation: the conceit gate

**Status:** accepted · 2026-07-17
**Context owner call:** the owner reviewed a gate-green 5-second thesis film and rejected it: *"nothing cool or tasteful about the direction — it's very normal."* He is right, and the failure is structural, not a prompt miss.

## The failure this fixes

The 2026-07-17 thesis film obeyed every MO-* and CC-* rule and was still **guessable**:
dark background + gradient glow + kinetic type + fade-up + accent underline. That is
the exact aesthetic a stranger would predict from the category "AI-made brand film."
Our own two-altitude slop test (critique step 7) would have flagged it — but that
test runs **after** rendering, and nothing runs **before** scoring. The generation
path has no forcing function for imagination:

- `create-video` step 1 goes brief → Direction (narrative fields only) → Score.
  There is no artifact where a *visual idea* must exist and be judged.
- Worse, the skill's own guidance ("start from night.json… gradient-field…
  fade-up") is a **house slop attractor**: it converges every open brief to the
  same look. The constitution refuses "generic AI aesthetic" (§9) but our
  defaults *are* a generic aesthetic — just a privately-owned one.
- The gates are necessary and stay: they hold the mechanical floor (readability,
  overlap, contrast, rhythm legality). But mechanics-legal ≠ memorable. Nothing
  in the pipeline asks: *what is the one visual idea only this film could have?*

## Decision

**1 · No score without a conceit.** Every film must declare a **conceit** — one
sentence naming the visual/motion mechanic that carries the film and could not be
transplanted to a generic brief. It lives in the Direction tier (`conceit` field,
optional in schema for back-compat, required by the skill for any film ≥ 5s).
Examples of the grain: "the film critiques itself on screen"; "every scene is one
continuous cursor journey"; "the product's own UI is the only light source";
"copy assembles from the debris of the previous scene." Non-examples (treatments,
not conceits): "dark and premium", "kinetic typography", "smooth fades".

**2 · Divergence before convergence.** The director generates **≥3 genuinely
different conceits** and kills them adversarially before scoring one. The first
idea is presumed to be the training-data mode — slop by definition — and must beat
alternatives, never win by default.

**3 · Kill tests (run on each candidate, in order):**
- **Guessability** — could a competent stranger predict this treatment from the
  category alone? Kill it. (Two-altitude test moved to generation time.)
- **No-words** — mute all copy: does the film still communicate its change or
  feeling through image and motion alone? If the words are doing all the work,
  it is a slideshow, not a film. Kill it.
- **Brief-specificity** — swap in a competitor's brand: does the conceit still
  work unchanged? Then it belongs to the category, not the brief. Kill it.

**4 · Defaults are earned (fallback vocabulary).** House styles, gradient-field
glows, fade-up entrances, and centered display type remain available as
*execution vocabulary in service of a declared conceit* — never as the concept.
Any scene whose look is fully described by "house style + glow + fade-up +
centered type" must carry a reason tied to the conceit, or be re-scored.

**5 · The critic scores imagination.** `critique-video` gains a **concept
dimension** (is there a discernible conceit? does it land? would a viewer
remember one image tomorrow?) and adopts the aesthetic-subdimension taxonomy
from the research foundation (VideoAesBench subdimensions; MVQA-68K causal
labels as the format for our calibration cases — see
[reference-compendium](../research/reference-compendium.md)). Model-based
scoring of these dimensions ships with ChitraBench; the taxonomy ships now in
the rubric. This is the honest state of "implementing the research": taxonomy
today, calibrated scorers as M4 exit work.

## The wedge (what only Chitra can do)

Named here so every capability decision serves it: **the video build artifact
for real software** — point Chitra at a repo/URL and it directs, renders, and
quality-controls a launch film, feature demo, or changelog video from the
product's *actual UI*, deterministically, with taste enforced.

- **Remotion** renders anything but decides nothing: a developer hand-writes
  React per video; no direction layer, no critique loop, no taste floor.
- **HyperFrames / EditFrame** animate HTML but have no deterministic replay, no
  gate system, no self-critique — quality is whatever the prompt got lucky with.
- **Generative video (Sora/Veo/Runway)** cannot render a product's real UI
  crisply, cannot be re-rendered byte-identically after a one-word edit, and
  cannot obey a brand system.

Chitra's compounding assets — real-UI figures + cursor choreography (ADR-0008),
`chitra snap` (ADR-0006), per-scene cache (surgical edits), the gate/critique
loop, and now the conceit gate — all point at this use case. The mass market is
every product team that ships UI continuously and wants video the way they want
CI: repeatable, reviewable, on-brand. **Roadmap consequence:** T1/T2 stay, and
ChitraBench briefs must include at least one repo/URL-grounded brief.

## What we take from Remotion/HyperFrames (open source)

From the existing research (docs/research/): Remotion's *composition model*
(everything is a component of `frame`) validates our deterministic seek clock —
already adopted; their transition/series timing math is a reference for our
transition edge cases, and `@remotion/shapes`/`paths` are a vocabulary source
for a future curated shape set. HyperFrames' lesson is what *not* to build:
prompt→HTML with no IR gives speed but nothing to gate, cache, or critique.
We import ideas, never code (license: no derivation).

## Consequences

- `Direction` schema gains optional `conceit: string` (min 20 chars when present).
- `create-video` gains a mandatory Concept stage (step 1.5) with the kill tests
  and the banned-defaults rule; Direction shown to the user now includes the
  conceit and the two killed alternatives (so the human can overrule the kill).
- `critique-video` gains dimension 9 (concept) and the research taxonomy.
- Constitution gains **CC-CONC-1..5** (see creative-constitution §"Concept").
- The calibration set eventually needs conceit-positive/negative cases; tracked
  in roadmap M2 remaining work.
- Cost: one more artifact per film and a real risk of *worse-but-different*
  ideas early. Accepted — "competent and forgettable" is the failure mode that
  kills the vision; mechanics gates keep the floor while we learn.
