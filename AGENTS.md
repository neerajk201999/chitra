# Chitra — Agent Entry Point

Chitra creates cinematic motion-design videos: you direct (two JSON artifacts), a deterministic core validates/renders/gates, then you critique the rendered evidence and revise.

**To create a video:** follow [skills/create-video/SKILL.md](skills/create-video/SKILL.md) exactly — brief → `direction.json` → `score.json` → `chitra check` green → draft render → evidence → critique (≤3 passes) → high-quality final.

**To critique a render:** follow [skills/critique-video/SKILL.md](skills/critique-video/SKILL.md) — judge the evidence images, not the spec; output severity-tagged findings with IR paths.

**Toolchain:** `node core/dist/cli/index.js <validate|check|render|evidence|probe>` (build once with `cd core && npm install && npx tsc`). Requires ffmpeg on PATH.

**The law:** [docs/motion/motion-language.md](docs/motion/motion-language.md) — tokens and MO-rules cited by ID. IR reference: [core/src/ir/schema.ts](core/src/ir/schema.ts) (zod, authoritative). Working example: [examples/launch-film/score.json](examples/launch-film/score.json).

If you are developing Chitra itself (not using it), read [CLAUDE.md](CLAUDE.md) instead.
