# ADR-0008 — Figures (agent-authored UI mockups) and interaction choreography

**Status:** accepted · 2026-07-15

## Context

Benchmark analysis of Anthropic's "Introducing Claude Design" launch film (docs/research/benchmark-claude-design.md) shows the two capabilities Chitra lacks to reach that bar: rich product-UI mockups composed *inside* scenes (phone frames, dialogs, menus — not screenshots, but crisp vector-sharp UI), and a choreographed cursor that moves, clicks, and types across them. Screenshots can't deliver this: the reference UI is retina-sharp at any scale, themed to the film's palette, and animates internally.

The requesting agent (Claude Code) is *good* at writing HTML/CSS UI. The danger is the raw-HTML escape hatch (HyperFrames' architecture) — unbounded HTML is where slop enters. The resolution is containment, not prohibition.

## Decision

1. **`figure` element — a sandboxed, token-themed HTML fragment.** `{type:"figure", src:"figures/phone.html", width, height, …}` references a project-local fragment file. At compile: script tags, event handlers, and external references are stripped (whitelist sanitizer); the fragment is wrapped in an isolated container that exposes ONLY the style tokens as CSS variables (`--bg`, `--surface`, `--primary`, `--accent`, `--text`, `--text-dim`, fonts). Fragments are rendered in-DOM, so *composed-image* gates (blank-frame) see them — BUT text authored INSIDE a fragment is NOT registered by textRegions() and currently bypasses the typography/contrast/safe-zone/overlap gates (audit finding A1, 2026-07-16). Closing this is M4 Creative QA work. fragment bytes participate in the scene hash. The agent authors the mockup; the Quality Engine still owns the floor. Figure sub-elements are animatable by id from choreography (`target: "el-id"` resolves inside figures too).
2. **Interaction choreography.** Three additions, all preset-shaped (no keyframe hatch):
   - `cursor` element: a stylized pointer (SVG, theme-aware, subtle shadow).
   - `cursor-move` preset with `waypoints: [{x,y}, …]` (stage units) — the ONLY preset that accepts waypoints, and waypoints are only valid on cursor targets (gated IR-CUR-1). Eased per-segment with the standard family.
   - `cursor-click` preset: scale dip + expanding click ring at the cursor's current position.
   - `type-in` preset (text elements): per-character reveal at a fixed cadence with a blinking caret during the reveal — the "someone is typing" moment every product film needs.
3. **Starter audio library.** `core/audio-library/` ships a small CC0-licensed set (music beds + UI/impact SFX, provenance in LICENSES.md) so films have real music out of the box; `chitra bed`/`chitra sfx-kit` remain the zero-asset fallback.

## Consequences

- "Can Chitra generate complex UI/graphics per brief?" becomes structurally yes: the agent writes fragments with the full expressive power of HTML/CSS, while determinism (hashing, sanitization, no scripts) and taste (gates run on rendered pixels) are preserved.
- MO-SLOP and MO-MED rules extend to figures; a figure is media for gating purposes.
- Cursor + type-in unlock the product-demo register's signature move: staged interaction moments.
- Recreating the Claude Design film becomes a composition task, not a capability gap (the standing benchmark for this ADR).
