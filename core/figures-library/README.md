# Figures library (ADR-0008)

Copy a frame into your project's `figures/`, replace the CONTENT comment with
your UI (token-styled: var(--bg), var(--surface), var(--accent), var(--text),
var(--text-dim), var(--font-display), var(--font-text), var(--font-mono)), and
reference it: `{"type":"figure","src":"figures/my-mockup.html",...}`.

Give inner nodes ids and choreograph them with `target: "figureId/innerId"` —
figures are nested compositions. Everything inside stays within the figure's
bounds (overflow is clipped by design). Scripts and external references are
stripped at compile; unresolved inner ids fail loudly at session open.
