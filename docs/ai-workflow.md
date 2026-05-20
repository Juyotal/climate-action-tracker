# AI Workflow Write-up

*How Claude was used to **build** this app (runtime AI usage is in the README). A fuller phase-by-phase breakdown is in `AI_WORKFLOW_DETAILED.md`.*

## Tools & workflow

**Claude Code** with an **orchestrator / subagent** split: **Claude Opus 4.7** as the orchestrator (planning, decisions, verification) and **Claude Sonnet 4.6** for execution subagents (scaffolding, routes, UI). Opus handled judgment; Sonnet handled file-writing — Sonnet is faster and cheaper for "write N files against a clear spec," Opus is better where pushback matters.

The loop per phase: **grill** (interview me on each load-bearing decision before any code), **plan** (decisions land in `CLAUDE.md`, the shared context every subagent reads), **spawn** (delegate the phase to a fresh Sonnet subagent with a focused prompt and a manual-test gate), **verify** (inspect the actual diff / live state, not the agent's summary), **decide** (surface deviations to me before proceeding). `CLAUDE.md` held the cross-cutting context — schema, route ownership, the on-track formula, conventions — so subagent prompts stayed phase-specific and decisions never drifted between phases.

## One moment where AI saved significant time

The orchestrated flow scaffolded, built, and manually verified the whole app — Next.js + Prisma + Docker + Auth + the Claude extraction pipeline + dashboard — in roughly the time it would have taken me to hand-wire just the boilerplate from docs. The grill-first pass mattered most: no subagent ever had to guess at auth strategy, URL shape, or the on-track formula, because those were decided with rationale before code existed. That alone saved an hour of mid-build refactoring.

## One moment where I corrected the AI

In the extraction phase, the first implementation hand-rolled a JSON schema for the Claude call — defining the expected fields inline rather than deriving them from the Zod schema that already governed the action model. Two definitions of the same shape is a drift risk. I caught it in the post-phase diff review and had it derived from the single Zod source of truth instead.

Beyond that, code-level corrections were rare, and I think that's the more useful signal: most ambiguity was resolved *before* a subagent ran. The remaining friction was process-level — e.g. I overrode the orchestrator's initial parallel-phase plan for sequential execution to cut integration risk, and a wrong on-track verdict on one seed city turned out to be **my** seed numbers not mathing out, which the agent had implemented faithfully (caught via a live DB check, fixed by adjusting one value).

## How I structured the session

Context up front (the brief and sample JSON pinned), decisions locked before coding (stack, IDs, sectors/statuses as enums, error shape), and four behavioral rules pinned into every subagent via `CLAUDE.md` — *Think Before Coding, Simplicity First, Surgical Changes, Goal-Driven Execution* — which kept diffs proportional to the request and stopped agents over-engineering. Each phase ended with a concrete manual test (curl / build / live SQL) run before it was marked complete; that gate, not the agent's "looks done," was the verdict. I deliberately chose **manual verification over an automated suite**: in a 4-hour timebox I judged per-phase manual gates a better use of time than test infrastructure for a single-author demo — though automated tests would be the first thing I'd add for anything beyond this exercise.

## Scope discipline & what I'd do next

I held the core (CRUD, free-text extraction, dashboard, on-track indicator) tightly to fit the budget and treated extras as "only if buffer remains." With buffer left I added auth, multi-city, and the projection chart; I noted but did not build further. **What I'd add next, in priority order:** (1) push DB-truth verification earlier — a 30-second SQL check per data-touching phase, since the one wrong verdict surfaced late; (2) an eval set for the extractor so prompt/model changes have a regression signal rather than vibes; (3) a `confidence` field on extractions so the UI can flag low-confidence drafts for careful review; (4) **a prescriptive step — using the LLM to suggest gap-closing actions for off-track cities, not just extract existing ones.** Knowing when to stop mattered as much as knowing what to build: for a small mission-driven team, a focused, in-budget submission is the more honest signal than an over-scoped one.