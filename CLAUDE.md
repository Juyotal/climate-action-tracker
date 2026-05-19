# City Climate Action Tracker — Build Plan & Subagent Guide

This file is the single source of truth for subagents working on this project. Read it fully before starting any phase. The orchestrator's prompt to you will be terse — **the context is here**.

---

## 1. Project context

**What this is:** A 4-hour take-home for an AI-Native Software Engineer role at Open Earth Foundation. A small web app where a city admin tracks climate actions and a public viewer sees a dashboard.

**What's being evaluated:** Working code, clean structure, AI integration quality, and a short AI workflow write-up. Not: enterprise patterns, exhaustive tests, production polish.

**Time budget:** 4 hours total across all phases. Stay surgical.

---

## 2. Stack (locked)

- **Framework:** Next.js 15 (App Router) + TypeScript, `src/` directory, `@/*` import alias
- **Styling:** Tailwind CSS + shadcn/ui (components: button, input, textarea, card, table, select, badge, label, dialog, sonner, tabs)
- **DB:** PostgreSQL 16 via Docker Compose
- **ORM:** Prisma with `migrate dev` (real migration files committed)
- **Validation:** Zod, with `zod-to-json-schema` to derive the Anthropic tool input schema from the same Zod schema (single source of truth)
- **LLM:** `@anthropic-ai/sdk`, model `claude-sonnet-4-6`, **tool use** for structured extraction
- **Containerization:** Full — multi-stage Dockerfile + docker-compose.yml runs both Next.js and Postgres
- **No charts:** Tailwind `<div>` bars only (Recharts deferred)
- **No automated tests:** manual QA only

---

## 3. Domain model

### City
- `id` (Int, autoincrement)
- `name` (String)
- `baseline_tons` (Int) — annual CO2 emissions baseline
- `baseline_year` (Int) — start year of the trajectory
- `target_year` (Int) — net-zero target year

### ClimateAction
- `id` (Int, autoincrement)
- `cityId` (Int, FK → City)
- `title` (String)
- `sector` (enum: `transport | energy | buildings | waste | land_use`)
- `status` (enum: `planned | in_progress | completed`)
- `annual_reduction` (Int) — tons CO2/year
- `start_year` (Int)
- `source` (enum: `manual | ai`)
- `confidence` (Float, nullable) — self-reported by Claude for AI-extracted actions
- `createdAt` (DateTime)

### Display ↔ storage mapping
- `land_use` stored, "Land use" displayed
- `in_progress` stored, "In progress" displayed
- Status pills: planned (gray), in_progress (blue), completed (green)
- Sector pills: neutral background

---

## 4. On-track formula (dashboard)

```
required_annual = baseline_tons / (target_year - baseline_year)
expected_now    = required_annual × (current_year - baseline_year)
achieved        = sum(annual_reduction) where status ∈ {in_progress, completed}
                                          AND start_year ≤ current_year
on_track        = achieved ≥ expected_now   → green
                  otherwise                  → red
```

**Always show the raw numbers next to the indicator** (achieved vs expected_now). The indicator is not a black box.

---

## 5. Routes & ownership

| Route | Owner phase | Notes |
|---|---|---|
| `/` | P1 | Server-rendered homepage showing seeded city name + action count — proves the stack works end-to-end. |
| `/admin` | P3 | Tab nav (Actions \| Import from text). City config card + actions table + Add/Edit Dialog. |
| `/admin/import` | P3 | Textarea + Extract button → editable review table → Save selected. |
| `/public` | P4 | Dashboard (totals, sector bars, on-track) + actions list. |
| `/api/v1/cities/[id]` | P2 | GET, PUT |
| `/api/v1/actions` | P2 | GET (list, optional `?cityId=`), POST |
| `/api/v1/actions/[id]` | P2 | PUT, DELETE |
| `/api/v1/actions/bulk` | P2 | POST — array of actions, used by Save selected after extraction |
| `/api/v1/actions/extract` | P2 | POST `{text, cityId}` → `{extracted: Action[], skipped: {reason, raw}[]}` |

### Shared component ownership (parallel phase coordination)

**Phase 3 owns and creates** (Phase 4 consumes read-only):
- `src/components/Header.tsx` — title + role toggle (localStorage `role` key, values `admin`/`public`)
- `src/components/RoleToggle.tsx` — the Public/Admin pill toggle
- `src/lib/api.ts` — fetch wrappers for the API routes
- `src/app/layout.tsx` — root layout with the Header

If Phase 4 runs before Phase 3 has committed those files, Phase 4 should **stub** the Header inline in `/public` and leave a `TODO: replace with shared Header` comment. Do not create the shared file from Phase 4.

---

## 6. AI extraction contract

**Endpoint:** `POST /api/v1/actions/extract`

**Request:** `{ text: string, cityId: number }`

**Validation:** reject `text.length < 20` with 400.

**Anthropic call:**
- Model: `claude-sonnet-4-6`
- Tool: `extract_climate_actions` with `input_schema` derived from a Zod schema via `zod-to-json-schema`. Required fields per action: `title`, `sector`, `status`, `annual_reduction`, `start_year`, `confidence` (0–1).
- 30s hard timeout. No retries.

**Response shape:**
```ts
{
  extracted: ClimateAction[],   // validated through Zod, NOT yet persisted
  skipped:   { reason: string, raw: unknown }[],
  stopReason?: string,          // surfaced only when NODE_ENV !== 'production'
}
```

**Behavior:**
- Parse the `tool_use` block; ignore everything else.
- Run each extracted action through the Zod schema. If validation fails, push to `skipped[]` (don't throw).
- `confidence` is what Claude returns — don't fabricate it elsewhere.
- All extracted actions get `source: "ai"` when saved (the bulk endpoint sets this, not the model).

---

## 7. Manual testable feature per phase

Each phase ends with a feature a human can interact with. Do not mark a phase complete until you've verified its test manually.

| Phase | Test to run |
|---|---|
| P1 | `docker compose up -d` brings DB up; `npm run dev` serves `/` showing "Greenville" + "6 actions" (or whatever the seed contains) rendered server-side via Prisma. |
| P2 | `curl localhost:3000/api/v1/cities/1` returns the seeded city. `curl -X POST localhost:3000/api/v1/actions/extract -d '{"text": "We will electrify 50 buses by 2027 (saves ~8000 t/yr).", "cityId": 1}'` returns structured actions. Document every curl in `docs/api-curl.md`. |
| P3 | Open `/admin`. Edit city config and save. Add an action manually. Edit it. Delete it. Switch to Import tab, paste sample text, click Extract, see review rows, save them. Confirm rows appear in Actions tab with `source = ai`. |
| P4 | Open `/public`. See totals, sector breakdown bars, on-track indicator with numbers. Toggle to Admin role from header → land on `/admin`. |
| P5 | Fresh clone, follow README, app boots in ≤3 commands. AI write-up reads in ≤2 minutes. |

---

## 8. Phase status

Update this section at the **end of your phase** (last commit). Keep it short.

- [x] **P1 Foundation** — *complete*
- [x] **P2 Backend** — *complete*
- [ ] **P3 Admin UI** — *not started* (blocked by P2)
- [ ] **P4 Public dashboard** — *not started* (blocked by P2)
- [ ] **P5 Docs + QA** — *not started* (blocked by P3, P4)

---

## 9. Git workflow

- A git repo is already initialized on `main`.
- Commit at the **end of your phase**. One commit per phase is fine; multiple small commits are also fine.
- Commit message format: `P{N}: <short summary>` (e.g., `P1: scaffold Next.js + Prisma + Docker`).
- Don't push — the user will push at the end.
- **Never commit `.env`.** Ensure `.gitignore` excludes it.

---

## 10. Environment variables

`.env.example` (committed):
```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/climate?schema=public"
ANTHROPIC_API_KEY=""
```

`.env` (gitignored) — values for local dev. The orchestrator will populate `ANTHROPIC_API_KEY` before Phase 2.

When running inside the Next.js Docker container, `DATABASE_URL` must point to `postgres` (the compose service name), not `localhost`. Handle this with a separate env in compose or document the override.

---

## 11. Seed data

Use this exact JSON (provided by the user). Note: `baselineYear` is **not** in the source data — use `2020` and document the choice in the seed file.

```json
{
  "city": "Greenville",
  "baselineEmissions": 500000,
  "targetYear": 2035,
  "actions": [
    { "title": "Expand bike lane network", "sector": "transport", "annualReduction": 12000, "status": "in progress", "startYear": 2024 },
    { "title": "Solar panel incentive program", "sector": "energy", "annualReduction": 45000, "status": "in progress", "startYear": 2023 },
    { "title": "Municipal building retrofits", "sector": "buildings", "annualReduction": 18000, "status": "planned", "startYear": 2026 },
    { "title": "Organic waste composting program", "sector": "waste", "annualReduction": 8000, "status": "completed", "startYear": 2022 },
    { "title": "Urban reforestation initiative", "sector": "land use", "annualReduction": 15000, "status": "planned", "startYear": 2025 },
    { "title": "EV fleet transition for public transit", "sector": "transport", "annualReduction": 30000, "status": "planned", "startYear": 2026 }
  ]
}
```

Normalize on insert:
- `"in progress"` → `in_progress`
- `"land use"` → `land_use`
- All seeded actions: `source: "manual"`, `confidence: null`

Seed must be **idempotent** (use `upsert` on a stable key, or wipe-and-reinsert when run repeatedly).

---

## 12. Behavioral guidelines (apply to every phase)

### Think before coding
Don't assume. Don't hide confusion. Surface tradeoffs.

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### Simplicity first
Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### Surgical changes
Touch only what you must. Clean up only your own mess.

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, **mention it — don't delete it.**
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

Every changed line should trace directly to the user's request.

### Goal-driven execution
Define success criteria. Loop until verified.

- Transform tasks into verifiable goals: "Add validation" → "Reject invalid inputs at the API boundary, verify with one curl per failure mode."
- Before starting a multi-step phase, state your plan as numbered steps with a verify check per step.
- Don't mark a phase complete until you've manually run the test in §7.

---

## 13. What's deferred (do not implement)

These are documented as out-of-scope in the README — don't add them on your own initiative:

- Real auth (NextAuth, sessions). Header toggle only.
- Multi-city UI. Schema supports it; UI assumes city #1.
- Recharts / any chart library.
- Pagination, search, sorting on the actions table.
- Action history / audit log.
- Automated test suite.
- Streaming AI extraction.
- Retry logic on Claude failures.
