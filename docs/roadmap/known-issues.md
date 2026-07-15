# Known Issues (v0.1.0 — 2026-07-15)

Honest ledger. Each item is either scheduled (milestone in parentheses) or explicitly accepted.

1. **Render speed ~2 fps/worker** (screenshot mode, single browser). Scheduled: per-scene parallel sessions + static-frame dedup + Linux BeginFrame mode (M5). Mitigated today by the per-scene cache — revisions re-render only dirty scenes (measured: 774→252 frames on a 2-scene edit).
2. **`fade` transition fades to stage background, not a true crossfade** — the incoming scene only becomes visible at its own start. True overlap needs incoming-scene pre-visibility with z-order control (M2, with the Editor).
3. **No audio pipeline yet** — `audio` field is schema-reserved, unused (M2: beat grid, narration timestamps, loudness gates, beat-referenced choreography).
4. **QE-OVERLAP-1 samples one settled instant per scene** — moving text could overlap transiently between samples (extend to per-cut sampling in M2).
5. **Contrast gate over media approximates** region background by mean luminance; high-variance backdrops can pass while locally failing (M2: tile-min sampling).
6. **Chart bars at conservative 0.28 fill-opacity** read dim on some displays; acceptable on the night style, revisit with the palette system (M5 brand ingestion).
7. **Skills are single-source but not yet compiled per harness** — Claude Code plugin + AGENTS.md work today; Cursor rules / Codex manifests + hash manifest are M3 exit work.
8. **Renders not yet parallel/distributed** — chunk-and-concat design documented (ADR-0002 consequences), unimplemented (M5).
