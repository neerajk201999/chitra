# Critic Calibration (M2 exit, aesthetic half)

Measures whether the VLM critic (`skills/critique-video`) catches defects the deterministic gates **cannot**: motion monotony, category-guessable slop aesthetics, intent/hierarchy failures — while staying quiet on a clean control.

## Protocol

1. `node benchmarks/critic-calibration/build.mjs` — regenerates the 4 cases and their evidence (each case passes deterministic gates by construction; the builder fails loudly if a P1 leaks in).
2. For each case in `cases/<name>/`, run a **fresh, isolated** critic session following `skills/critique-video/SKILL.md` on `evidence/` (+ `direction.json` where present). The critic must not see `labels.json`, other cases' results, or this README's case descriptions.
3. Score the critic's JSON output against `labels.json` (verdict match · mustFind hits · false positives) and record it as `runs/run-NNN.md` with the critic model/version and date.

## Interpreting runs

- **mustFind hits < 4/4** → the rubric under-detects; sharpen the relevant dimension in the skill and re-run.
- **False positives on the control** → the rubric over-triggers; recalibrate ("most competent videos deserve revise with 2–6 findings" may need tightening).
- Improvements to the skill must cite run numbers — rubric changes without measurement are vibes.

## Known limitations (be honest when quoting numbers)

- 4 cases is a smoke test, not a benchmark. Grow toward ~20 cases across registers before publishing agreement stats.
- Labels are **author-labeled** (the case designer wrote the ground truth). Independent human labels are required before any public claim about critic reliability.
- Static evidence (contact sheets) cannot expose easing *feel*; motion-judgment calibration needs frame-pair or clip evidence (M2 remainder).
