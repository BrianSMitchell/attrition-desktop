---
description: Canonical spec for /game/bases/summary (construction, production, research) with authoritative data sources and tests
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["api", "summary", "bases", "events", "queues", "testing", "ui-parity"]
globs: ["packages/server/src/routes/game.ts", "packages/client/src/components/game/BaseEventsTable.tsx"]
---

# Base Events Summary — Canonical Standard

## Objective

Provide a single source of truth for computing per-base event summaries exposed at `GET /game/bases/summary` and consumed by `BaseEventsTable`. Prevent drift between UI and server by defining authoritative sources, DTO shape, and test expectations.

## Authoritative Sources

- Construction queued:
  - Count `Building` documents with `isActive: false` grouped by `locationCoord` for the authenticated empire.
  - This reflects queued or pending construction (inactive) at each base.
- Research:
  - Use the earliest pending `TechQueue` item for the authenticated empire (`status: "pending"`, sort by `completesAt` ascending).
  - Fields:
    - `name`: `getTechSpec(techKey).name` from `@game/shared`. Fallback to `techKey` string if the spec is not found.
    - `remaining`: `Math.max(0, completesAt - Date.now())` (milliseconds remaining).
- Production (units):
  - Count `UnitQueue` documents with `status: "pending"` grouped by `locationCoord` for the authenticated empire.
  - For each base, derive `next` from the earliest pending item by `completesAt` ascending. If `completesAt` is missing, fall back to earliest `createdAt` and treat as waiting (`remaining = 0`, `percent = 0`).
  - Fields for `next`:
    - `name`: `getUnitSpec(unitKey).name` from `@game/shared` (fallback to `unitKey` string if the spec is not found).
    - `remaining`: `Math.max(0, completesAt - Date.now())` (milliseconds remaining).
    - `percent` (optional): progress percentage derived from `startedAt` → `completesAt` as `floor(elapsed/total*100)` clamped to 0..100.
- Occupier:
  - `null` until occupation mechanics ship. In the future this may include `{ empireId, name }` when hostile occupation exists.

## DTO Shape

The server returns a compact list of bases with summary fields:

```json
{
  "success": true,
  "data": {
    "bases": [
      {
        "baseId": "…",
        "name": "Base A00:00:00:00",
        "location": "A00:00:00:00",
        "economy": { "metalPerHour": 0, "energyPerHour": 0, "researchPerHour": 0 },
        "occupier": null,
        "construction": { "queued": 0 },
        "production": { "queued": 0, "next": { "name": "Fighter", "remaining": 0 } },
        "research": null
      }
    ]
  }
}
```

- `construction.queued`: integer count of inactive buildings at the base.
- `production.queued`: integer count of pending unit productions (`UnitQueue` with `status: "pending"`) at the base.
- `production.next`: optional object:
  - `{ "name": string, "remaining": number, "percent"?: number }`
- `research`: either `null` or an object:
  - `{ "name": string, "remaining": number }` where `remaining` is milliseconds until completion.

## Parity & Constraints

- Research summary MUST come from `TechQueue` instead of legacy `ResearchProject` (Phase 3 queuing).
- Construction queued MUST come from authoritative `Building` documents with `isActive: false`.
- No type→key inference is permitted. All specs and labels come from `@game/shared` catalogs.
- The endpoint should remain lightweight; avoid computing client-only estimates beyond the fields listed here.

## Optional Real-time (Phase B)

To enable live updates without manual refresh:

- After a successful Structure Start, emit an event to the empire room (e.g., `base:construction:queued`) with a payload such as:
  ```json
  { "coord": "A00:00:00:00", "catalogKey": "robotic_factories", "etaMinutes": 12 }
  ```
- Clients can subscribe to this event to auto-refresh Base Events Summary. This is optional and does not change idempotency behavior.

## Testing

### Server Integration

- Seed 1 inactive `Building` at coord `X`:
  - `GET /game/bases/summary` → `construction.queued` equals `1` for coord `X`, equals `0` for other coords.
- Seed a pending `TechQueue` item for the empire:
  - `GET /game/bases/summary` → `research` is not `null`, `name` resolves to `getTechSpec(techKey).name` (or `techKey` fallback), and `remaining >= 0`.
- Seed 1 pending `UnitQueue` item at coord `Y`:
  - `GET /game/bases/summary` → `production.queued` increments for coord `Y`. If `startedAt`/`completesAt` are present, `production.next` is not `undefined`, `name` resolves via `getUnitSpec(unitKey).name` (or `unitKey` fallback), and `remaining >= 0`. If `completesAt` is missing, `production.next.remaining` equals `0` and `percent` equals `0` (waiting).

### End-to-End (see protocol)

- Start a structure via `POST /game/structures/start` for a base where you have ownership and eligibility.
- Navigate to Bases page and click Refresh.
- Assert that the `Construction` column displays the updated queued count for that base (e.g., increments by 1).
- For research, with a seeded or active `TechQueue`, assert that `Research` shows the tech name and that a timer is non-negative if rendered.

## Change Control

- Any change to the computations, fields, or shapes documented here requires:
  - Updating this rule.
  - Updating the server implementation.
  - Updating UI usage and related tests (unit/integration/E2E).
  - Adding/adjusting E2E checks in the protocol for Base Events Summary.
