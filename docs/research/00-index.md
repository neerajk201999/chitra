# Research Index

Immutable, dated snapshots (2026-07-14). Conclusions drawn from these live in ADRs and architecture docs.

| Report | Subject | Role | One-line verdict |
|---|---|---|---|
| [hyperframes.md](hyperframes.md) | HyperFrames (HeyGen) | Primary competitor | Best agent-orchestration + encoded taste in any creative tool; **no output-side quality loop** — nothing ever watches the render |
| [remotion.md](remotion.md) | Remotion | Rendering benchmark | Brilliant frame-pure model; **do not build on it** (license + Chrome-screenshot substrate its own authors are leaving); clean-room its patterns |
| [landscape.md](landscape.md) | EditFrame + wider SOTA | Market map | HTML/CSS + relational timing is the converged agent-native format; VLM-critic loops proven (Code2Video +40-50%); **the quality layer is unowned whitespace** |
| [impeccable.md](impeccable.md) | Impeccable | Quality Engine seed | Hybrid deterministic-detector + isolated LLM critique, honest rubrics, closed fix loop; has **no concept of time** — everything temporal is ours to invent |
| [openmontage.md](openmontage.md) | OpenMontage | Idea source | Two-tier IR (intent `scene_plan` + executable EDL with per-cut `reason`); deterministic slop gates that block renders; default output is textbook slop — enforce invariants in code, not markdown |
| [video-use.md](video-use.md) | video-use (browser-use) | Idea source | Bounded VLM feedback loop over composite filmstrip evidence images; "the LLM reads the video" (word-timestamped transcript as edit-addressing scheme) |
| [stack-validation.md](stack-validation.md) | Implementation stack | Pre-build validation | Locked decisions: seek-protocol screenshot capture, Chrome flag set (with the BeginFrame-flag trap), GSAP drive, FFmpeg ladder, Fontsource OFL fonts, sharp evidence, mulberry32 |

## The synthesis (what all six say together)

1. **Generation-side constraint alone plateaus.** HyperFrames poured 372K words of prose into constraining generation and still ships silent-failure footguns because nothing evaluates the result. OpenMontage's markdown governance is unenforceable. → Chitra closes the loop: schema-validated IR (structural prevention) + deterministic gates (cheap objective checks) + VLM critic watching rendered frames (aesthetic judgment) + surgical revision.
2. **The agent-native representation has converged**: HTML/CSS/GSAP for the frame, relational timing for the timeline, structured intent + executable EDL as the IR. GSAP is now fully free.
3. **The renderer is a solved substrate, not the product.** Deterministic seek (CDP BeginFrame) + FFmpeg is proven in two codebases; WebCodecs is the future everyone (Remotion, EditFrame) is converging on. Abstract the backend.
4. **Taste is encodable.** Apple springs, Material tokens, Linear/Kowalski rules, Impeccable's two-altitude slop test, HyperFrames' house styles — concrete, tokenizable, testable.
5. **The moat is the benchmark.** No VBench-for-motion-design exists. Whoever defines the measurement defines "best."
