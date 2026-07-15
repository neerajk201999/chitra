# Benchmark: "Card Vault" fintech launch reference (2026)

720×900 (4:5), ~9.2s, music-driven. A user gave this as a reference; an agent
(Codex) recreated it via Chitra and the output captured structure but not soul —
the diagnostic failure that motivated ADR-0009.

| Technique in the reference | Chitra mechanism | Status |
|---|---|---|
| Dot-matrix shimmer (card texture + end-card motif) | `particles` + `particle-shimmer`/`particle-form`/`particle-morph` | ✅ ADR-0009 |
| Black + crimson palette, red glow | style palette + gradient-field ambients | ✅ |
| Floating card with depth/lighting | `figure` with CSS perspective + layered gradients | ~ (approximates; true 3D out of scope) |
| Phone wallet with card | phone-frame figure + card figure | ✅ (ADR-0008) |
| Card-swap (Mastercard→VISA→RuPay) | figures + cross-fade/pulse choreography | ✅ |
| Add-a-card form UI | figure fragment | ✅ (ADR-0008) |
| Reference audio track | `chitra extract-audio` (rights are the user's responsibility) | ✅ |

Why Codex's attempt drifted to generic purple-gradient slop: the dot-matrix
primitive did not exist, so the agent substituted the nearest easy thing. The
lesson (recorded): a missing *specific* capability manifests as a *generic*
failure. Closing the primitive closes the class.
