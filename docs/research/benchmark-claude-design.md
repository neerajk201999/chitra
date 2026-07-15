# Benchmark: Anthropic "Introducing Claude Design" (2026)

The standing quality bar for the product-demo register (ADR-0008 originates here).
81s, 24fps, music-driven (no VO), beat-cut. Deconstructed technique inventory and
Chitra coverage:

| Technique in the film | Chitra mechanism | Status |
|---|---|---|
| Product UI as crisp in-scene mockups (dialogs, menus, phone frames) | `figure` element: sanitized, token-themed HTML fragments, gated on pixels | ✅ ADR-0008 |
| Cursor moves/clicks through UI | `cursor` element + `cursor-move` (waypoints) + `cursor-click` (ring) | ✅ ADR-0008 |
| Typing into inputs | `type-in` preset (per-char cadence + caret) | ✅ ADR-0008 |
| Serif interstitial word cards on cream | Instrument Serif display + paper-family palette | ✅ (M1) |
| Count-up stats + rising bar chart | `stat` + `chart-bar` | ✅ (M1) |
| Screen-recording clips in frame | `video` element (frame pre-extraction) | ✅ ADR-0007 |
| Music bed, beat-aligned cuts | `audio.music` + MO-AUD-2 beat grid; library in core/audio-library | ✅ (M2/ADR-0007) |
| Dark globe/network motion motif | gradient-field ambients approximate; particle/network fields NOT covered | ⚠️ gap (curated preset candidate) |
| Physical-camera b-roll (hands, soldering) | out of scope — live footage is footage, referenced via `video` | n/a |

Honest verdict: the *grammar* of the film is now fully expressible except
generative ambient motifs (particle fields), which is a curated-preset roadmap
item, not an architecture gap. Reaching the film's *polish* is now a direction
and iteration problem — the standing recreation exercise for ChitraBench (M4).
