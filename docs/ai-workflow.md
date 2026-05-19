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
2. Plan — Decisions land in CLAUDE.md, which becomes the single source of truth.
3. Spawn — Opus delegates each phase to a fresh Sonnet subagent with a terse prompt
           ("Read CLAUDE.md. Execute Phase N. Report.") — context lives in the file, not the prompt.
4. Verify — Opus inspects what's on disk (git log, file tree, live curl), not just the agent's report.
5. Decide — Opus surfaces deviations to the user and asks before proceeding.
6. Repeat.
```

Phases were sequential, not parallel — earlier in planning we considered running Admin UI and Public Dashboard in parallel agents (they touch disjoint files), but reverted to sequential at the user's request. The cost of parallelism is coordinating shared components; the benefit (~30 min saved) wasn't worth the integration risk for a take-home.

Why a `CLAUDE.md` file and not bigger agent prompts:
- Each Sonnet subagent starts cold and has to be told everything. Putting the plan in `CLAUDE.md` means the orchestrator's prompt is two sentences ("Read CLAUDE.md. Execute Phase N."), the agent reads canonical context, and the cost of re-deriving decisions is zero.
- When deviations or scope changes happen (we added auth + multi-city as a Phase 6 *after* finishing the 4hr scope), the updates land in one file. Subsequent agents inherit the new world automatically.

---

## One moment where Claude saved significant time

**The Zod schema → Claude tool input schema → server-side validator pipeline.**

The AI extraction endpoint (`/api/v1/actions/extract`) needs three things to agree:
1. The schema Claude's tool definition declares for its output
2. The schema the server uses to validate what Claude actually returned
3. The TypeScript types the rest of the app consumes

The naive version is three separate definitions that quietly drift apart. The clean version is one Zod schema, and you derive everything else from it. Setting that up by hand — reading the Anthropic SDK's `Tool.input_schema` type, getting the JSON-Schema shape right, wiring the runtime check — would have been 30–45 min of fiddly work.

With Claude, the entire pipeline landed in **Phase 2** in one shot:

```ts
// src/lib/schemas.ts — Zod is the source of truth
export const AIExtractedActionSchema = z.object({ ... });
export const AIExtractToolInputSchema = z.object({
  actions: z.array(AIExtractedActionSchema),
});

// src/app/api/v1/actions/extract/route.ts
const TOOL_INPUT_SCHEMA = z.toJSONSchema(AIExtractToolInputSchema)
  as Anthropic.Tool["input_schema"];

// ...later, validating Claude's response:
const result = AIExtractedActionSchema.safeParse(item);
if (!result.success) skipped.push({ reason: ..., raw: item });
```

The first agent attempt got this slightly wrong — it used `zod-to-json-schema@3` which doesn't speak Zod v4 and silently returns `{}`. The pivot to Zod v4's built-in `z.toJSONSchema()` was a 3-line edit. Net effort: ~5 minutes for a pipeline I'd have spent the better part of an hour writing manually.

---

## One moment where I corrected/overrode Claude

**The parallel-phase spawn.**

After grilling, Opus produced a phased plan and proposed running Phase 3 (Admin UI) and Phase 4 (Public Dashboard) in parallel agents, with explicit shared-component ownership documented in CLAUDE.md. It seemed efficient — different files, different routes, ~30 min of wall-clock savings.

The user pushed back: *"You can leave out the parallel approach."*

That correction was right. In hindsight:
- Two parallel agents both producing UI work would have created a fragile intermediate state where one merged before the other.
- The "shared ownership" carve-out (Phase 3 owns Header/RoleToggle, Phase 4 consumes) was a coordination overhead that only paid off if both finished cleanly. If either failed I'd have to redo the merge.
- For a take-home where verification cost is high per phase, sequential is honestly safer.

Opus also jumped the gun and marked Phase 1 in-progress and queued a subagent spawn **before** the user had approved. The user caught that too:
> *"you did not get my approval"*

That second correction reinforced the rule that ended up in CLAUDE.md: **never spawn without explicit go-ahead, no matter the stage.** Every subsequent phase waited for an explicit approval before launching the agent.

---

## Hiccups encountered

Real friction points, in chronological order:

| When | What happened | How it was handled |
|---|---|---|
| **P1** | `create-next-app` installed **Next.js 16**, not 15 as planned | Accepted — same App Router, no code impact. Documented in README. |
| **P1** | Installed Prisma 7 (latest), which moved `datasource.url` out of `schema.prisma` into a new `prisma/config.ts` file. Every CLI command now needs `--config prisma/config.ts` | Accepted; every subsequent agent prompt explicitly reminded them of the flag. |
| **P1** | Port 5432 conflict with user's pre-existing `oef-db-1` container | Remapped compose to `5433:5432`. README documents it. |
| **P1** | shadcn auto-selected its `base-nova` style for Tailwind v4 instead of the older default | Cosmetic only, accepted. |
| **P2** | `zod-to-json-schema@3.25.2` returns `{}` when fed Zod v4 schemas — the agent's first cut hand-wrote the JSON schema as a workaround | Spotted in review. Replaced with Zod v4's built-in `z.toJSONSchema()` — 3-line fix that restored the single-source-of-truth narrative. |
| **P2** | `ANTHROPIC_API_KEY=""` in the shell silently overrode `.env` | Added the `set -a && source .env && set +a` recipe to README. |
| **P3** | Agent fixed a pre-existing Prisma 7 type error (`earlyAccess: true` removed from `PrismaConfig`) as a prerequisite | Reviewed and approved — legitimate cleanup, not scope creep. |
| **P3** | Admin pages used an SSR-via-API pattern that needed `NEXT_PUBLIC_BASE_URL` | Added a default to `.env.example` and the compose file before P4 began. |
| **P6** | Next.js 16 silently ignores `middleware.ts` when using `src/` layout — the file is now `src/proxy.ts` with `export const proxy = auth(...)` | Agent discovered it the hard way (middleware not running), pivoted, documented in both CLAUDE.md and README. |
| **P6** | Seeded Lakewood with numbers that produced "off-track" instead of the "on-track" demo signal promised in the plan | Caught by querying the live DB directly post-spawn. Bumped one action (rooftop solar 60k → 125k); city now correctly lands on-track at 220,000 vs 213,333 expected. |
| **P6** | Stale row at `City.id = 2` from a pre-unique-constraint test run meant new cities seeded at ids 3 and 4 instead of 2 and 3 | Cosmetic, left alone — fixing would require `migrate reset` and losing any click-through test data. |
| **P6** | Two compose project names (`climate-action-tracker` vs `climateactiontracker`) created two parallel Postgres containers | Removed the orphan, kept the one with data. README documents the canonical name. |

The pattern: every hiccup was caught either by an agent self-reporting it, by Opus diffing the agent's report against on-disk reality, or by the user catching a process-level mistake. None of them silently survived.

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

The two things that made this work without trainwrecks:

1. **The grill-first habit.** Every decision that would have been a silent assumption (auth model, multi-city URL shape, on-track formula, scope cuts) was surfaced as a question with an option list and a recommendation. The user got veto power without having to ask for it; the orchestrator never made an architecture decision in private.
2. **CLAUDE.md as the source of truth.** Sonnet subagents got 2-sentence prompts; everything they needed lived in the file. When scope expanded mid-session (P6), the update was one commit and every later agent inherited it. No subagent prompt re-derived a decision the project had already made.

What I'd do differently next time:

- **Trust the agent's "I hit a real blocker, stopping" reports faster.** The two correction moments (Lakewood off-track miscalibration, hand-rolled JSON schema in P2) were both caught in post-spawn review, not by the agent itself. CLAUDE.md §12 ("State your assumptions explicitly, push back when warranted") is the right rule; the agents could be encouraged to *use* it more.
- **Verify against the live DB earlier.** The Lakewood "should be on-track but isn't" took until the end of P6 to surface because we trusted curl-output summaries through P4. A 30-second SQL check per phase would have caught it sooner.
