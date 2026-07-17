# Chitra

**The AI-native operating system for cinematic video creation.** Point your coding agent at it and ask for a launch film — Chitra gives the agent the taste, the guardrails, and a deterministic renderer, so the output aims at Apple/CRED/Linear-grade brand and product films, not "AI video."

No API keys. No hosted service. Your agent does the reasoning; Chitra does the pixels — and refuses to ship slop.

---

## Quickest start — hand it to your agent

In **Claude Code, Cursor, Codex, or Gemini CLI**, paste this:

> Clone https://github.com/neerajk201999/chitra, run its `scripts/setup.sh`, then read `AGENTS.md` and make me a 20-second launch film for **<your product>**. Iterate until `chitra check` is green.

That's it. The agent clones, builds, reads its own instructions ([AGENTS.md](AGENTS.md)), and drives the create → gate → critique → revise loop. **Claude Code** users get the skills automatically (they're in [`.claude/skills/`](.claude/skills)); **Cursor** users get the rule in [`.cursor/rules/`](.cursor/rules).

## Human start — one command

Requirements: **Node 22.12+** and **ffmpeg** on your PATH.

```bash
git clone https://github.com/neerajk201999/chitra && cd chitra && ./scripts/setup.sh
```

`setup.sh` checks your toolchain, builds, links the `chitra` command, and runs a probe (which downloads Chrome for Testing once, ~150MB — installs themselves are 7 seconds / ~107MB). Then:

```bash
mkdir my-film && cd my-film
chitra init . --style night --title "My film"   # a gate-passing starter score
chitra render score.json -o out.mp4 -q draft    # your first video, in seconds
```

Once published to npm it's simply `npm install -g @neeraj201999/chitra` — check [the package page](https://www.npmjs.com/package/@neeraj201999/chitra).

## The loop

```
prompt → direction → design → motion → render → critique → revision → video
```

```bash
chitra init . --style night --register brand-film --title "Launch"  # never start from blank
chitra validate score.json      # schema + static taste gates (instant)
chitra check score.json         # + rendered-frame gates: contrast, safe zones, overlap, blanks
chitra frame score.json -t 1800 -o peek.png    # one-frame preview in seconds
chitra render score.json -o out.mp4 -q high     # full frame-gated; refuses P1 findings
chitra evidence score.json -o evidence/         # contact sheet + hero frames + cut strips
```

Housekeeping: frame caches make re-renders instant; `chitra clean` clears one project, `chitra clean --global` reclaims every cache on the machine (they rebuild on demand).

Beyond the basics: `chitra fetch`/`snap` (pull real images/screenshots), `chitra analyze-audio` + `at.onBeat` (motion scored to a track), `chitra bed`/`sfx-kit` (license-free audio), plus `image`/`video`/`figure`/`particles`/`scene3d` elements — real 3D, dot-matrix motifs, and sandboxed UI mockups. See [AGENTS.md](AGENTS.md).

## Why it's different

Every other tool solves *rendering*. Chitra also solves **taste and trust**:

- **Motion IR, not raw code** — a two-tier schema (directorial intent + executable score): diffable, patchable, and impossible to fill with the usual AI-slop patterns. (ADR-0003)
- **A quality engine that watches its own render** — 40+ deterministic gates (reading time, contrast on real pixels, safe zones, hero hierarchy, dead-air, slop signatures, beat alignment) plus evidence sheets for a bounded critique loop. Findings map to exact IR paths for surgical fixes. (ADR-0004)
- **Determinism as a feature** — same score, byte-identical frames on the same machine (sha256-verified), including real 3D via SwiftShader. Nobody else promises this. (ADR-0002)
- **Encoded design judgment** — a [motion language](docs/motion/motion-language.md) and [creative constitution](docs/creative/creative-constitution.md) with rules enforced in code, not just prose.

## Status — honest

**v0.2.1.** The closed loop works and is measured: deterministic render → gates (**10/10** on the [seeded-defect benchmark](benchmarks/seeded-defects/results.md)) → evidence → critique → revision. Capabilities shipped: images, video-in-scene, sandboxed UI figures, cursor/type choreography, particle fields, real 3D, beat-scored audio.

**Not yet:** the aesthetic critic is not independently validated (small labelled set); no cross-machine golden-frame CI; no live preview UI; no distributed rendering. We publish what's proven and what isn't in the [roadmap](docs/roadmap/roadmap.md) and [known issues](docs/roadmap/known-issues.md). If a claim isn't measured, it says so.

## For contributors / the curious

The repo is its own memory — all context lives in version-controlled markdown. Start at [CLAUDE.md](CLAUDE.md) → [VISION.md](VISION.md) → [docs/decisions/](docs/decisions/) (ADRs) → [docs/roadmap/](docs/roadmap/). MIT licensed.
