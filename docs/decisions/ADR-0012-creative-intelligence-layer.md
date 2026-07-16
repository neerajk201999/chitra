# ADR-0012 — The Creative Intelligence layer (the pipeline above Motion IR)

**Status:** accepted · 2026-07-16
**Supersedes framing of:** ADR-0003 (Motion IR is now one tier of a larger pipeline, not the top).

## Context — a drift caught honestly

Two independent reviews (a technical due-diligence audit and a creative-strategy critique, both 2026-07-16, archived in docs/research/) converged on the same finding, and the live repository confirms it:

- **ADR-0006 through ADR-0011 are all renderer/expressiveness features** — media, video, figures, particles, real 3D, audio-reactive motion. Necessary infrastructure. But **not one of them touched direction, taste, narrative, or planning.**
- VISION.md's own thesis is *"almost none solve taste… taste is the product… Prompt → **Direction → Design** → Motion → Critique → Revision → Video."* The implementation drifted to the right end of that arrow (Motion → Render) and left the left end (Direction → Design) unbuilt.
- The Direction IR tier exists in `schema.ts` but is **orphaned**: no CLI loads it, no gate checks Direction↔Score consistency. `motion-language.md` encodes *motion mechanics* (duration, easing, choreography) — the HOW — and contains **no** narrative, camera, emotional-arc, composition, colour, rhythm-of-reveal, or brand philosophy. The WHY is undocumented and unbuilt.

First-principles restatement of the goal: Chitra exists to make videos that *feel like Apple / CRED / OpenAI / Nothing / Google*. Those films are decided — emotion, rhythm, reveal, silence, tension, when music enters, what the camera says — **before** a single frame is specified. Chitra's pipeline begins after most of those decisions. **That, not 3D or shaders, is the real gap.**

## Decision

1. **Motion IR is demoted to one tier of a multi-tier creative pipeline:**

   ```
   Prompt / Reference
        ↓  Reference Decomposer  → Style DNA (measurable descriptors)
        ↓  Creative Director     → Creative Brief (product, audience, emotion, objective)
        ↓  Narrative Planner     → Narrative (arc, beats, emotional curve)
        ↓  Storyboard Planner    → Storyboard (shot list: intent, hero moment, camera, type, timing)
        ↓  Shot / Motion Planner → Motion IR Score (the existing HOW)
        ↓  Renderer              → Video
        ↑  Creative QA + Style Memory feed back at every tier
   ```

2. **Every tier is a typed, agent-legible, diffable IR with conformance gates between tiers** — the Chitra way. The creative layer is *not* prose vibes; it is measurable and deterministic-where-possible, exactly like the motion layer. A Score that does not trace to a Storyboard shot, or a Storyboard that abandons a Brief objective, is a gate failure — the same discipline as MO-* rules, one level up.

3. **The Creative Constitution** (`docs/creative/creative-constitution.md`) becomes the encoded WHY across *all* creative dimensions (narrative, camera, typography, rhythm, colour, composition, spacing, brand, emotion), sitting beside motion-language.md (the HOW). Every creative-AI decision reads it first. It is the taste model made explicit and, over time, measurable.

4. **Renderer development is declared feature-complete unless a concrete target film exposes a specific missing capability.** No more expressiveness features for parity. The next milestone (M4) is Creative Intelligence, not more transitions/particles/shaders. ChitraBench comes *after* the creative layer exists — otherwise we benchmark a renderer, not a creative system.

5. **Every tier answers WHY, not just HOW.** Each storyboard shot must justify why it exists, why now, why this movement/transition/typography. The Score's `reason` field was a seed of this; it is promoted to a first-class, gated linkage up the tiers.

## Consequences

- The four vision roles finally map to owned subsystems: **Director** (Brief/Narrative/Storyboard planners — new), **Planner** (Shot/Motion — partly exists), **Evaluator** (Quality Engine + new Creative QA), **Renderer** (done).
- "User as director" — *"make it like this reference, but for my product, more playful"* — becomes expressible: it edits the Brief/Storyboard tiers, and the change flows down through conformance gates without re-generating everything. This capability **does not exist today**; the pipeline is what unlocks it.
- Motion IR, the renderer, gates, determinism, 3D, audio become **infrastructure in service of creative decisions** — not the product.
- Success metric shifts from "how many render features match Remotion" to **"can Chitra independently make the creative decisions a top motion designer + creative director would make?"** — measured by ChitraBench once the layer exists.

## What this ADR does NOT do

It does not delete or deprecate any shipped capability. It does not claim the creative layer is built — this ADR opens M4; the first executable brick (Brief IR + Brief↔Score conformance gate, wiring the orphaned Direction tier) ships with it. The rest is a multi-milestone build, tracked honestly in the roadmap.
