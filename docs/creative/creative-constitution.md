# Chitra Creative Constitution

The encoded **why**. `motion-language.md` says how motion behaves; this says what
makes a film *feel* like Apple, CRED, OpenAI, Nothing, Google, Stripe, Linear.
Every director/planner/critic agent reads this **before** generating. It is taste
made explicit — and, wherever a principle can be measured, it becomes a gate
(rule IDs prefixed `CC-`, promoted to deterministic checks as proxies are found).

This is a living document. When an accepted revision teaches us something the
constitution didn't know, we amend it here (ADR-0012 Style Memory) so future
sessions inherit the taste instead of relearning it.

> **The one test above all (CC-CORE-1):** every element, every beat, every cut
> must answer *why does this exist, why now, why this movement?* If the honest
> answer is "it looked nice" or "to fill time," it is slop. Cut it.

## 1. Narrative philosophy (CC-NARR)

- **CC-NARR-1 — One idea per film.** A launch film sells a single feeling, not a
  feature list. Name it in the brief; every shot serves it. Apple's iPhone film
  is "inevitability," not "specs."
- **CC-NARR-2 — Tension before resolution.** Establish a gap (problem, question,
  absence) before the product resolves it. No tension = an ad, not a film.
- **CC-NARR-3 — Product as protagonist, not exhibit.** The product *does*
  something or *answers* something; it is not paraded. Show the change it makes.
- **CC-NARR-4 — Earn the name.** The brand/wordmark lands last, after the feeling
  is delivered — never as the opening title of a film that hasn't earned it.
- **CC-NARR-5 — Emotional arc is deliberate.** Curiosity → tension → confidence →
  delight (or a chosen path). The arc is authored, not incidental.

## 2. Rhythm & pacing philosophy (CC-RHY)

- **CC-RHY-1 — Silence is a tool.** A held, near-empty frame before a reveal
  creates weight. Premium films breathe; slop never stops moving.
- **CC-RHY-2 — Reveal cadence accelerates then rests.** Establish slowly, build,
  then a beat of stillness on the payoff. Even pacing is boring pacing.
- **CC-RHY-3 — Cut on meaning or on the beat, never arbitrarily.** Every cut is
  motivated by the narrative or the music (see motion-language MO-AUD, MO-EDIT).
- **CC-RHY-4 — The last 20% is the film.** The resolution/close gets the most
  care and the most air. Most films are lost in a rushed ending.

## 3. Camera & space philosophy (CC-CAM)

- **CC-CAM-1 — Camera has intent.** Slow push = intimacy/inevitability; slow
  orbit = luxury/consideration; locked = confidence/clarity. Motion of the frame
  itself must mean something (scene3d camera, gradient-field drift).
- **CC-CAM-2 — Restraint reads as premium.** One considered move per shot. Busy
  camera = cheap. Nothing/Apple move the camera rarely and slowly.
- **CC-CAM-3 — Negative space is composition.** The subject is placed, not
  centered by default. Off-center with breathing room reads designed.

## 4. Typography philosophy (CC-TYPE)

- **CC-TYPE-1 — Type is the voice.** Ultralight/large = confidence and calm
  (Apple); tight grotesk = technical precision (Linear/Stripe); serif = editorial
  warmth. Weight and tracking carry brand personality — choose them from the brief.
- **CC-TYPE-2 — One type idea per film.** A display voice + a support voice. Three
  competing type treatments is slop. (Extends MO-TYPE.)
- **CC-TYPE-3 — Words appear the way they're meant to be read.** A confident claim
  cuts in whole; a considered thought reveals by line; a typed input types. Motion
  matches meaning (line-reveal, blur-focus, type-in).
- **CC-TYPE-4 — Copy is designed.** Short, declarative, one thought per card. If a
  line needs two breaths to read, it's two cards or it's cut.

## 5. Colour & light philosophy (CC-COL)

- **CC-COL-1 — Palette is emotion.** Near-black + one accent = premium restraint;
  warm paper = editorial/human; single saturated hue = energy. The palette is a
  decision from the brief, never a default.
- **CC-COL-2 — Light models depth.** A single key with soft fill and a rim reads
  expensive; flat even light reads like a template (scene3d PMREM + key/rim).
- **CC-COL-3 — Contrast is hierarchy.** The eye goes to the brightest, most
  saturated thing. Spend that budget on the hero, starve everything else.

## 6. Composition & hierarchy philosophy (CC-COMP)

- **CC-COMP-1 — One hero per frame.** Everything else supports (enforced:
  MO-CHOR-2). If two things fight for the eye, the frame has failed.
- **CC-COMP-2 — Alignment is invisible quality.** Elements share edges and a grid.
  Misalignment is the fastest tell of AI slop.
- **CC-COMP-3 — Density signals register.** Sparse = luxury; dense = utility/data.
  Match density to the emotion, not to how much you have to say.

## 7. Brand philosophy (CC-BRAND)

- **CC-BRAND-1 — The film inherits the brand, not a generic aesthetic.** Palette,
  type, motion personality, and density come from the brand's own language
  (ingested, not invented). A CRED film and a Google film should never be
  swappable.
- **CC-BRAND-2 — Consistency across a body of work.** Style Memory keeps a brand's
  choices stable across films (ADR-0012). The second video for a client looks
  like the first on purpose.

## 8. How this becomes measurable (the path from taste to gate)

Each principle above is a hypothesis about quality. The Chitra method: state it,
find a deterministic or VLM-scored proxy, calibrate against labelled examples,
then promote it to a `CC-*` gate in the Creative QA layer (M4).

**Promoted to enforced gates so far:**
- **CC-RHY-4** (rushed close) — the final scene must be ≥12% of runtime, else a P3 "the close is rushed." *First measurable promotion from this constitution (2026-07-16).*
- **CC-COMP-1** (one hero per frame) — enforced as MO-CHOR-2.
- **CC-NARR-4 / CC-NARR-2** (wordmark lands last; tension precedes resolution) — enforced against a Direction via the CC-CONF-\* conformance gates (ADR-0012) when a Direction is supplied.

**Still prose (tractable, not yet promoted):** CC-TYPE-2 (distinct display-treatment count), CC-RHY-1/2 (silence-before-reveal, accelerate-then-rest), CC-COMP-2 (alignment). What cannot yet be measured is scored by the calibrated critic and tracked honestly — never asserted as passing without evidence. The bar for promotion is a gate + a labelled ChitraBench case, never a prose assertion.

## 9. What this constitution refuses

- Motion, colour, or type chosen because it "looks cool" with no narrative reason.
- Feature-listing in place of a single feeling.
- Perpetual motion / never resting (screensaver, not film).
- Generic "AI aesthetic": purple gradients, centered everything, even pacing,
  three fonts, a logo that opens the film. These are slop signatures; refuse them.
