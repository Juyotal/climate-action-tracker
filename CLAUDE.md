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

### User (added in P6)
- `id` (Int, autoincrement)
- `email` (String, unique)
- `password_hash` (String) — bcryptjs hash, never returned to client
- `role` (enum `Role`: `admin | viewer`)
- `createdAt` (DateTime)

The `viewer` role exists for forward compatibility; current behavior is identical to anonymous (all `/public/**` is open). Only `admin` unlocks `/admin/**` routes and mutating API calls.

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

**Path-based multi-city** (introduced in P6). Top-level `/public` and `/admin` show city pickers; per-city views live under `/public/cities/[cityId]` and `/admin/cities/[cityId]`.

| Route | Owner | Notes |
|---|---|---|
| `/` | P1 → P6 | Landing page. Links to `/public` and (if logged-in admin) `/admin`. |
| `/login` | P6 | Server shell + client form. POSTs to `signIn('credentials')`. Redirects to `/admin` on success. |
| `/admin` | P3 → P6 | **City list** for admins (cards). Gated by middleware → `/login` if anonymous. |
| `/admin/cities/[cityId]` | P3 → P6 | Tab nav (Actions \| Import). City config + actions table. (Was `/admin` in P3.) |
| `/admin/cities/[cityId]/import` | P3 → P6 | Textarea + Extract + review table. (Was `/admin/import` in P3.) |
| `/public` | P4 → P6 | **City list** for anonymous + viewer (cards). Open to all. |
| `/public/cities/[cityId]` | P4 → P6 | Dashboard (totals, sector bars, on-track) + actions list. (Was `/public` in P4.) |
| `/api/auth/[...nextauth]` | P6 | NextAuth handler (Credentials provider, JWT sessions). |
| `/api/v1/cities` | P6 | GET (list all cities). |
| `/api/v1/cities/[id]` | P2 | GET (open), PUT (admin only). |
| `/api/v1/actions` | P2 | GET (open, `?cityId=`), POST (admin only). |
| `/api/v1/actions/[id]` | P2 | PUT, DELETE (admin only). |
| `/api/v1/actions/bulk` | P2 | POST (admin only). |
| `/api/v1/actions/extract` | P2 | POST (admin only). |

### Header behavior (after P6)
- **Anonymous:** site title + "Log in" link.
- **Logged-in viewer:** site title + user email + Logout. No Public/Admin toggle.
- **Logged-in admin:** site title + Public/Admin pill toggle + user email + Logout.
  - Toggle navigates between the current city's admin and public views when on a city-scoped route (e.g., `/admin/cities/2` → `/public/cities/2`).
  - On top-level `/admin` or `/public`, toggle navigates to the sibling top-level page.

### Component ownership
The shared components (`Header.tsx`, `RoleToggle.tsx`, `src/lib/api.ts`, `src/app/layout.tsx`) created in P3 are **rewritten** in P6 to be session-aware. Old localStorage `role` flag is removed.

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
| P6 | Visit `/public` (no login) → see 3 city cards. Click Greenville → existing dashboard at `/public/cities/1`. Visit `/admin` → redirected to `/login`. Log in with seeded creds → land on `/admin` (city list). Open Riverdale & Lakewood admin views, add an action in each. Toggle Public ↔ Admin from header (city-aware). Logout → header shows "Log in". Riverdale shows **off-track**, Lakewood shows **on-track**. |
| P5 | Fresh clone, follow README, app boots in ≤3 commands. AI write-up reads in ≤2 minutes. |

---

## 8. Phase status

Update this section at the **end of your phase** (last commit). Keep it short.

- [x] **P1 Foundation** — *complete*
- [x] **P2 Backend** — *complete*
- [x] **P3 Admin UI** — *complete*
- [x] **P4 Public dashboard** — *complete*
- [x] **P6 Auth + multi-city** — *complete*
- [x] **P5 Docs + QA** — *complete*

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
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/climate?schema=public"
ANTHROPIC_API_KEY=""
NEXT_PUBLIC_BASE_URL="http://localhost:3000"

# Auth (added in P6)
AUTH_SECRET=""                       # generate with: openssl rand -base64 32
ADMIN_EMAIL="admin@example.com"      # seeded admin login
ADMIN_PASSWORD="admin1234"           # seeded admin password (bcrypt-hashed at seed time)
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

### Additional cities (P6)

Seed two more cities so multi-city has something to show. Use `upsert` keyed by city `name`.

**Riverdale** — small, mostly-planned, off-track:
```json
{
  "city": "Riverdale",
  "baselineEmissions": 180000,
  "baselineYear": 2020,
  "targetYear": 2040,
  "actions": [
    { "title": "Replace municipal streetlights with LEDs", "sector": "energy", "annualReduction": 2500, "status": "in progress", "startYear": 2024 },
    { "title": "Curbside compost pilot", "sector": "waste", "annualReduction": 1500, "status": "planned", "startYear": 2027 },
    { "title": "Downtown protected bike lanes", "sector": "transport", "annualReduction": 4000, "status": "planned", "startYear": 2028 }
  ]
}
```

**Lakewood** — ambitious, completed-heavy, on-track:
```json
{
  "city": "Lakewood",
  "baselineEmissions": 320000,
  "baselineYear": 2018,
  "targetYear": 2030,
  "actions": [
    { "title": "Citywide rooftop solar mandate", "sector": "energy", "annualReduction": 125000, "status": "completed", "startYear": 2020 },
    { "title": "Electrify entire bus fleet", "sector": "transport", "annualReduction": 40000, "status": "in progress", "startYear": 2022 },
    { "title": "Net-zero new building code", "sector": "buildings", "annualReduction": 25000, "status": "in progress", "startYear": 2021 },
    { "title": "Lakeside wetland restoration", "sector": "land_use", "annualReduction": 18000, "status": "completed", "startYear": 2019 },
    { "title": "Zero-waste-to-landfill goal", "sector": "waste", "annualReduction": 12000, "status": "in progress", "startYear": 2023 }
  ]
}
```

### Admin user (P6)

Seed exactly one user from env vars (idempotent `upsert` on `email`):
- `email`: from `ADMIN_EMAIL`
- `password_hash`: bcryptjs hash of `ADMIN_PASSWORD` (cost factor 10)
- `role`: `admin`

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

- Recharts / any chart library.
- Pagination, search, sorting on the actions table.
- Action history / audit log.
- Automated test suite.
- Streaming AI extraction.
- Retry logic on Claude failures.
- User registration UI / password reset / email verification (only seeded admin exists).
- Per-city admin scoping (all admins see all cities — by design for v1).

---

## 14. Auth contract (P6)

**Library:** Auth.js v5 (`next-auth@beta` or `@auth/core`, whichever matches stable v5 channel at install time) with **Credentials** provider.

**Session strategy:** JWT (no `Session`/`Account` Prisma tables). The JWT carries `{ userId, email, role }`.

**Login flow:**
- `POST /api/auth/callback/credentials` (handled by NextAuth) validates `email` + `password` against the `User` table.
- On success, JWT cookie set; redirect to `/admin`.
- On failure, return to `/login` with an inline error.

**Server-side auth helpers** (in `src/lib/auth.ts`):
- `auth()` — re-export NextAuth's session getter.
- `requireAdmin()` — async helper for API routes: calls `auth()`, throws `Response(401)` / `Response(403)` if not admin. Used at the top of every mutating API route.

**Middleware:** Next.js 16 uses `src/proxy.ts` (not `middleware.ts` — the older name is silently ignored in Next 16 with `src/` layout). Export name: `proxy`.
- Matcher: `["/admin/:path*"]`.
- If no session → redirect to `/login?callbackUrl=<original>`.
- If session but role !== `admin` → redirect to `/public`.

**Public routes (no auth):**
- `GET /` , `GET /login`, `GET /public/**`
- `GET /api/v1/cities/**`, `GET /api/v1/actions` (and `/[id]`)

**Protected routes (admin only):**
- `GET/POST /admin/**`
- `PUT /api/v1/cities/[id]`
- `POST /api/v1/actions`, `PUT/DELETE /api/v1/actions/[id]`, `POST /api/v1/actions/bulk`, `POST /api/v1/actions/extract`

**Hashing:** `bcryptjs` (pure JS, no native deps — Docker-safe). Cost factor 10. Never log or return `password_hash` to the client.

**AUTH_SECRET:** required in `.env` for JWT signing. Seed/setup should generate a placeholder if blank, but README documents `openssl rand -base64 32`.
