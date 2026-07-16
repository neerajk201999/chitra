# Chitra — Session Entry Point

> **Just want to *make a video* with Chitra (not develop Chitra itself)?** Stop here and read **[AGENTS.md](AGENTS.md)** — it is the user-facing entry point (build the CLI, then the create → gate → critique loop). This file is for working **on** Chitra's own codebase.

You are working on Chitra: the AI-native operating system for cinematic video creation. The repository is the memory (ADR-0001) — recover all context from these files, in this order:

1. **[VISION.md](VISION.md)** — mission, benchmarks, definition of world-class, refusal list. Read always.
2. **[docs/roadmap/roadmap.md](docs/roadmap/roadmap.md)** — current milestone, exit gates, standing risks. Read always; your task must serve the current milestone.
3. **[docs/architecture/system-overview.md](docs/architecture/system-overview.md)** + the ADRs in [docs/decisions/](docs/decisions/) — how the system works and why. Read before any design or implementation work.
4. **[docs/standards/engineering-standards.md](docs/standards/engineering-standards.md)** — code, prompt, and review standards. Read before writing code or skills.
5. **[docs/creative/creative-constitution.md](docs/creative/creative-constitution.md)** — the encoded WHY (narrative, rhythm, camera, type, colour, composition, brand; CC-* rules). Read before ANY creative decision (brief, storyboard, direction, critique). This is the taste model. (ADR-0012)
6. **[docs/motion/motion-language.md](docs/motion/motion-language.md)** — the encoded HOW (motion mechanics; MO-* rules). Read before touching rendered output, gates, or critic rubrics.
7. **[docs/research/00-index.md](docs/research/00-index.md)** — competitor analyses. Read when making competitive or architectural claims.

## Working rules

- Never invent architecture mid-task. If the task needs an architectural change, write an ADR first.
- Every completed task updates the relevant memory docs (roadmap status, decision log, known issues) **in the same commit**.
- Motion-language rules are cited by ID (`MO-DUR-1`), never restated.
- Adversarial review before merge; benchmarks must not regress (see standards).
- Quality bar applies to everything: docs, prompts, code, and videos alike. No slop.
