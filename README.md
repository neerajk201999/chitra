# Chitra

**The AI-native operating system for cinematic video creation.**

Install into your coding agent — Claude Code, Codex, Cursor, Gemini CLI — and direct videos that approach the quality of the best brand and product films, not "AI videos."

## Thesis

Every existing tool solves *rendering*. Chitra solves **taste**:

```
prompt → direction → design → motion → render → critique → revision → video
```

- A **two-tier Motion IR**: directorial intent + an executable, schema-validated score. Diffable, patchable, deterministic. (ADR-0003)
- A **tokenized motion language**: easing families, duration scales, pacing rules, register-aware rubrics — encoded design judgment, enforced in code. ([docs/motion](docs/motion/motion-language.md))
- A **Quality Engine that watches the render**: structural validation → deterministic gates → isolated VLM critics over rendered evidence → surgical revision, bounded at 3 passes. (ADR-0004)
- A **deterministic core** (compile → render → gate) with all reasoning in your agent's LLM — no API keys, no hosted service. (ADR-0002, ADR-0005)

## Status

**v0.1.0 — the vertical slice works end-to-end.** Motion IR → deterministic render (byte-identical, sha256-verified) → quality gates → evidence sheets → critique loop. The [flagship example](examples/launch-film/score.json) was directed, gated, critiqued, and revised entirely by an AI agent using this pipeline. See [docs/roadmap/roadmap.md](docs/roadmap/roadmap.md) and [known issues](docs/roadmap/known-issues.md).

## Use it from your coding agent

Requirements: Node 20+, ffmpeg on PATH.

```bash
git clone <this repo> chitra && cd chitra/core && npm install && npx tsc
node dist/cli/index.js probe   # verify environment
```

Then, in Claude Code / Codex / Cursor, point your agent at the repo and ask for a video — the agent entry point is [AGENTS.md](AGENTS.md), which routes to the `create-video` and `critique-video` skills. Claude Code users can also install the plugin from [.claude-plugin/plugin.json](.claude-plugin/plugin.json).

```bash
# what the agent runs under the hood
chitra validate score.json      # schema + static gates (fast)
chitra check score.json         # + rendered-frame gates: contrast, safe zones, overlap, blanks
chitra render score.json -o out.mp4 -q high   # deterministic; only dirty scenes re-render
chitra evidence score.json -o evidence/       # contact sheet + hero frames + cut strips
```

## Repository memory

This repo is built AI-first: all context an agent needs lives in version-controlled markdown. Builders start at [CLAUDE.md](CLAUDE.md); users' agents start at [AGENTS.md](AGENTS.md).
