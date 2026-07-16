# Honest gap analysis: Chitra vs Remotion, EditFrame, HyperFrames, Replit Video

Written 2026-07-15 after a user gave a 3D-rendered fintech reference and Chitra
could only approximate it. No self-congratulation. What they can do that we
cannot, sorted by whether it is a *fundamental* gap or a *self-imposed* one.

## The rendering model — NOT a gap (explaining "why decide a number of frames")

Every one of these tools renders the same way we do: pick an fps, and for each
frame index N compute/paint the scene at time N/fps and capture it. Remotion:
`useCurrentFrame()` → you compute state → screenshot. Chitra: seek the GSAP
timeline to N/fps → screenshot. Both are frame-accurate and deterministic. We
render at 30fps because that is the delivery standard; it is a choice, not a
limitation, and it matches what they do. This is not where we lose.

## Fundamental gaps (real capability we do not have)

### 1. Real 3D (WebGL / Three.js). CLOSED 2026-07-15 (ADR-0010).
The reference card is a 3D render — true perspective, specular highlights that
travel as it rotates, depth of field, soft shadows. We fake it with CSS
`perspective` + layered gradients, which reads flat next to the real thing.
- **Remotion**: `@remotion/three` embeds a real Three.js canvas, frame-driven.
- **Us**: figures strip all scripts (determinism + safety), so no WebGL today.
- **Status**: BUILT. `scene3d` element (card/coin/slab primitives), Three.js
  inlined and driven by our seek clock, SwiftShader software-GL for
  cross-hardware determinism. Same-machine byte-identical render verified.
  Cross-machine golden-frame CI remains M5. Remaining 3D work is curated-
  primitive breadth (more shapes, GLTF import), not architecture.

### 2. Audio-reactive / scored motion. THE timing gap.
We render silent, then lay a track over the top with a fade. Motion never knows
the audio. The reference's every hit lands on a beat.
- **Remotion**: `useAudioData` + `visualizeAudio` — read the waveform, drive any
  visual property off audio energy; motion is literally a function of the music.
- **Us today**: a *declared*-BPM gate that only warns if a cut is off-grid. We
  do not detect tempo from the actual file, and nothing snaps motion to beats.
- **Honest verdict**: "how do we align audio to motion?" — we don't. Buildable
  without new runtime risk: analyze the track → beat/energy envelope → bind
  animation starts to beats. → ADR-0011 (building this now).

## Self-imposed gaps (we CHOSE these to prevent slop; can add a gated pro tier)

### 3. Arbitrary keyframes / custom easing curves.
Remotion: `interpolate(frame,[0,15,30],[0,1,.4],{easing:bezier(...)})` — any
property, any curve, per frame. We expose curated presets only. This was a
deliberate anti-slop decision (ADR-0004/motion-language) and it is *why our
output has a floor*. But it also caps a skilled director. The GSAP engine under
us can already do everything Remotion's `interpolate`/spring can — we've fenced
it. The honest fix is a gated "author" tier: raw keyframes allowed *with a
reason*, flagged by gates, never the default. (The `override` field is a seed of
this; it needs to grow to full keyframe arrays.)

### 4. Layered/continuous audio (multi-track, ducking, volume automation).
We have one bed + SFX at delays. Remotion/EditFrame have full audio timelines.
Medium effort, no architectural risk. Roadmap, not urgent.

## Not gaps (parity or better)
- Determinism / byte-identical re-render: **we are stronger** (Remotion does not
  promise this; it is our moat).
- Quality gates + critique loop: **nobody else has this at all.**
- HTML/CSS/SVG rendering, fonts, images, video-in-scene, cursor/type/figures,
  particles: parity for 2D motion-graphics work.

## The honest bottom line
For flat/2D motion-graphics launch films (most of the market) we are at parity
and win on determinism + quality control. For anything built on **real 3D** or
**music-scored motion**, they can and we currently cannot. Those are two named,
buildable capabilities (ADR-0010, ADR-0011), not a vague "polish" deficit. Until
they ship, the honest claim is: Chitra matches Remotion/EditFrame for 2D scored
*after* ADR-0011, and for 3D only *after* ADR-0010. We do not yet.
