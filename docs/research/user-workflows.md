# How videos actually get made — workflow research (2026-07-18)

Phase 3 of the architect program (see roadmap). Evidence-first: how launch
videos, feature demos, and social shorts are really produced, what hurts, and
where removing effort (not merely generating assets) wins. Sources were
verified by a dedicated research pass; inferences are marked. This document
justifies the wedge; [capability-matrix.md](capability-matrix.md) justifies the
build order.

## 1 · The three real workflows

**(a) SaaS launch film (45–90s).** Three tiers:
- *Founder DIY*: script → screen-record (Loom/OBS/Screen Studio) → re-record →
  edit → export. 2–4 hours claimed, up to 3 days reported for polish
  (demosmith.ai PH guide; PH threads). Stakes: 53% of Product-of-the-Day
  winners have a demo video; videos correlate ~2.7× upvotes (repoclip.io,
  vibrantsnap.com).
- *Freelancer*: $500–$3,000 per finished minute; a 60s motion-graphics piece is
  20–40h basic, 40–100h+ complex (bluecarrot.io, videoigniter.com).
- *Agency*: $3k–$10k/min ($10k–$50k+ premium), 4–8 weeks: brief → script →
  storyboard → design → animation → sound → revisions. Production is only
  10–15% of the timeline; post eats 35–45%; slow client decisions are the #1
  timeline killer (pixelabstudios.com, thinkbrandedmedia.com).

**(b) Feature demo / changelog.** In-house (founder/PMM), never outsourced —
must match release cadence. Stage product with clean data → record → polish
(zooms, cursor, captions) → export → changelog/email/social. Tools: Screen
Studio, Tella, Arcade (median 6 min capture→shareable), Supademo. 15min–2h per
feature.

**(c) Social short.** Rewatch long-form for moments → clip → reframe 9:16 →
animated captions → hook → per-platform exports. OpusClip-class tools do the
whole pass in minutes; manual versions are "exhausting" (opus.pro,
flowstatehq.com).

## 2 · Pain map (pain × frequency, ranked)

1. **Revision loops** — 60% of professionals endure 5+ review rounds, 14%
   endure 10+ (Adobe survey via increditors.com); each agency round adds 3–7
   days; vague feedback forces intent reconstruction.
2. **Re-recording takes** — notifications/messy tabs/fumbled VO force retakes;
   UI changes silently invalidate old recordings (HN 46192504; supademo.com).
3. **Multi-format versioning** — every deliverable becomes 3+ aspect
   re-compositions, and it's re-layout, not crop (frame.io blog).
4. **Tool-chain friction** — "spending way more time fighting tools than making
   the actual demo" (HN 46192504).
5. **Polish mechanics** — cursor smoothing, zooms, keyframed easing: the grind
   Screen Studio automated, which is why it resonated (HN 34045110).
6. **Caption/clip cleanup** — AI captions misfire on product jargon; clip
   selection "hit or miss" (opus.pro help; comparison reviews).
7. **The creative bottleneck** — concept, script, first-3-seconds, beat
   structure: the guides exist because founders reliably get this wrong; no
   tool ships the judgment. *(Inference, well-supported.)*
8. **Render/export mechanics** — long renders, per-platform settings, upload
   failures.

## 3 · Solved vs unsolved

**Automated well already — do not compete:** screen-capture polish (Screen
Studio/Tella), interactive click-through demos (Arcade/Supademo), clip mining +
captions + reframing (OpusClip/Descript/CapCut), text-based editing (Descript),
review plumbing (Frame.io).

**Unsolved or poorly solved — the whitespace:**
- **Agency-grade launch-film quality without the agency.** Between $0
  Screen-Studio output and a $5k–$50k film there is a chasm; Jitter et al.
  trade control for simplicity (G2, linearity.io). Nobody delivers narrative +
  motion craft at DIY turnaround.
- **The creative decisions themselves** — concept, rhythm, hook, hierarchy.
- **True multi-aspect re-composition** (re-layout per format).
- **A living motion brand** — templates are rigid and per-project; nothing
  makes video N+1 inherit the taste and brand of videos 1..N. *(Inference from
  template-ecosystem shape.)*
- **Demo staging** — clean data, hiding sensitive UI, keeping demos current as
  the product changes.
- **The revision loop itself** — feedback→change is manual even with timecoded
  comments.

## 4 · What people say they want (verbatim signals)

- "Spending way more time fighting tools than making the actual demo" (HN).
- Chose Jitter to avoid "spending $$$$ on professionals" — 3h, "mostly learning
  the tool" (PH thread).
- Screen Studio's praised magic = "super clean cursor movement": people want
  the polish without doing the polish (HN).
- "Wish the AI was a little better at recognising the best snippets" (OpusClip
  users).
- 60% of marketers say repurposed content out-generates original — appetite
  exceeds production capacity (kapwing.com).

## 5 · Where automation is welcome vs refused

**Accepted in full:** mechanical transforms with an undo path — polish,
captions (editable), silence removal, reframing, export mechanics, suggestions
with scores.

**Refused:** silent creative decisions. Auto-zoom is "a liability" when it
decides framing (matte.app); founders prefer "raw real humans" over
AI-generated content (PH); clip selection accepted only as a draft; brand look
and pacing are non-delegable (the 5–10-round revision statistic is mostly taste
disputes — *inference*).

**The winning pattern: AI drafts, human directs.** Automate the ~90% mechanical
execution; generate opinionated, *legible*, overridable drafts for the creative
10%. Tools that decide silently get complaints; tools that execute flawlessly
what a human directed get love.

## 6 · Consequence for Chitra (the chosen path)

The evidence converges on one lane, and it is the one Chitra's architecture
already points at (ADR-0013's wedge):

> **The launch-film/demo tier that costs $2.5k–$50k and 20–100 hours today,
> delivered at DIY turnaround, from the product's real UI, with every creative
> decision explicit and overridable, and with taste enforced by gates + critic
> instead of revision rounds.**

Why Chitra and not the incumbents: Screen-Studio-class tools stop at capture
polish (no narrative/motion craft); Jitter-class tools stop at manual design
(no direction, no automation); agencies have the craft but 4–8 weeks and $10k;
HyperFrames has agent workflow but no output-side quality loop; Remotion is a
developer library, not a director. Chitra's Direction→Score IR *is* the
"legible, overridable creative decisions" artifact the market demands, and the
gate/critique loop directly attacks pain #1 (revision rounds) by catching
defects before a human reviews.

Direct product consequences (feed Phase 2/4 priorities):
1. **Revision loops are the #1 pain → the critique loop is the #1 feature.**
   Investment in critic calibration is investment in the core value prop, not
   QA overhead.
2. **Multi-aspect re-composition** (16:9 → 9:16/1:1 as *re-layout*, driven by
   the same Score with per-register safe zones) is high-frequency unsolved
   pain adjacent to our IR — strong Phase 4 candidate.
3. **The living motion brand** (Style Memory + brand ingestion, ADR-0012/M5) is
   validated demand, not speculation.
4. **Demo staging** (figures with clean fake data instead of recordings that
   rot) is a differentiator we already have — market it as solving
   re-recording pain (#2), keep investing in figure fidelity.
5. **"AI drafts, human directs" is our interaction contract**: every creative
   choice must remain visible in Direction/Score and cheap to override —
   never silently decided. This is now a standing design constraint.
