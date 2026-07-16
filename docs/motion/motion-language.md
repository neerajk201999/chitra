# The Chitra Motion Language (seed v0.1)

The encoded design judgment of the system. Directors compose with these tokens; the compiler enforces them; gates test them; critics cite them. This file is the human-readable law; `core/motion/` will carry the machine-readable mirror. Every rule is ID-tagged and must be evidence-linked (source or A/B result) before promotion from `draft` to `enforced`.

Sources: Apple HIG motion & spring model, Material duration/easing tokens, Emil Kowalski / Linear rules, GSAP easing families, Impeccable's motion seeds, HyperFrames' motion-principles — unified and extended to cinema. See docs/research/landscape.md for citations.

## Registers (which rulebook applies)

| Register | Feel | Motion ratio | Cut rhythm |
|---|---|---|---|
| `brand-film` | Distinctive, cinematic, earns attention | high | musical, beat-synced |
| `product-demo` | The tool disappears into the task; calm, precise | medium | content-driven holds |
| `social-short` | Dense, front-loaded, retention-aware | high | fast, pattern-interrupt |

A video declares exactly one register; gates and critic rubrics switch on it.

## Duration scale (MO-DUR)

Tokens, not milliseconds: `instant` 100ms · `quick` 200ms · `standard` 300ms · `emphasis` 500ms · `dramatic` 800ms · `cinematic` 1200ms. 
- MO-DUR-1 (enforced): UI-scale elements never animate slower than `emphasis`; hero/cinematic moments never faster than `standard`.
- MO-DUR-2 (enforced): exits run at ~75% of the paired entrance duration.

## Easing families (MO-EASE)

`exit-swift` (ease-in family, exits only) · `enter-settle` (ease-out family — the default for entrances) · `move-through` (ease-in-out, on-screen travel) · `spring-standard` / `spring-energetic` (perceptual duration + bounce, never raw stiffness) · `linear` (only for continuous ambient motion: scrolls, rotations, particles).
- MO-EASE-1 (enforced): no raw cubic-bezier in IR without `override.reason`.
- MO-EASE-2 (enforced): entrances are never ease-in; nothing on screen ever `linear`-jumps to a stop.

## Choreography (MO-CHOR)

- MO-CHOR-1: stagger children ≤ 60ms apart, total stagger ≤ `emphasis`; more than 8 simultaneously-animating elements per scene is a violation.
- MO-CHOR-2: one hero motion per scene — everything else supports it (scale hierarchy: hero amplitude ≥ 2× supporting amplitude).
- MO-CHOR-3: transform composition (position/scale/rotation on distinct wrappers) is compiler-managed; authors state intent, never stacked tweens.
- MO-CHOR-4 (draft): motion enters from narrative direction — continuity of screen direction across cuts unless a pattern-interrupt is declared.
- MO-CHOR-5: one entrance per element per scene — a second enter without an exit between re-hides it first and reads as a blink; event reactions use `pulse` (never touches opacity). *(P2, static)*

- MO-PART-1: particle fields are bounded (≤ 400 dots) and ambient by default; shimmer opacity floors at 0.22 (dots never fully vanish); `morphTo` only on `particle-morph`. Formations: grid / ring / scatter (seeded, deterministic). *(P1, static — ADR-0009)*

- MO-AUD-4: `at.onBeat` requires a declared `audio.music.beats` grid (from `chitra analyze-audio`); out-of-range beat index is a hard error. Motion snaps to the actual track. *(P1, static — ADR-0011)*

- MO-3D-1: a 3D hero subject settles — gentle oscillation ≤30°, never a perpetual spin (screensaver = slop). Real 3D via curated `scene3d` primitives (card/coin/slab), Three.js driven by the seek clock, SwiftShader-deterministic. *(P2, static — ADR-0010)*

## Pacing & editing (MO-EDIT)

- MO-EDIT-1: hold time for text ≥ reading time at 200 wpm × 1.4 safety, +0.3s for scene entry.
- MO-EDIT-2: cut rhythm per register (brand-film: cuts land within 80ms of a beat-grid line; product-demo: holds are content-length-driven).
- MO-EDIT-3: adjacent scenes must differ on ≥ 2 of {composition, scale, palette emphasis, motion direction} (anti-slideshow).
- MO-EDIT-4 (draft): tension curve — density/scale/tempo should rise toward the `hero_moment` and release after; critics score the measured curve against Tier-1 intent.
- MO-EDIT-5 (enforced): no dead air — the first non-ambient entrance in a scene begins within max(600ms, 20% of scene duration) of scene start. A scene that opens on an empty or static frame wastes its cut. *Origin: critic-calibration run-001 (empty `in` samples on the monotony case).*

## Typography in motion (MO-TYPE)

- MO-TYPE-1: minimum rendered text size 24px @1080p (48px for social-short), enforced per frame.
- MO-TYPE-2: WCAG AA contrast held on *every frame* text is visible, including over moving media.
- MO-TYPE-3: text animates as blocks or lines; per-character effects only in `brand-film` with `override.reason` (the classic AI tell).
- MO-TYPE-4: platform safe zones (per-target caption/UI margins) are gate-enforced.

## Audio (MO-AUD)

- MO-AUD-1 (enforced): the delivered mix is loudness-normalized to −14 LUFS integrated, −1.5 dBTP — the streaming/social target. Applied in the mux, and the FINAL output is measured back with ebur128 (a deviation warns; audit A5). Not trusted from the source file.
- MO-AUD-2 (enforced): when a beat grid is declared (`audio.music.bpm`), `brand-film` cuts land within 80ms of a beat; the gate reports the exact nudge. Undeclared tempo disables the rule — never guess a grid.
- MO-AUD-5 (draft): music tails fade over 500–1200ms and end *with* the picture; audio that outlives the last frame is a P1.
- **MO-AUD-3** — SFX are sparse and attached to choreography: sounds fire at an animation's resolved start, max 2 per scene; bed at −14 LUFS integrated, mix limited to −1 dBTP. Sound marks hero moments, never every move. *(P2, static gate; ADR-0007)*

## Media (MO-MED)

- **MO-MED-1** — Text over media requires a scrim ≥ 0.3 or the `on-media` color. Raw type on a photograph is unreadable half the time and slop the other half. *(P2, static + frame gates)*
- **MO-MED-2** — Media never appears untreated. Every image carries at least one of: radius, scrim, the style's grain, or a surface frame. A raw rectangular photo drop reads as a stock-asset slideshow. *(P3, review)*
- **MO-MED-3** — Media moves at most once, slowly. One drift or scale-settle per image; media never uses text presets (blur-focus, line-reveal). Ken-Burns-everything is the video equivalent of MO-SLOP-1. *(P2, review)*
- **MO-MED-4** — Assets are project-local and provenance-logged (`assets/sources.jsonl`); scores never reference URLs. *(P1, schema — ADR-0006)*

## Media (video) addendum — MO-MED applies to `video` elements identically; MO-MED-3's one-slow-move rule is why clips never also drift.

## Slop registry (MO-SLOP) — match and refuse

Named tells, maintained on a saturation cadence: purple-gradient-on-dark default aesthetic · per-character rainbow text reveals · everything-fades-in uniformity · stock-footage + TTS + karaoke-caption assembly · drop-shadow abuse · emoji-as-design · fake blur glassmorphism everywhere · uniform 500ms-everything timing · centered-text-slide sequences (slideshow risk) · zoom-drift on static images as the only motion.
Two-altitude test (from Impeccable, adapted): *first order* — could you guess this video's look from its category alone? *second order* — could you guess its evasion? Both yes → P1 finding.

## Enforced gate inventory (the law == the code)

This is the authoritative list of every rule ID that fires in `core/src/gates/index.ts`, kept in sync with the code (audit 2026-07-16 fixed prior doc↔code drift). If a rule is here, it is enforced; if it is elsewhere in this doc marked `draft`, it is not yet.

**Schema / relational integrity (IR-\*):** IR-REF-1 (broken relational timing) · IR-REF-2 (animation targets a missing element) · IR-CUR-1 (cursor/waypoint misuse) · IR-FIG-1 (figure internal-state continuity across cuts).
**Motion language (MO-\*):** MO-DUR-1 (hero ≥ standard, support ≤ dramatic) · MO-DUR-2 (exit ≤ entrance) · MO-EASE-1/2 · MO-CHOR-1/2/5 · MO-EDIT-1/2/3/5 · MO-TYPE-1/2/4 · MO-FIG-1 (figure text size floor) · MO-MED-1 · MO-AUD-2/3/4 · MO-PART-1 · MO-3D-1 · MO-REG-1 (register motion-coverage floor) · MO-SLOP-1/2.
**Rendered-frame quality (QE-\*):** QE-OVERLAP-1 (text overlap) · QE-BLANK-1 (blank/dead frame).
**Creative conformance (CC-CONF-\*, ADR-0012):** CC-CONF-1..5 (Score honors the Direction — beats, hero moments, pacing).
**Creative constitution proxies (CC-\*):** CC-RHY-4 (rushed close) — first measurable promotion from the constitution (§8).

Doc-only / draft (NOT enforced yet): MO-CHOR-3/4, MO-EDIT-4, MO-TYPE-3, MO-MED-2/3, MO-AUD-5, and all narrative/camera/colour constitution rules (CC-NARR/CAM/COL/COMP/TYPE/BRAND) except those promoted above. MO-AUD-1 and MO-MED-4 are realized in the mux/schema respectively, not as gate findings.

---
**Growth protocol:** new rules enter as `draft` with evidence links; promotion to `enforced` requires a gate implementation + a benchmark case in ChitraBench + an entry in the inventory above. Rules never live only in prose (OpenMontage's failure mode).
