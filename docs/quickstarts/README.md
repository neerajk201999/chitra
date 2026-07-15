# Quickstarts

Same five minutes everywhere: install the core, scaffold, render, iterate.

```bash
npm i -g chitra-video          # or: git clone <repo> && cd chitra/core && npm i && npx tsc
chitra probe                   # verifies ffmpeg + vendored Chrome
mkdir my-film && cd my-film
chitra init . --style night --title "My film"
chitra check score.json && chitra render score.json -o out.mp4 -q draft
```

- **Claude Code** — install the plugin from `.claude-plugin/plugin.json` (or just open the repo; `AGENTS.md` routes to the `create-video` / `critique-video` skills). Say what you want; the agent runs the loop: direction → score → gates → draft → evidence → critique → revision → final.
- **Cursor** — the compiled rule at `.cursor/rules/chitra.mdc` ships in-repo (regenerate with `node scripts/build-skills.mjs`). Open the repo, ask for a video.
- **Codex / anything else** — point the agent at `AGENTS.md`; it is the harness-neutral entry point.

Audio ships in `core/audio-library/` (synthesized, license-free); reference e.g.
`"music": {"src": "path/to/pulse-bed.m4a"}` or generate your own with `chitra bed` / `chitra sfx-kit`.
