# API curl Reference

Base URL: `http://localhost:3000`

## Auth notes

Several endpoints require an admin session (JWT cookie). To test auth-gated routes via curl:

1. Sign in via the UI at `http://localhost:3000/login` to establish a session cookie.
2. Copy the `next-auth.session-token` cookie from your browser's DevTools.
3. Pass it in requests: `curl -H "Cookie: next-auth.session-token=<token>" ...`

Alternatively, for quick smoke-testing, use curl to verify unauthenticated requests return 401:

```bash
# Expect: 401 Unauthorized
curl -X PUT http://localhost:3000/api/v1/cities/1 \
  -H "Content-Type: application/json" \
  -d '{"target_year": 2040}'
```

---

## Cities

### GET /api/v1/cities — **public**

List all cities.

```bash
curl http://localhost:3000/api/v1/cities
```

Expected response (200):

```json
[
  { "id": 1, "name": "Greenville", "baseline_tons": 500000, "baseline_year": 2020, "target_year": 2035 },
  { "id": 2, "name": "Riverdale", "baseline_tons": 180000, "baseline_year": 2020, "target_year": 2040 },
  { "id": 3, "name": "Lakewood", "baseline_tons": 320000, "baseline_year": 2018, "target_year": 2030 }
]
```

---

### GET /api/v1/cities/:id — **public**

Fetch a city by ID.

```bash
curl http://localhost:3000/api/v1/cities/1
```

Expected response (200):

```json
{
  "id": 1,
  "name": "Greenville",
  "baseline_tons": 500000,
  "baseline_year": 2020,
  "target_year": 2035
}
```

404 if city does not exist.

---

### PUT /api/v1/cities/:id — **admin only**

Update city fields (all fields optional). Requires admin session cookie.

```bash
curl -X PUT http://localhost:3000/api/v1/cities/1 \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<token>" \
  -d '{"target_year": 2040}'
```

Returns 401 if no session, 403 if not admin.

---

## Actions

### GET /api/v1/actions — **public**

List all actions. Optionally filter by city.

```bash
# All actions
curl http://localhost:3000/api/v1/actions

# Filtered by city
curl "http://localhost:3000/api/v1/actions?cityId=1"
```

Expected response (200):

```json
[
  {
    "id": 1,
    "cityId": 1,
    "title": "Expand bike lane network",
    "sector": "transport",
    "status": "in_progress",
    "annual_reduction": 12000,
    "start_year": 2024,
    "source": "manual",
    "confidence": null,
    "createdAt": "2026-05-19T18:12:45.622Z"
  }
]
```

---

### POST /api/v1/actions — **admin only**

Create a single action manually.

```bash
curl -X POST http://localhost:3000/api/v1/actions \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<token>" \
  -d '{
    "cityId": 1,
    "title": "LED street lighting upgrade",
    "sector": "energy",
    "status": "planned",
    "annual_reduction": 3000,
    "start_year": 2026,
    "source": "manual"
  }'
```

Returns 201 on success, 401/403 if unauthenticated/not-admin, 400 on validation failure.

---

### PUT /api/v1/actions/:id — **admin only**

Update an existing action (all fields optional, cityId excluded).

```bash
curl -X PUT http://localhost:3000/api/v1/actions/1 \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<token>" \
  -d '{"status": "completed", "annual_reduction": 14000}'
```

Returns 200 on success.

---

### DELETE /api/v1/actions/:id — **admin only**

Delete an action.

```bash
curl -X DELETE http://localhost:3000/api/v1/actions/1 \
  -H "Cookie: next-auth.session-token=<token>"
```

Returns 204 No Content.

---

## Bulk Insert

### POST /api/v1/actions/bulk — **admin only**

Insert multiple AI-extracted actions in a single transaction. Server sets `source: "ai"`.

```bash
curl -X POST http://localhost:3000/api/v1/actions/bulk \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<token>" \
  -d '{
    "cityId": 1,
    "actions": [
      {
        "title": "EV Charging Infrastructure",
        "sector": "transport",
        "status": "planned",
        "annual_reduction": 10000,
        "start_year": 2025,
        "confidence": 0.9
      }
    ]
  }'
```

Returns 201 on success.

---

## AI Extraction

### POST /api/v1/actions/extract — **admin only**

Extract structured climate actions from free text using Claude (`claude-sonnet-4-6`). Returns extracted actions **without persisting them** — save them via `/bulk` after review.

**Requirements:** `ANTHROPIC_API_KEY` must be set. `text` must be at least 20 characters.

```bash
curl -X POST http://localhost:3000/api/v1/actions/extract \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=<token>" \
  -d '{
    "text": "We will electrify 50 buses by 2027 (saves ~8000 t/yr).",
    "cityId": 1
  }'
```

Expected response (200):

```json
{
  "extracted": [
    {
      "title": "Electrify 50 Buses",
      "sector": "transport",
      "status": "planned",
      "annual_reduction": 8000,
      "start_year": 2027,
      "confidence": 0.92
    }
  ],
  "skipped": [],
  "stopReason": "tool_use"
}
```

- `extracted`: actions Claude identified and that passed Zod validation.
- `skipped`: items Claude returned that failed Zod validation (`{ reason, raw }`).
- `stopReason`: only present when `NODE_ENV !== "production"`.

400 if `text.length < 20` or `cityId` is missing/invalid. 401/403 if unauthenticated/not-admin. 502 if the Anthropic API call fails.
