---
description: Standardize API DTOs for success/errors and unify logging tags and fields across start endpoints. Enables deterministic E2E assertions and observability.
author: Cline Self-Improvement Protocol
version: 1.1
tags: ["api", "dto", "errors", "logging", "observability", "testing"]
globs: ["packages/server/src/**/*.ts", "packages/server/src/routes/**/*.ts", "packages/server/src/services/**/*.ts"]
---

# DTO/Error Schema & Logging Tags Rule

## Objective

Create a single, consistent response schema and logging format across all "start" endpoints (structures, defenses, units, research). This enables deterministic UI handling, automated E2E assertions, and consistent observability.

## Response Schema (DTO)

### Success

```json
{
  "success": true,
  "data": { /* endpoint-specific payload */ },
  "message": "Human-readable summary"
}
```

- `success`: Always `true` for successful responses.
- `data`: Endpoint-specific payload (e.g., created queue item, etaMinutes, capacity inputs).
- `message`: A short human-readable message for consumption by toasts/UI.

### Error

```json
{
  "success": false,
  "code": "ERROR_CODE",
  "message": "Human-readable error",
  "details": { /* optional structured context */ }
}
```

- `success`: Always `false` for errors.
- `code`: One of the canonical error codes below.
- `message`: Human-readable detail suitable for UI.
- `details`: Optional structured data (e.g., identityKey, existing item metadata, constraint values).

### Router Compatibility (legacy field coalescing)
- The router MUST populate the `error` field mirroring `message` when an upstream service only provides `message` (for legacy/UI compatibility).
- For idempotency, routers SHOULD map `ALREADY_IN_PROGRESS` to HTTP 409. During migration, E2E may accept canonical payloads with `code: "ALREADY_IN_PROGRESS"` even if status mapping is not yet 409.

## Canonical Error Codes

- `ALREADY_IN_PROGRESS` — Start rejected because an identical item is queued/active
- `INSUFFICIENT_RESOURCES` — Credits/resources insufficient for the start
- `INSUFFICIENT_ENERGY` — Energy projection (balance + reserved + delta) would fall below 0
- `INSUFFICIENT_POPULATION` — Population free capacity is insufficient to begin this construction
- `INSUFFICIENT_AREA` — Area free capacity is insufficient to begin this construction
- `TECH_REQUIREMENTS` — Technology gating unmet
- `INVALID_REQUEST` — Input validation failure (malformed or semantically invalid)
- `NOT_OWNER` — Attempted to operate on a location/base not owned by the user
- `NOT_FOUND` — Referenced entity not found (empire, location, etc.)
- `NO_CAPACITY` — Construction capacity is zero at this base
- `SERVER_ERROR` — Generic fallback (unexpected failure path)

### Request Validation: Missing catalogKey

Requests that reference a structure/defense MUST include `catalogKey`. If missing, return:

```json
{
  "success": false,
  "code": "INVALID_REQUEST",
  "message": "catalogKey is required",
  "details": { "field": "catalogKey" }
}
```

This aligns with `.clinerules/catalog-key-source-of-truth.md`.

### NOT_OWNER Example (Ownership Validation)

```json
{
  "success": false,
  "code": "NOT_OWNER",
  "message": "You do not own this location",
  "details": { "locationCoord": "A00:00:00:00" }
}
```

Use NOT_OWNER when a user attempts to operate on a base/location not owned by them. Include the coordinate (or relevant identifier) in details for observability.

## Wrapper/Delegation Services (Code/Details Propagation)

When a service delegates to another service (e.g., DefensesService → StructuresService.start), propagate error code/message/details transparently to maintain consistent DTO shape for clients and tests:

- Pass through `code`, `message`, and `details` from the inner service.
- Optional: emit a single structured debug line with fields { code, message, details, reasons } to aid failure diagnosis without changing DTO shape.

Example wrapper behavior (TypeScript sketch):
```ts
const result = await StructuresService.start(empireId, locationCoord, mappedKey);
if (!result.success) {
  console.warn("[DefensesService.start] mapped start failed", {
    code: (result as any).code,
    message: (result as any).message || (result as any).error,
    details: (result as any).details,
    reasons: (result as any).reasons,
  });
  return {
    success: false,
    code: (result as any).code || "SERVER_ERROR",
    message: ("message" in (result as any) ? (result as any).message : (result as any).error || "Failed"),
    details: (result as any).details,
    error: ("message" in (result as any) ? (result as any).message : (result as any).error || "Failed")
  };
}
```

## Logging Conventions

Use service-specific tags for key operations:

- `[StructuresService.start]`
- `[DefensesService.start]`
- `[UnitsService.start]`
- `[TechService.start]`

### Temporary Diagnostics: Missing catalogKey (Aggregation-only)

For aggregation-only flows (e.g., `BaseStatsService`) encountering legacy documents missing `catalogKey`, log a short-lived warning and skip:

```
[BaseStatsService] skip: missing catalogKey _id=<id>
```

Remove once the dataset is clean.

### Energy Feasibility Logs

When energy is relevant (structures/defenses/units where applicable), include:

```
[tag] key=<catalogKey> delta=<delta> produced=<produced> consumed=<consumed> balance=<balance> reserved=<reservedNegative> projectedEnergy=<projectedEnergy>
```

Notes:
- `projectedEnergy` = `balance + reservedNegative + delta` for the attempted item.
- Keep all fields in the same order with exact names for E2E parsing.

### Population/Area Feasibility Logs (Optional)

For parity and E2E observability when enforcing population/area gating, emit standardized lines when these checks are evaluated:

```
[StructuresService.start] key=<catalogKey> populationRequired=<n> populationFree=<n> populationCapacity=<n>
[StructuresService.start] key=<catalogKey> areaRequired=<n> areaFree=<n> areaTotal=<n>
```

Notes:
- Values derive from `BaseStatsService.getBaseStats` for the authenticated empire and location.
- Emit only when a check is performed. If verification cannot be computed (e.g., mocks without `.select().lean()`), log a single warn line noting the skip. This mirrors current behavior for population/area feasibility skips observed in tests.

### Queue Identity Logs (Optional but Recommended)

On 409/idempotency outcomes, include a line:

```
[tag] idempotent identityKey=<identityKey> state=<queued|active> itemId=<id>
```

### Standard Idempotent Log Line
Use the exact format above so tests can assert deterministic identity information on conflicts.

### Observed Example Evidence (2025-08-30)
```
[StructuresService.start] key=jump_gate delta=-12 produced=86 consumed=16 balance=70 reserved=0 projectedEnergy=58
[StructuresService.start] idempotent existing queued for identityKey=...
[DefensesService.start] mapped start failed { code: 'ALREADY_IN_PROGRESS', message: 'An identical item is already queued or active.', details: { queueType: 'structures', identityKey: '...', catalogKey: 'jump_gate' } }
```

## Adoption Targets

- Structures start (authoritative reference)
- Defenses start
- Units start
- Research start

All must emit responses using the schema above and use the appropriate service tag in logs.

## E2E Assertions

- Parse success vs error by `success` boolean
- Branch by `code` for error handling (: `ALREADY_IN_PROGRESS`, `INSUFFICIENT_ENERGY`, etc.)
- For energy projection E2E tests, assert presence and correct computation of:
  - `produced`, `consumed`, `balance`, `reservedNegative`, `delta`, `projectedEnergy`

## Change Control

- Adding a new error code requires updating:
  - This document
  - Server handlers emitting it
  - UI switch/case handling (if any)
  - Tests (unit/E2E) validating the new path

## Success Criteria

- All start endpoints return the standardized DTO schema
- Error codes are used consistently and deterministically
- Energy feasibility logs are uniform and parseable across services
- E2E test suite validates positive and negative projection scenarios using these logs
