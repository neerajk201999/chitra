# Critic Calibration (M2 exit, aesthetic half)

Measures whether the VLM critic (`skills/critique-video`) catches defects the deterministic gates **cannot**: motion monotony, category-guessable slop aesthetics, intent/hierarchy failures — while staying quiet on a clean control.

## Protocol

1. `node benchmarks/critic-calibration/build.mjs` — regenerates the **12 cases** (brand-film, product-demo, and social-short; two clean controls) and their evidence. Each case passes deterministic gates by construction; the builder fails loudly if a P1 leaks in.
2. For each case in `cases/<name>/`, run a **fresh, isolated** critic session following `skills/critique-video/SKILL.md` on `evidence/` (+ `direction.json` where present). The critic must not see `labels.json`, other cases' results, or this README's case descriptions.
3. Have the critic write machine-readable output per case: `runs/run-NNN/<case>.json` with `{"verdict": "ship|revise|redirect", "findings": [{"dimension", "severity", "note", "path"}]}`.
4. Score mechanically: `node benchmarks/critic-calibration/score-run.mjs runs/run-NNN` — prints verdict accuracy, mustFind recall (dimension+severity matched; gists listed for human adjudication), and control violations; writes `summary.md` into the run dir. Record the critic model/version and date there.

## Interpreting runs

- **mustFind hits < 4/4** → the rubric under-detects; sharpen the relevant dimension in the skill and re-run.
- **False positives on the control** → the rubric over-triggers; recalibrate ("most competent videos deserve revise with 2–6 findings" may need tightening).
- Improvements to the skill must cite run numbers — rubric changes without measurement are vibes.

## Known limitations (be honest when quoting numbers)

- 12 cases across three registers (expanded 2026-07-17) is a usable harness but still shy of the ~20-case bar for publishing agreement stats.
- Labels are **author-labeled** (the case designer wrote the ground truth). Independent human labels are required before any public claim about critic reliability.
- Static evidence (contact sheets) cannot expose easing *feel*; motion-judgment calibration needs frame-pair or clip evidence (M2 remainder).
