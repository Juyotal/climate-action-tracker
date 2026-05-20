# AI workflow — how this app was built

This document is *not* about how the app uses Claude at runtime (that's covered in the README's "Key design choices" section). It's about how Claude was used to *build* the app.

---

## Tool

- **Claude Code** (Anthropic's CLI) running on:
  - **Claude Opus 4.7** as the orchestrator (planning, grilling, verifying, writing this doc inline)
  - **Claude Sonnet 4.6** for every execution subagent (scaffolding, writing routes, building UIs)

Opus did all of the user-facing dialogue and architectural decision-making. Sonnet did all of the file-writing. The split exists because Sonnet is meaningfully faster and cheaper for "write 30 files following a clear spec," while Opus is better at the parts where pushback and judgment matter.

---

## Session structure

The session followed a tight loop:

```
1. Grill — Opus interviews the user on each load-bearing decision before any code is written.
2. Plan — Decisions land in CLAUDE.md, which becomes shared project context for every subagent.
3. Spawn — Opus delegates each phase to a fresh Sonnet subagent with a focused, per-phase prompt
           (deliverables list, rules, manual test criteria, report-back format).
4. Verify — Opus inspects what's on disk (git log, file tree, live curl), not just the agent's report.
5. Decide — Opus surfaces deviations to the user and asks before proceeding.
6. Repeat.
```

Phases were sequential, not parallel — earlier in planning we considered running Admin UI and Public Dashboard in parallel agents (they touch disjoint files), but reverted to sequential at the user's request. The cost of parallelism is coordinating shared components; the benefit (~30 min saved) wasn't worth the integration risk for a take-home.

The role `CLAUDE.md` actually played — and how it interacts with the per-phase prompts:

- Each Sonnet subagent starts cold; it has to be told everything that's not derivable from the codebase. The naive approach is to paste the full project context (~250 lines: schema, on-track formula, route ownership, env vars, seed data, behavioral guidelines, deferred features) into every spawn prompt. That works but it's wasteful and repetitive.
- `CLAUDE.md` extracts the **cross-cutting context** that's true for every phase. Each spawn prompt then opens with "First, read `CLAUDE.md`" and focuses the rest of the prompt on **phase-specific** content: the deliverables list, file paths to touch, inherited context from previous phases (e.g., "Prisma 7 requires `--config prisma/config.ts`"), the manual test for *this* phase, and a structured report-back format.
- The per-phase prompts were still substantial — typically a few hundred words each, with a numbered deliverables list and explicit rules. CLAUDE.md didn't shrink the prompts to a sentence; it kept them **focused** on what was unique to each phase instead of re-stating shared concepts.
- When scope expanded mid-session (auth + multi-city as Phase 6, projection chart as Phase 7), the updates landed in `CLAUDE.md` once. Subsequent agents inherited the new world automatically without me having to remember which past prompt had the now-stale version of the route table.

---

## One moment where Claude saved significant time

**The honest answer: the whole project, end-to-end.**

If I had to pick a single moment, it would feel artificial — because the real time-saver wasn't one feature; it was that Claude scaffolded, built, manually-tested, and iterated on the entire app in roughly the time it would have taken me to *just* set up Next.js + Prisma + Docker + Auth.js by hand from the docs.

### What I prompted

The session started with a one-shot orchestrator brief: "You are the orchestrator for a 4-hour take-home. Stack is Next.js + TS + Postgres + Prisma + Docker + Tailwind/shadcn + Anthropic Claude API. Two roles, CRUD climate actions, free-text → structured extraction, dashboard with on-track indicator. Plan in phases, grill me on architectural decisions, delegate each phase to a subagent, verify each one, never spawn without my approval." That brief did *not* contain a single line of code or even a file structure.

From that, the session produced:
- A 10-question grilling pass that surfaced every load-bearing decision (auth, multi-city, AI tool-use approach, on-track formula, scope cuts, Docker scope) and let me pick from recommended options.
- A `CLAUDE.md` plan file (~300 lines) capturing every decision so subagents could execute without re-deriving them.
- Seven phased subagents (Foundation → Backend → Admin UI → Public dashboard → Auth + multi-city → Docs → Projection chart) — each with deliverables, manual test criteria, and structured report-back.
- A working app: 16 commits, ~40 source files, 3 Prisma migrations, NextAuth credentials, JWT sessions, bcrypt-hashed admin, multi-city path-based routing, AI extraction via Claude tool-use with confidence scores, full dashboard with Recharts projection trajectory, README, AI write-up, API docs.
- Per-phase manual verification — every phase had a concrete "do this, verify that" test, run before marking complete.
- Iteration when reality diverged from plan: Lakewood's seed numbers produced the wrong on-track verdict → caught via live DB query → bumped one action's value → reseeded → re-verified.

### What Claude generated

Roughly **~94 minutes of agent execution time** produced what would have been a 2–3 day solo build — including manual QA passes inside each phase. The breakdown:

- Code: Next.js routes, Prisma schema + migrations + seed, NextAuth wiring, Zod schemas, dashboard math, Recharts component, API curl docs, README.
- Process: a `CLAUDE.md` build plan, a behavioral-guidelines section pinned into every agent's context, structured report-backs that surfaced every deviation before it could compound.
- Verification: every phase ended with curl-or-build evidence before moving on.

### Why it was good

Three reasons:

1. **The grilling pass forced architectural clarity upfront.** No subagent ever had to guess about auth strategy, URL shape, or the on-track formula — those were decided, with rationale, before code was written. That alone probably saved an hour of mid-build refactoring.
2. **`CLAUDE.md` as shared context meant subagents didn't reinvent decisions.** When Phase 6 added multi-city routing, every later agent (and even the orchestrator's own verification) read the same source of truth. No drift between what was planned and what was implemented.
3. **Manual-test gates per phase caught issues before they compounded.** Lakewood's seeded data produced "off-track" instead of the promised "on-track" — but I caught it because Phase 6's manual test included a live DB SQL check. Without that gate, the README would have shipped with a contradiction between its claimed demo state and reality.

The end-to-end time savings dwarfed any single clever helper. The whole project was the moment.

---

## One moment where I corrected/overrode Claude

The clearest code-level correction was in **Phase 2**. The extraction 
endpoint's first implementation hand-rolled a JSON schema for the Claude 
tool-use call — defining the expected fields inline rather than deriving 
them from the Zod schema that already governed the Action model. That's a 
drift risk: two definitions of the same shape that can fall out of sync. 
I caught it in the post-phase diff review, flagged it, and had the schema 
derived from the single Zod source of truth instead. One definition, not two.

That said, substantive code-level corrections were rare — and I think that's 
the more interesting story. The context engineering up front (grill-first, 
CLAUDE.md as shared truth, per-phase manual-test gates) meant most ambiguity 
was resolved *before* a subagent ran, not after. The remaining friction was 
mostly process-level:

- I reminded the orchestrator that subagent spawns need explicit approval 
  per-scope, not once per session.
- I overrode the initial parallel-phase plan in favor of sequential — a 
  coordination call to reduce integration risk, not a code fix.
- The Lakewood "off-track when it should be on-track" issue was a miss in 
  *my* seed numbers (CLAUDE.md §11), which the agent implemented faithfully. 
  Caught via a live SQL check, fixed by bumping one action's value.

The pattern: when the input was unambiguous, the output was correct. The 
corrections that mattered were about *what I asked for*, not *how it executed*.

---

## Time tracking

Wall-clock from session start to this document. Commit-stamp-derived where possible.

| Phase | Wall clock | Notes |
|---|---|---|
| **Planning + grilling** | ~28 min | 10-question grill, schema decisions, scope cut, CLAUDE.md authored |
| **P1 Foundation** | ~22 min | Scaffold, Docker, Prisma, seed, port remap |
| **P2 Backend + AI extraction** | ~20 min | All API routes, Claude tool-use, schema-derivation fix |
| **P3 Admin UI** | ~13 min | /admin, /admin/import, Add/Edit dialog, env var addition |
| **P4 Public dashboard** | ~7 min | /public dashboard, sector bars, on-track math verified |
| **P6 Auth + multi-city** | ~56 min | Re-grill (8 min) + plan (10 min) + execute (34 min) + Lakewood fix (4 min) |
| **P5 Docs + QA (this phase)** | ~15 min | README, this write-up, final manual verification |

**Total: ~2h 41min** from the first grilling question to this paragraph.

Of that, the actual "Claude is writing code" time (subagent durations) was:

| Phase | Agent runtime |
|---|---|
| P1 Foundation | 17.0 min |
| P2 Backend | 15.2 min |
| P3 Admin UI | 10.4 min |
| P4 Public dashboard | 6.4 min |
| P6 Auth + multi-city | 33.9 min |
| **Total agent time** | **~82.9 min** |

The remaining ~78 minutes was grilling, reviewing, deviating, deciding, committing fixes inline, and writing this doc. Roughly a **50/50 split between Claude executing and human-in-the-loop direction** — which feels about right for a project where architecture matters more than typing speed.

---

## Reflection

The three things that made this work without trainwrecks:

1. **The grill-first habit.** Every decision that would have been a silent assumption (auth model, multi-city URL shape, on-track formula, scope cuts) was surfaced as a question with an option list and a recommendation. The user got veto power without having to ask for it; the orchestrator never made an architecture decision in private.
2. **CLAUDE.md as shared context.** Subagent prompts were per-phase and substantial — but they didn't have to re-state the schema, route ownership, behavioral rules, or env conventions every time. Those lived in CLAUDE.md, and each prompt opened with "First, read CLAUDE.md." When scope expanded mid-session (P6, P7), the update was one commit and every later agent inherited it. No subagent prompt re-derived a decision the project had already made.
3. **The behavioral guidelines pinned into every subagent's context.** `CLAUDE.md §12` codified four rules — *Think Before Coding*, *Simplicity First*, *Surgical Changes*, *Goal-Driven Execution* — that each subagent read before touching code. Concretely:
   - **Think Before Coding** told agents to surface assumptions and ask if uncertain, instead of guessing. The payoff: clarifying questions arrived *before* implementation, not after mistakes had to be reverted.
   - **Simplicity First** told agents to write the minimum code that solves the problem, no abstractions for single-use code, no flexibility that wasn't requested. The payoff: fewer rewrites due to overcomplication — when I reviewed each phase's diff, almost every line traced directly to a deliverable; there was no "while I was in there I refactored X" sprawl.
   - **Surgical Changes** told agents to touch only what they must, match existing style, and *mention* unrelated dead code rather than delete it. The payoff: fewer unnecessary changes in diffs — when an agent did legitimately need to fix something pre-existing (e.g., the `earlyAccess: true` Prisma 7 type error in P3), it was flagged in the report rather than silently bundled in.
   - **Goal-Driven Execution** told agents to transform tasks into verifiable goals and not mark a phase complete until the manual test passed. The payoff: phase boundaries actually meant something — each one ended with curl/build/SQL evidence, so the orchestrator's review had something concrete to check against rather than a "looks done to me" summary.
   
   These four rules were short — a few bullets each — but they shifted agent behavior measurably. Without them, the default failure mode of a fresh coding agent is to over-engineer, add error handling for impossible cases, and "improve" adjacent code. With them, the diffs stayed proportional to the request.

What I'd do differently next time:

- **Trust the agent's "I hit a real blocker, stopping" reports faster.** The two correction moments (Lakewood off-track miscalibration, hand-rolled JSON schema in P2) were both caught in post-spawn review, not by the agent itself. CLAUDE.md §12 ("State your assumptions explicitly, push back when warranted") is the right rule; the agents could be encouraged to *use* it more.
- **Verify against the live DB earlier.** The Lakewood "should be on-track but isn't" took until the end of P6 to surface because we trusted curl-output summaries through P4. A 30-second SQL check per phase would have caught it sooner.

---

## Addendum — Phase 7: buffer-time bonus

After Phase 5 closed out the take-home properly (README, write-up, manual QA), there was buffer time left. I'd cut **Recharts** in the original scoping (§7 grilling, "Cut Recharts, keep everything else — Tailwind bars instead"). The trade-off then was honest: a 4hr budget and Recharts wiring is ~30 min for the headline visual benefit but the project lives or dies on the AI extraction story, not the chart polish.

With time left over, I added it back as **Phase 7** — a single focused subagent spawn, "go wild within reason," no grilling needed because the requirements were now obvious from the rest of the app.

### What changed

- Recharts moved from §13 (Deferred) to §2 (Stack) in CLAUDE.md.
- New helper `computeProjection(city, actions)` in `lib/dashboard.ts` produces an array of `{ year, required, projected, current? }` rows from `baseline_year` through `target_year + 2`. Required is a linear path from baseline → 0; projected is `baseline_tons` minus cumulative reductions of every action that has started by that year.
- New client component `ProjectionChart.tsx` renders two lines (required dashed gray, projected solid green-or-red), a current-year dot, reference lines at `y=0` and `x=target_year`, a gradient fill under the projected line, tooltip + legend, and a "Net zero by YYYY" annotation.
- Wired into the public dashboard between summary cards and sector bars.

### One genuinely interesting outcome

All three seeded cities render the projected line **red**, including Lakewood — which is *also* green on the on-track indicator. That looks like a contradiction; it isn't. The two signals answer different questions:

| Signal | Question | Lakewood verdict |
|---|---|---|
| On-track indicator (P4) | Are you pacing correctly *right now*? (achieved by current year vs expected by current year) | 🟢 Yes — 220k vs 213k expected |
| Projection chart (P7) | Do your action portfolio's total reductions reach the full baseline by target year? | 🔴 No — 220k cumulative vs 320k baseline → 100k residual |

I left this in deliberately. A real city planner staring at a "we're on pace but our committed actions don't sum to net-zero" dashboard learns something more useful than one where both indicators agree by construction. The seed numbers could be tuned to make Lakewood green on both — but the more honest dashboard is the one that tells the city "you're pacing well, *and* your portfolio still has a 100k/yr gap."

### Time for Phase 7

| | Time |
|---|---|
| P7 agent runtime | ~11 min |
| Orchestration (prompt + verify + this addendum) | ~10 min |
| **Wall-clock for P7** | **~21 min** (commits at 22:22 → 22:34, with a small user-side README edit in between) |

### Updated totals (across the whole session)

| Bucket | Time |
|---|---|
| Cumulative agent runtime (P1–P7) | **~94 min** |
| Orchestration, grilling, review, fixes, writing | **~106 min** |
| **Total session wall-clock from first grilling question to here** | **~3h 20min** |

The split is now closer to 47% agent / 53% human direction — meaning even the "go wild" bonus phase kept the same rhythm: Claude executes fast, but architectural decisions and verification still need a person actively holding the wheel.

*(Btw — the next day, outside the allocated 4hrs, I came back to polish this AI workflow write-up and to containerise the full app (multi-stage Dockerfile + docker-compose for both Next.js and Postgres) so the whole thing boots in a single `docker compose up`. Neither was part of the take-home time budget.)*
