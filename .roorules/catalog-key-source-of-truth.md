---
description: Enforce catalogKey as the sole identifier for structures/defenses across server and client. Prohibit legacy Building.type inference or mapping. Add validation, hygiene, and testing guidance.
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["catalog", "source-of-truth", "data-integrity", "server", "client", "testing", "legacy-removal"]
globs: ["packages/**", "packages/shared/**", ".clinerules/**"]
---

# Catalog Key — Single Source of Truth

## Objective

Eliminate drift and ambiguity by enforcing `catalogKey` as the only identifier for structures and defenses across the entire codebase (server, client, scripts, and tests). Remove all legacy `Building.type`-based inference or mapping.

## Scope

- Server services: `baseStatsService`, `structuresService`, `economyService`, `capacityService`, `techService`, `gameLoopService`, and related routes.
- Client services and UI: all calls and displays must rely on keys from `@game/shared` catalogs.
- Data model: `Building` and any persisted records that reference structures/defenses must carry `catalogKey`.
- Scripts and tests: migrations, backfills, and automated tests must assume `catalogKey` as authoritative.

## Background

Historically, some services inferred a modern catalog key from the deprecated `Building.type` string. This led to wrong mappings and inconsistencies with canonical shared catalogs. The authoritative specs live in `@game/shared` (e.g., `packages/shared/src/buildings.ts`, `defenses.ts`).

## Enforcement Rules

1. Service Resolution
   - Services MUST read specs using only `catalogKey`.
   - No fallback mapping or switch statements based on legacy `type` are permitted.
   - Requests missing `catalogKey` MUST be rejected with `INVALID_REQUEST` (see DTO rule updates).

2. Aggregation-Only Contexts
   - In purely aggregative or diagnostic flows (e.g., stats sweeps), items without `catalogKey` MAY be skipped with a short-lived diagnostic log using a service tag (e.g., `[BaseStatsService]`), until data is clean.

3. Canonical Catalog Access
   - Use the shared helpers from `@game/shared` (e.g., `getBuildingSpec(catalogKey)` or direct map lookups).
   - Never embed ad-hoc mappings in services.

4. Request Validation
   - Request handlers that accept structure/defense references MUST require `catalogKey` and respond with:
     ```json
     {
       "success": false,
       "code": "INVALID_REQUEST",
       "message": "catalogKey is required",
       "details": { "field": "catalogKey" }
     }
     ```
   - See `.clinerules/dto-error-schema-and-logging.md` for schema.

## Data Hygiene and Migration

- Backfill Script
  - Provide a one-off script under `packages/server/src/scripts/` to populate `catalogKey` where missing by using authoritative data sources or deterministic mappings that reflect the current, explicit catalog (not legacy names).
  - After backfill, remove temporary skip logs.

- Model Guidance
  - Prefer making `catalogKey` required in persisted building-like models going forward.
  - Keep the legacy `type` string for historical compatibility only; never use it to infer specs.

## Testing Requirements

- Unit Tests
  - Ensure code paths reject or skip when `catalogKey` is missing (request-time: `INVALID_REQUEST`; aggregation-time: skip + temporary log).
  - Assert no usage of legacy mappers like `mapTypeToBuildingKey` exists.
  - Verify `getBuildingSpec(catalogKey)` is used wherever specs are needed.

- Integration / E2E
  - All flows that create or start structures/defenses MUST pass `catalogKey`.
  - No test should rely on `type`-derived behavior.

- Static/Pattern Checks (Optional)
  - CI searches for forbidden patterns:
    - `mapTypeToBuildingKey`
    - `switch (b.type` or similar type→key logic
    - `resolveKey(`

## Change Control

- Any new content (structures/defenses) is added in `@game/shared` catalogs.
- Services must consume catalog data from shared; no inline lists or mappings.
- Any change to catalog identifiers requires updating shared catalogs and relevant tests; services remain key-driven only.

## Do / Don&#39;t Examples

- Do (Request/Service):
  ```ts
  import { getBuildingSpec } from "@game/shared";

  const catalogKey = (doc as any).catalogKey as BuildingKey | undefined;
  if (!catalogKey) {
    return res.status(400).json({
      success: false,
      code: "INVALID_REQUEST",
      message: "catalogKey is required",
      details: { field: "catalogKey" }
    });
  }

  const spec = getBuildingSpec(catalogKey);
  ```

- Don&#39;t (Legacy Inference):
  ```ts
  // ❌ Forbidden: inferring catalog key from legacy type
  // switch (b.type) { case "factory": return "robotic_factories"; ... }
  // return mapTypeToBuildingKey(b.type as BuildingType);
  ```

- Do (Aggregation with Temporary Diagnostics):
  ```ts
  const catalogKey = (b as any).catalogKey as BuildingKey | undefined;
  if (!catalogKey) {
    console.warn("[BaseStatsService] skip: missing catalogKey _id=%s", b._id?.toString?.());
    continue;
  }
  ```

## Adoption Targets

- Completed: `baseStatsService` now uses `catalogKey` only and skips missing keys.
- Next (in discrete, low-risk steps):
  - `structuresService`: remove inline `resolveKey` switch; validate `catalogKey` on requests; update tests.
  - `economyService`: remove legacy fallbacks/logs; enforce `catalogKey`.
  - Audit `capacityService`: ensure it does not rely on legacy `type`; trim if redundant.

## Success Criteria

- No service contains a `type → key` mapping.
- All request handlers that accept structure/defense references require `catalogKey`.
- Tests pass using `catalogKey` exclusively.
- Temporary skip logs disappear after dataset cleanup and backfill completion.
