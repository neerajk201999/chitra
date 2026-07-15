# Audio library provenance

Every file in this directory is synthesized deterministically by Chitra's own
generators (`chitra bed`, `chitra sfx-kit` — ADR-0007). No third-party samples,
no licensing obligations. Regenerate at any time:

- `music/calm-bed.m4a` — `chitra bed -d 90 --freq 110 --bpm 72` (A2, ambient)
- `music/pulse-bed.m4a` — `chitra bed -d 90 --freq 146.83 --bpm 104` (D3, driving)
- `music/warm-bed.m4a` — `chitra bed -d 90 --freq 87.31 --bpm 84` (F2, warm)
- `sfx/*` — `chitra sfx-kit`

For real produced music: drop any licensed file into your project and point
`audio.music.src` at it; `chitra fetch <direct-mp3-url>` works for stock
services that give direct links; AI music APIs (e.g. ElevenLabs) are the
current best generative option — generate, save locally, reference by path.
