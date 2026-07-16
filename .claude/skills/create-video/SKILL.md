---
name: create-video
description: Direct and render a cinematic motion-design video from a brief using Chitra. Use when the user wants to create a video, launch film, product demo, promo, social clip, or any motion-design piece. Runs the full pipeline - direction, score, deterministic gates, render, evidence, critique loop.
---

# Chitra · Create Video

You are the **director**, not a generator. You produce two artifacts (Direction, then Score), let the deterministic core validate and render them, then **watch the evidence and revise**. Never skip the critique loop.

## Non-negotiables (violations are bugs, not style choices)

1. Every animation uses **preset + tokens**. Raw durations/easings require `override.reason` and must earn it.
2. Every scene and cut carries a real `reason` — if you can't say why a scene exists, cut it.
3. One hero moment per scene (`MO-CHOR-2`). Supporting elements support; they never compete.
4. Copy is shorter than you want. Reading time is gated (`MO-EDIT-1`); cut words, not hold time.
5. `chitra check` must be green before any render you show the user.
6. After rendering: generate evidence, critique it (see step 6), fix, re-render. **Max 3 revision passes**, then present remaining findings honestly.

## Pipeline

### 0 · Locate the toolchain
The Chitra repo provides `core/dist/cli/index.js` (invoke as `chitra` below via `node <repo>/core/dist/cli/index.js`). If `dist` is missing: `cd core && npm install && npx tsc`. Verify with `chitra probe`.

### 1 · Brief → Direction (Tier 1)
Interrogate the brief (ask the user only what you cannot infer): subject, audience, **register** (`brand-film` | `product-demo` | `social-short`), duration target, brand constraints (colors/fonts/logo), the single message that must land.
Write `direction.json` (schema: `tier:"direction"`): logline, narrativeArc (setup → tension → peak → release), tone words, per-scene `narrativeRole`, `shotIntent`, `heroMoment`, `pacingWeight`. 4–8 scenes for 25–45s. Show it to the user in one compact block; incorporate feedback before scoring.

### 2 · Direction → Score (Tier 2)
Write `score.json` (`tier:"score"`). Consult the motion language (`docs/motion/motion-language.md` in the Chitra repo) — cite rules by ID in your reasoning, never restate values.

Style: start from a house style in `styles/` (e.g. `night.json`, `paper.json`) and adapt palette to brand. Keep palettes ≤ 2 chromatic colors + neutrals. Fonts available: Space Grotesk / Instrument Serif / Inter (display), Inter (text).

Element vocabulary: `text` (textRole: display/headline/title/body/caption/kicker), `shape` (rect/line/circle/gradient-field), `image`, `video` (frame-extracted clips), `figure` (sanitized token-themed HTML mockups — start from core/figures-library/), `cursor`, `stat` (with count-up), `chart-bar`.

**Complex UI & interaction (ADR-0008).** Author product mockups as figure fragments (full HTML/CSS, styled ONLY via var(--bg|surface|primary|accent|text|text-dim) and var(--font-display|text|mono); scripts stripped; content clipped to the figure's bounds). Give inner nodes ids and animate them with `target: "figureId/innerId"` — dropdowns opening, buttons pulsing, toasts appearing. Stage interactions with `cursor` + `cursor-move` (waypoints) + `cursor-click`, and `type-in` on text for typing moments. Cursor coordinates mean the pointer TIP (aim waypoints at the exact button center). Figure internals reset each scene: re-declare changed states across match cuts (`hide` at scene-start applies from first visibility, so transition overlap cannot ghost — IR-FIG-1 enforces this). Reactions (button responds to click) use `pulse`, never an enter preset (MO-CHOR-5). Attach sounds to motion via `sfx` on the animation (click.wav for cursor-click; kit in core/audio-library/sfx). Sparse by rule: MO-AUD-3.

**Assets from the world (ADR-0006).** When the brief references real material — a product, a site, a logo, photography — acquire it BEFORE writing the score, never by URL inside it:
- `chitra fetch <url> -o assets/name.jpg [--max-width 1600]` — download + normalize an image (strips metadata, logs provenance to `assets/sources.jsonl`).
- `chitra snap <url> -o assets/site.png [--width 1920 --height 1080] [--full-page] [--delay 2500]` — screenshot a live webpage with the vendored Chrome (product-UI scenes, references).
- Video reference? Extract stills: `ffmpeg -ss <sec> -i ref.mp4 -frames:v 1 assets/still.png`. (Downloading the video itself — e.g. yt-dlp — is the user's step; ask them.)
- Reference has a voiceover or narration? Transcribe it with timestamps before writing the direction: `ffmpeg -i ref.mp4 -ar 16000 -ac 1 audio.wav && whisper-cli -m ~/.cache/whisper-cpp/ggml-base.en.bin -f audio.wav -oj` (whisper.cpp via Homebrew; model auto-download documented in ADR-0006). The transcript is CONTEXT for copy and structure, never copy itself: launch-film copy comes from approved brand positioning, with the transcript telling you which product moments matter and where they live in the recording (timestamps → still extraction).
- Screen recordings carry recorder chrome (toolbars, share toasts) and personal data (account emails, balances). Crop them OUT — check every crop before it enters a score.
- Then reference by relative path: `{"type":"image","src":"assets/site.png","fit":"cover","radius":2,"scrim":0.35}`. Asset bytes are content-hashed into the render cache — editing a pixel re-renders exactly the scenes that show it. Obey MO-MED-1..4: scrim or on-media text, never untreated, one slow move max.
Preset vocabulary: enters `fade-up · fade-in · scale-settle · slide-in · wipe-reveal · line-reveal · blur-focus`; features `count-up · draw-line`; ambient `drift · scale-drift` (give ambient an `override.durationMs` = scene length, reason "ambient field travels the full scene length"); exits `fade-out · fade-down-out · scale-out`.
Relational timing: `at.after` chains animations (`{"after":"kicker-in","offsetMs":120}`). Stagger ≤ 60ms each (`MO-CHOR-1`).

Craft rules that separate direction from slop:
- Vary composition scene-to-scene (`MO-EDIT-3` gates it): alternate centered/left-anchored, text/data, bg/surface.
- Choreograph toward each scene's `heroMoment`; give the hero ≥2× the motion amplitude of supports.
- Exits at 75% of entrance duration (`MO-DUR-2`); ensure exit + fade complete **before** scene end.
- Ambient motion in every scene ≥ its register's floor — a static frame is a dead frame (`MO-REG-1`).
- Text over media needs `scrim` ≥ 0.3 or it will fail the per-frame contrast gate (`MO-TYPE-2`).

### 3 · Gate
`chitra validate score.json` (fast, static) → fix all P1/P2. Then `chitra check score.json` (renders probe frames; contrast/safe-zone/overlap/blank gates). Green means 0 P1. Treat P2 as "fix unless you have a stated reason". P3s are review notes — read them.

### 4 · Draft render
`chitra render score.json -o out/draft.mp4 -q draft` (fast). Never present a draft as final.

### 5 · Evidence
`chitra evidence score.json -o out/evidence` → contact-sheet.png (3 samples/scene), hero-*.png (full-res per scene), cut-strips.png (every cut boundary pair).

### 6 · Critique — watch, then fix
Open and **look at** the evidence images (contact sheet first, then hero frames, then cut strips). Use the `critique-video` skill's rubric if installed; otherwise judge, per scene, in this order: composition & hierarchy → typography → color/contrast → motion legibility (compare in/mid/out states) → cut continuity (strips: does each cut land on a composed frame?) → the two-altitude slop test ("could you guess this look from the category alone? could you guess its evasion?").
File each finding as: scene id, IR path, severity (P1 blocks, P2 should fix, P3 note), one-line fix. Patch **only the cited IR spans** in score.json — the per-scene cache makes surgical edits cheap. Re-run from step 3. Max 3 passes.

### 7 · Final
`chitra render score.json -o out/final.mp4 -q high`. Deliver: final.mp4, the contact sheet, and a 3-line delivery note (what was directed, what the critique loop caught, any remaining P2/P3s).

## Failure honesty
If a gate stays red, a font/asset is missing, or critique keeps finding the same defect — say so plainly with the finding attached. A degraded render presented as success is the one unforgivable output.
