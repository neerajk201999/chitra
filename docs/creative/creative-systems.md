# Creative Systems — the formalization map

**Purpose (Phase 5 of the 2026-07-18 architect program).** Treat every creative
concept as an engineering problem: define it precisely, state why it matters,
name its measurable characteristics and their current enforcement status, name
the honestly-subjective remainder, and state how Chitra reasons about it and how
it is evaluated and improved. This document is the index that turns
[creative-constitution.md](creative-constitution.md) (the WHY) and
[../motion/motion-language.md](../motion/motion-language.md) (the HOW) into one
audited system. Rules are cited by ID, never restated (CLAUDE.md).

**The improvement loop for every concept below is the same:**
principle → deterministic or VLM-scored proxy → labelled calibration case →
promoted gate → ChitraBench measurement → Style-Memory amendment when a human
revision teaches something new. A concept with no proxy yet is listed honestly
as critic-scored (with its calibration coverage) or unmeasured.

---

## 1 · Taste

**Definition.** The consistent exercise of *selective refusal*: of all legal
options, choosing the few that serve the declared intent and rejecting the rest.
Operationally in Chitra: the delta between what the vocabulary permits and what
a top-0.1% director would keep.

**Why it matters.** It is the product (VISION; ADR-0012). Rendering is a
commodity; judgment is not.

**Measurable today.** Slop signatures (MO-SLOP-1, constitution §9); conformance
of execution to declared intent (CC-CONF-1..6); the calibration set (12 labelled
cases) measures whether the *critic's* taste matches the owner's.

**Subjective remainder.** Whether a legal, intentional film is *distinguished*.
Scored by the critic (dimensions 7 and 9), calibrated against labelled cases;
grown via Style Memory (accepted human revisions → constitution amendments —
CC-CONC-6 is a live example).

**How Chitra reasons about it.** Constitution rules at direction time; conceit
kill tests (CC-CONC-1..6) before scoring; gates as the floor; isolated critic as
the judge; ChitraBench blind preference as ground truth.

## 2 · Motion

**Definition.** Change of visual state over time, always in service of meaning:
an entrance asserts existence, an emphasis directs attention, an exit releases
it, ambient motion keeps a frame alive without claiming attention.

**Why.** Motion is the medium's only advantage over a poster; unmotivated motion
is the fastest slop signal (CC-CORE-1).

**Measurable.** Duration tokens (MO-DUR-1/2); easing families by register
(MO-EASE-1/2); choreography structure — stagger caps, single hero, reaction
semantics (MO-CHOR-1..5); ambient floor per register (MO-REG-1); preset+token
vocabulary with justified overrides only.

**Subjective.** Whether amplitude/energy matches the *emotional* register (a
legal spring can still feel wrong — the tone-mismatch calibration case exists
for exactly this).

## 3 · Timing

**Definition.** WHEN each change begins and ends, at millisecond precision:
offsets, chains (`at.after`), duration tokens, reading time.

**Why.** Timing is the difference between choreography and coincidence; humans
detect <100ms misalignments.

**Measurable.** Reading-time floor (MO-EDIT-1); exit-completes-before-cut
(MO-DUR-2); relational timing is first-class in the IR (`at.after` chains
compile deterministically); beat alignment when audio is declared or detected
(MO-AUD-2/4).

**Subjective.** "Feel" of a hold — 200ms of extra stillness before a reveal
(CC-RHY-1). Critic territory; candidate for a silence-before-reveal proxy
(constitution §8 tractable list).

## 4 · Rhythm

**Definition.** The pattern formed by durations and cuts across the whole film —
the macro-structure timing is the micro-structure of.

**Why.** Even pacing is boring pacing (CC-RHY-2); rhythm is how a film breathes.

**Measurable.** No-dead-air (MO-EDIT-5); rushed-close floor (CC-RHY-4, enforced);
pacing peak gets air (CC-CONF-5); scene-duration variance (MO-EDIT-2); beat-grid
conformance under declared BPM (MO-AUD-2).

**Subjective.** Accelerate-then-rest shape (CC-RHY-2) — tractable, not yet
promoted; the rushed-close and social-whiplash calibration cases cover the
critic side.

## 5 · Composition

**Definition.** The spatial allocation of attention within a frame: placement,
scale, negative space, alignment, density.

**Why.** The eye must land where intent says (CC-COMP-1/3, CC-CAM-3).

**Measurable.** One hero per frame (MO-CHOR-2); overlap (QE-OVERLAP-1); blank
frames (QE-BLANK-1); safe zones (per-register); composition variety across cuts
(MO-EDIT-3); figure text floor (MO-FIG-1).

**Subjective.** Whether asymmetry reads as intent or accident; alignment-grid
conformance (CC-COMP-2) is tractable (measure shared edges in rendered frames)
and queued in constitution §8. Calibration: dead-center-parade, caption-carpet,
wallpaper-drift.

## 6 · Typography

**Definition.** Type as voice: family, weight, tracking, size hierarchy, line
breaks, and how words *arrive* (motion of type is part of typography —
CC-TYPE-3).

**Why.** Most Chitra films are type-led; type IS the brand's audible tone.

**Measurable.** Role scale ratios (MO-TYPE-1); per-frame contrast on every
backdrop (MO-TYPE-2, incl. inside figures); widow/orphan and wrap sanity
(MO-TYPE-3/4); one type idea per film (CC-TYPE-2 — tractable: count distinct
display treatments).

**Subjective.** Whether the chosen voice matches the brief's personality
(CC-TYPE-1). Critic-scored; brand ingestion (M5) will make it checkable against
a declared brand voice.

## 7 · Visual hierarchy

**Definition.** The *ordering* of attention over both space and time: what is
seen first, second, never.

**Why.** A frame with two firsts has none (CC-COMP-1); a film that reveals
everything at once has no story.

**Measurable.** Hero-role uniqueness (MO-CHOR-2); contrast budget spent on the
hero (CC-COL-3 — tractable proxy: saturation/luminance share of hero vs
supports in rendered frames); reveal order encoded in choreography chains.

**Subjective.** Whether the *intended* hierarchy is the *felt* one — critic
dimension 2 + intent match (dimension 8); broken-hierarchy calibration case.

## 8 · Camera language

**Definition.** Motion of the frame itself (push, orbit, drift, lock) and its
grammar of meaning: push = intimacy, orbit = consideration, locked = confidence
(CC-CAM-1/2).

**Why.** Camera is emotional punctuation; busy camera reads cheap.

**Measurable.** One considered move per shot (CC-CAM-2 — tractable: count
concurrent frame-level transforms); ambient drift bounds (MO-MED-3, one slow
move on media); scene3d camera parameters are explicit IR.

**Subjective.** Whether the move's meaning matches the beat's emotion.
Critic-scored against `shotIntent`. *Gap (Phase 2 candidate): a first-class
`camera` block on 2D scenes — today frame motion is faked per-element; the
concept exists in the constitution but not in the IR.*

## 9 · Narrative structure

**Definition.** The film's argument: setup → tension → peak → release
(narrativeArc), one idea per film, product as protagonist, name earned last
(CC-NARR-1..5).

**Why.** A film without a gap-then-resolution is an ad, and the viewer knows.

**Measurable.** Direction tier requires the arc; conformance gates bind score to
direction (CC-CONF-2/3/4); wordmark-last checkable when direction present;
conceit presence (CC-CONF-6).

**Subjective.** Whether the tension is *felt*. Critic first-watch (dimension 1)
+ concept (dimension 9); no-words test at direction time (CC-CONC-4).

## 10 · Pacing

**Definition.** Rhythm experienced as duration-pressure: how long the viewer is
made to wait, scene by scene, relative to information density.

**Why.** The last 20% is the film (CC-RHY-4); rushed payoffs void the buildup.

**Measurable.** Reading-time floors (MO-EDIT-1); close-length floor (CC-RHY-4);
pacing-weight vs actual duration (CC-CONF-5); registered scene-length envelopes
per register.

**Subjective.** Density-to-duration fit beyond reading time (a data-heavy scene
earns more air than its word count). Critic-scored; rushed-close calibration
case.

## 11 · Brand consistency

**Definition.** The film inherits an identity system — palette, type voice,
motion personality, density — and stays inside it across a body of work
(CC-BRAND-1/2).

**Why.** A CRED film and a Google film must never be swappable; consistency is
what makes the second film cheaper *and* better.

**Measurable.** Token-only styling (palette/fonts enforced by schema + figure
sanitizer); palette-drift across scenes (critic dimension 4); conformance to a
declared brand once Brand ingestion ships (M5 — the "BRAND.md for motion").

**Subjective / gap.** Motion *personality* as a brand trait (springy vs glacial)
has no encoding yet — Phase 5 candidate: a `motionPersonality` token consumed by
easing/duration selection. Style Memory (ADR-0012) is the learning mechanism.

## 12 · Creative quality (the aggregate)

**Definition.** Blind-preference win-rate against the best alternative on the
same brief, judged by design-literate viewers (VISION's ≥70% bar).

**Why.** Every dimension above is a hypothesis; ChitraBench is the experiment.

**Measured by.** Deterministic gate pass (floor) → calibrated critic verdict
(aesthetic layer, 12-case calibration, run-002 pending) → ChitraBench blind A/B
(ground truth, M4). Research foundation adopted: VideoAesBench subdimensions in
the critic rubric, MVQA-68K causal-annotation format in calibration labels,
VBench-2.0 pre-registered-protocol methodology for ChitraBench itself.

---

## Standing gaps this document exposes (feeds Phase 2/4 planning)

1. **Camera block missing from 2D IR** (§8) — constitution has the language, IR
   doesn't. 2. **Motion personality unencoded** (§11) — brand trait with no
   token. 3. **Tractable proxies queued but unbuilt**: alignment-grid (§5),
   display-treatment count (§6), hero contrast-share (§7), silence-before-reveal
   (§3). 4. **Calibration coverage** is aesthetic-negative-heavy; needs
   conceit-positive cases (does the critic *reward* a strong concept?).
   5. **Blind-preference data**: none yet — everything above is upstream of
   ChitraBench.
