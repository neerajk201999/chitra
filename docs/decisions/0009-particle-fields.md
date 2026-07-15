# ADR-0009 — Particle fields (deterministic dot-matrix motifs)

**Status:** accepted · 2026-07-15

## Context

Benchmark analysis of a professionally-produced fintech launch film (the "Card Vault" reference, docs/research/benchmark-card-vault.md) identified the one capability whose absence forced a generic fallback: a **dot-matrix particle field** — a grid of dots with per-dot brightness animation (the "encryption shimmer") used both as a texture on the product and as the signature end-card motif. When an agent (Codex) tried to recreate the film without this primitive, it substituted a static 6-dot glyph and drifted to a generic purple-gradient aesthetic — exactly the slop VISION.md refuses. The missing *specific* capability caused the generic *general* failure.

This is the particle motif flagged as the last expressiveness gap in known-issues since ADR-0008. It is a curated primitive, not a raw escape hatch: authors pick a formation and a behavior, never hand-place dots.

## Decision

1. **`particles` element** — a deterministic field of dots.
   - `formation`: `grid` (cols×rows) | `ring` (count around a circle) | `scatter` (seeded pseudo-random, deterministic from `seed`).
   - `color`, `dotSize` (px at 1080, compiler-scaled), `count`/`cols`/`rows`, `radius` (ring, stage units), `seed`.
   - Rendered as `count` absolutely-positioned dot divs at compile-time-computed coordinates. Each dot carries a seeded `data-phase` ∈ [0,1). Fully deterministic; dot count is bounded (≤ 400) so it never becomes a perf or slop hazard.
2. **Three preset behaviors** (no keyframe hatch):
   - `particle-shimmer` (ambient, looping): per-dot opacity oscillates between a floor and ceiling, phase-offset by `data-phase` — the matrix twinkle. Loops inside the paused master timeline, so it stays seek-deterministic.
   - `particle-form` (enter): dots arrive into the formation with a radial stagger (center-out), scaling and fading up — the "assemble" moment.
   - `particle-morph` (feature): dots travel from their current formation to a target formation named by the animation's `morphTo` field (grid↔ring↔scatter). The compiler tracks per-element formation state across the scene's animation order and emits per-dot fromTo tweens.
3. **Gate (MO-PART-1):** shimmer amplitude is bounded (floor ≥ 0.15, so dots never fully vanish — a field that blinks off reads as broken, not alive); more than 400 dots is a P1 (perf + taste). Particle fields count as ambient for MO-CHOR-2 (they never compete with a hero).

## Consequences

- The dot-matrix motif — encryption textures, vault/shield end cards, network-node fields — is now first-class and deterministic.
- With figures (ADR-0008, arbitrary UI) + particles (ADR-0009, generative texture), the expressiveness gap against the reference frontier is closed except true 3D geometry (out of scope; CSS perspective on figures approximates it).
- `morphTo` is the second preset-specific field after cursor `waypoints`; both are validated so the field only appears on the preset that consumes it.
