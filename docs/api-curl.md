# API curl Reference

Base URL: `http://localhost:3000`

---

## Cities

### GET /api/v1/cities/:id

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

### PUT /api/v1/cities/:id

Update city fields (all fields optional).

```bash
curl -X PUT http://localhost:3000/api/v1/cities/1 \
  -H "Content-Type: application/json" \
  -d '{"target_year": 2040}'
```

Expected response (200):

```json
{
  "id": 1,
  "name": "Greenville",
  "baseline_tons": 500000,
  "baseline_year": 2020,
  "target_year": 2040
}
```

400 with `{ "error": "Validation failed", "issues": [...] }` on invalid input.

---

## Actions

### GET /api/v1/actions

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

### POST /api/v1/actions

Create a single action manually.

```bash
curl -X POST http://localhost:3000/api/v1/actions \
  -H "Content-Type: application/json" \
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

Expected response (201):

```json
{
  "id": 8,
  "cityId": 1,
  "title": "LED street lighting upgrade",
  "sector": "energy",
  "status": "planned",
  "annual_reduction": 3000,
  "start_year": 2026,
  "source": "manual",
  "confidence": null,
  "createdAt": "2026-05-19T18:30:00.000Z"
}
```

400 on validation failure.

---

### PUT /api/v1/actions/:id

Update an existing action (all fields optional, cityId excluded).

```bash
curl -X PUT http://localhost:3000/api/v1/actions/1 \
  -H "Content-Type: application/json" \
  -d '{"status": "completed", "annual_reduction": 14000}'
```

Expected response (200): updated action object.

400 on validation failure.

---

### DELETE /api/v1/actions/:id

Delete an action.

```bash
curl -X DELETE http://localhost:3000/api/v1/actions/1
```

Expected response: 204 No Content.

---

## Bulk Insert

### POST /api/v1/actions/bulk

Insert multiple AI-extracted actions in a single transaction. Server sets `source: "ai"` — do not pass it in the request.

```bash
curl -X POST http://localhost:3000/api/v1/actions/bulk \
  -H "Content-Type: application/json" \
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

Expected response (201):

```json
{
  "created": [
    {
      "id": 9,
      "cityId": 1,
      "title": "EV Charging Infrastructure",
      "sector": "transport",
      "status": "planned",
      "annual_reduction": 10000,
      "start_year": 2025,
      "source": "ai",
      "confidence": 0.9,
      "createdAt": "2026-05-19T18:30:00.000Z"
    }
  ]
}
```

400 on validation failure. Entire transaction rolled back on DB error.

---

## AI Extraction

### POST /api/v1/actions/extract

Extract structured climate actions from free text using Claude (`claude-sonnet-4-6`). Returns extracted actions **without persisting them** — save them via `/bulk` after review.

**Requirements:** `ANTHROPIC_API_KEY` must be set. `text` must be at least 20 characters.

```bash
curl -X POST http://localhost:3000/api/v1/actions/extract \
  -H "Content-Type: application/json" \
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

400 if `text.length < 20` or `cityId` is missing/invalid.
502 if the Anthropic API call fails.

**Note:** `cityId` is accepted in the request to allow future routing context, but it is not attached to the returned extracted actions. Call `/bulk` with the chosen actions and `cityId` to persist them with `source: "ai"`.
