# Seeded-Defect Evaluation — 2026-07-15

Deterministic Quality Engine (layers 1–2) against 10 seeded authoring defects in the flagship score.

**Catch rate: 10/10 (100%)** — M2 exit gate requires ≥80% on deterministic-detectable defects.

| defect | layer | expected rule | caught | detail |
|---|---|---|---|---|
| unreadable-copy | static | MO-EDIT-1 | ✔ | "This headline contains far too many word…" visible 3850ms, needs 10380ms at 200wpm×1.4 |
| competing-heroes | static | MO-CHOR-2 | ✔ | 4 hero elements — one hero motion per scene, everything else supports it |
| sub-floor-scene-length | static | MO-EDIT-2 | ✔ | Scene runs 700ms; below the 1200ms floor for brand-film — unreadable |
| dangling-animation-target | static | IR-REF-2 | ✔ | Animation "kicker-in" targets "kickr" but no such element exists in this scene |
| broken-relational-chain | static | IR-REF-1 | ✔ | Choreography references an unknown animation id (broken relational timing) |
| fade-only-slideshow | static | MO-SLOP-1 | ✔ | 3/3 scenes are fade-only text cards — slideshow slop |
| off-beat-cuts | static | MO-AUD-2 | ✔ | Cut at 3.65s lands 150ms off the 120bpm grid (max 80ms) — nudge scene duration by -150ms |
| text-overlap | frame | QE-OVERLAP-1 | ✔ | Text elements overlap by 111×26px at 1.80s |
| low-contrast-text | frame | MO-TYPE-2 | ✔ | Palette contrast 3.3:1 for "Every frame, a pure function o" (min 4.5:1) |
| blank-scene | frame | QE-BLANK-1 | ✔ | Scene midpoint is a near-uniform frame (stdev 0.00) — likely blank render or dead scene |

Scope note: this measures the *deterministic* gates only. Aesthetic defects (weak composition,
category-guessable styling, limp pacing) are the VLM critic's job (skills/critique-video) and are
NOT counted here — that layer's catch rate requires the M4 human-judged protocol.

Reproduce: `node benchmarks/seeded-defects/run.mjs` from the repo root (core built, ffmpeg on PATH).
