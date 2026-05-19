# City Climate Action Tracker

A small web app where city admins track climate actions and the public sees a dashboard with totals, sector breakdown, and an on-track-to-net-zero indicator. Includes a Claude-powered "paste free text → structured actions" import flow.

Built as a take-home for an AI-Native Software Engineer role at Open Earth Foundation.

---

## Quickstart

```bash
# 1. clone, then in the project root:
cp .env.example .env
# Edit .env — fill in ANTHROPIC_API_KEY and generate AUTH_SECRET:
#   openssl rand -base64 32

# 2. start Postgres
docker compose up -d postgres

# 3. install deps, run migrations + seed, start dev server
npm install
npx prisma migrate deploy --config prisma/config.ts
npx prisma db seed --config prisma/config.ts
npm run dev
```

App on [http://localhost:3000](http://localhost:3000).

**Full Docker (Next.js + Postgres):**

```bash
cp .env.example .env       # populate ANTHROPIC_API_KEY and AUTH_SECRET
docker compose up --build
```

### Seeded login

| Field | Default value |
|---|---|
| Email | `admin@example.com` |
| Password | `admin1234` |

Both are configurable via `ADMIN_EMAIL` / `ADMIN_PASSWORD` in `.env`. The seed bcrypt-hashes the password at insert time; the plaintext never lands in the DB.

---

## What you can do

**As anyone** (no login):
- Visit `/public` — pick a city.
- Visit `/public/cities/[id]` — see totals, sector breakdown bars, a green/red on-track indicator with the raw numbers, and a **projected emissions trajectory chart** (required path vs. projected path, with a "Net zero by YYYY" annotation).

**As an admin** (after `/login`):
- Visit `/admin` — pick a city.
- `/admin/cities/[id]` — edit city config (baseline, baseline year, target year), CRUD climate actions in a table, add manually via dialog.
- `/admin/cities/[id]/import` — paste free text describing climate plans. Claude extracts a list of structured actions with per-action confidence scores. Review, deselect rows you don't want, click Save.

The header role toggle (Public ↔ Admin) only appears for logged-in admins and is city-aware: switching while on `/admin/cities/3` lands you on `/public/cities/3`.

---

## Architecture

```
src/
  app/
    page.tsx                    landing
    login/page.tsx              Auth.js Credentials login form
    public/
      page.tsx                  city picker
      cities/[cityId]/page.tsx  dashboard (Server Component, SSR)
    admin/
      page.tsx                  city picker (gated)
      cities/[cityId]/
        layout.tsx              Tabs: Actions | Import from text
        page.tsx                config card + actions table + Add/Edit dialog
        import/page.tsx         textarea + extract + review table
    api/
      auth/[...nextauth]/       NextAuth handler
      v1/
        cities/                 GET list, GET/PUT [id]
        actions/                GET list, POST, [id] PUT/DELETE, bulk, extract
  components/                   Header, RoleToggle, LoginForm, dialogs, etc.
  lib/
    prisma.ts                   PrismaClient singleton (with pg adapter)
    schemas.ts                  Zod schemas (single source of truth)
    api.ts                      typed fetch wrappers
    auth.ts                     auth()/signIn()/signOut() + requireAdmin()
    dashboard.ts                on-track math + sector aggregation
  auth.ts                       NextAuth v5 config (Credentials provider)
  auth.config.ts                edge-safe subset (used by proxy)
  proxy.ts                      route gating (the Next.js 16 'middleware')
prisma/
  schema.prisma                 City, ClimateAction, User, enums
  config.ts                     Prisma 7 config (datasource URL, seed cmd)
  seed.ts                       idempotent seed: 3 cities + admin user
  migrations/                   3 committed migrations
docs/
  api-curl.md                   every endpoint with a working curl
```

### Key design choices

| Concern | Choice | Why |
|---|---|---|
| LLM call | Claude `claude-sonnet-4-6` with **tool use** | Structured output without JSON-parsing retries |
| Tool input schema | **Derived from a Zod schema** via `z.toJSONSchema()` | Single source of truth — same shape validates the model's output server-side |
| Extraction failure mode | Per-action Zod validation → `{ extracted, skipped[] }` | Partial successes are still useful; the UI can show "extracted 4, couldn't parse 1" |
| Confidence | Model self-reports a 0–1 value per action via the tool schema | Real signal, not fabricated by the server |
| Auth | Auth.js v5 + Credentials provider + JWT sessions + bcryptjs | Standard, Docker-safe (no native deps from `bcrypt`) |
| Route protection | `src/proxy.ts` matcher on `/admin/**` | One file controls gating |
| Multi-city | Path-based: `/{public,admin}/cities/[cityId]` | Shareable URLs, no client state |
| Dashboard math | Server-side in `lib/dashboard.ts` | One place to read; client renders only |
| Projection chart | Recharts `ComposedChart` (added P7) | Client component; data pre-computed server-side and passed as props |

### On-track formula

```
required_annual = baseline_tons / (target_year - baseline_year)
expected_now    = required_annual × (current_year - baseline_year)
achieved        = sum(annual_reduction) where status ∈ {in_progress, completed}
                                          AND start_year ≤ current_year
on_track        = achieved ≥ expected_now ? green : red
```

The dashboard always shows the raw `achieved` and `expected_now` next to the indicator so the verdict isn't a black box.

### Sector breakdown bars

Each sector bar width is a percentage **relative to the highest-reducing sector**, not relative to the city's total baseline. Concretely:

```
maxSectorTotal = max(annual_reduction sum per sector)   -- floor of 1 to avoid ÷0
pct            = round((sectorTotal / maxSectorTotal) × 100)
```

This means the top sector always renders at 100% width; every other sector scales proportionally to it. The raw `t CO₂/yr` number is shown alongside so the bar is never a black box.

`groupBySector` (in `lib/dashboard.ts`) sums `annual_reduction` across **all** actions for each sector (regardless of status or start year) — it's a capacity view, not the filtered "achieved" figure used for the on-track calculation.

---

## Environment variables

| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Default points to `localhost:5433` (compose maps `5433:5432`). |
| `ANTHROPIC_API_KEY` | for `/extract` only | Needed for the AI import flow; everything else works without it. |
| `AUTH_SECRET` | yes | `openssl rand -base64 32`. Used to sign JWT session cookies. |
| `ADMIN_EMAIL` | yes | Seeded admin login. Default `admin@example.com`. |
| `ADMIN_PASSWORD` | yes | Seeded admin password. Default `admin1234`. Hashed at seed time. |
| `NEXT_PUBLIC_BASE_URL` | yes | Used for server-to-server fetches during SSR. Default `http://localhost:3000`. |

---

## API

All endpoints are documented with example `curl`s in [`docs/api-curl.md`](docs/api-curl.md).

| Method | Path | Auth |
|---|---|---|
| `GET` | `/api/v1/cities` | open |
| `GET` | `/api/v1/cities/[id]` | open |
| `PUT` | `/api/v1/cities/[id]` | admin |
| `GET` | `/api/v1/actions[?cityId=]` | open |
| `POST` | `/api/v1/actions` | admin |
| `PUT/DELETE` | `/api/v1/actions/[id]` | admin |
| `POST` | `/api/v1/actions/bulk` | admin |
| `POST` | `/api/v1/actions/extract` | admin |

The extract endpoint returns:

```ts
{
  extracted: AIExtractedAction[];    // validated, not yet persisted
  skipped:   { reason: string; raw: unknown }[];
  stopReason?: string;               // only when NODE_ENV !== 'production'
}
```

---

## Notes & gotchas

- **Prisma 7** moved the datasource URL out of `schema.prisma` into `prisma/config.ts`. Every CLI command needs `--config prisma/config.ts` (e.g. `npx prisma migrate dev --config prisma/config.ts`). The `db seed` script also reads from there.
- **Next.js 16** renamed `middleware.ts` to `src/proxy.ts` (export `proxy`). The older filename is silently ignored when using the `src/` directory layout — don't add a `middleware.ts` thinking it does something.
- **`ANTHROPIC_API_KEY` shadowing**: if your shell already exports an empty `ANTHROPIC_API_KEY=""`, it overrides `.env`. Use `set -a && source .env && set +a && npm run dev` to force `.env` to win.
- **Port `5433`**: the compose file maps Postgres to host port 5433 (not 5432) to avoid colliding with any other Postgres on your machine. Update `DATABASE_URL` if you change it.

---

## Testing

No automated test suite (out of scope for the time budget). Manual verification:

1. `docker compose up -d postgres && npm run dev`
2. Visit `/public` — confirm 3 city cards (Greenville, Riverdale, Lakewood)
3. Lakewood → 🟢 **On track** (220,000 achieved vs 213,333 expected by 2026)
4. Riverdale → 🔴 **Off track** (2,500 vs 54,000)
5. Greenville → 🔴 **Off track** (65,000 vs 200,000)
6. `/admin` (logged out) → redirects to `/login`
7. Log in with seeded creds → land on `/admin` city list
8. Edit a city's baseline; add an action manually; delete it
9. Go to the city's Import tab, paste:
   `"We will electrify 50 city buses by 2027 (saves ~8000 t/yr) and install rooftop solar on 200 schools starting 2026."`
   → Extract → see 2 rows with confidence scores → Save selected
10. Verify the new rows appear in the Actions tab with `Source: AI XX%`
11. Header pill: Admin ↔ Public on a city-scoped URL stays on the same city
12. Logout → header shows "Log in"

If you want to write an automated suite later, the natural entry points are:
- API-level: hit the route handlers against a Docker test DB
- Unit-level: `lib/dashboard.ts` is pure and trivially testable
- E2E: Playwright against the seeded data

---

## What's intentionally out of scope

Documented as "future work" rather than implemented:

- ~~Recharts / chart library~~ — added in P7 (projection chart); sector breakdown still uses Tailwind `<div>` bars
- Pagination, search, sorting on the actions table
- Action history / audit log
- Automated test suite
- Streaming AI extraction
- Retry logic on Claude failures (one shot, then surface the error)
- User registration UI / password reset / email verification (only seeded admin)
- Per-city admin scoping (all admins see all cities)

---

## AI workflow

See [`docs/ai-workflow.md`](docs/ai-workflow.md) for how this app was built with Claude (Opus orchestrator + Sonnet subagents, time-per-phase, hiccups, and one moment each of save and correction).
