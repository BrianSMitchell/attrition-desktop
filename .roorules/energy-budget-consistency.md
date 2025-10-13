---
description: Enforce a single source of truth for energy budget math across UI and server. Prevents drift between feasibility checks and on-screen Energy Balance.
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["consistency", "energy", "rules", "ui-vs-server", "testing"]
globs: ["packages/**", "packages/shared/**", "packages/server/**", "packages/client/**"]
---

# Energy Budget Consistency Rule

## Objective
Ensure identical energy budget computation across UI and server so that:
- The Energy Balance shown in the UI matches the feasibility gating used on the server
- Gameplay actions (e.g., starting consumer buildings) are not blocked when UI balance is sufficient

## Canonical Energy Model

- Baseline production:
  - Every base contributes a constant +2 to energy production.

- Planet scaling:
  - `solar_plants`: production += level × `location.result.solarEnergy`
  - `gas_plants`: production += level × `location.result.yields.gas`

- Other buildings:
  - Use `BuildingSpec.energyDelta` per level.
    - `delta ≥ 0` → contributes to production
    - `delta < 0` → contributes to consumption

- Queued reservations:
  - Pre-reserve only queued negative energy (consumers).
  - Do NOT pre-count queued producers before they become active.

- Feasibility rule (for actions like StructuresService.start):
  - Producers (delta ≥ 0) may start regardless of current balance.
  - Consumers (delta < 0) may start only if `balance + reservedNegative + delta ≥ 0`.

## Single Source of Truth

- Both UI and server MUST derive energy values using the same shared helper.
- Implement an exported helper in `packages/shared` and call it from:
  - UI display (e.g., base stats)
  - Server feasibility checks (e.g., structures start)
  - Any background services that adjust or inspect energy (e.g., game loops)

### Suggested Shared API (future-proofing)

`packages/shared/src/energyBudget.ts`
```ts
export interface EnergyContextInput {
  buildingsAtBase: Array<{
    key: string;            // canonical catalog key or mapped type
    level: number;
    isActive: boolean;
  }>;
  location: {
    solarEnergy?: number;
    gasYield?: number;
  };
  includeQueuedReservations?: boolean; // default true
  baseline?: number;                   // default 2
}

export function computeEnergyBalance(input: EnergyContextInput): {
  produced: number;
  consumed: number;
  balance: number;        // produced - consumed
  reservedNegative: number;
};

export function canStartWithDelta(params: {
  balance: number;
  reservedNegative: number;
  delta: number;          // BuildingSpec.energyDelta of the starting item
}): boolean;
```

## Implementation Requirements

- UI (client):
  - Planet info, planet pages, and any panels showing energy MUST use the shared helper.
  - The numbers shown to players should align with server gating outcomes.
  - Defenses tables and any energy-related labels MUST use the shared helper to prevent UI/server drift.

- Server (backend):
  - Feasibility checks MUST call the shared helper.
  - The structures start logic MUST:
    - Include baseline +2
    - Apply planet scaling for solar/gas
    - Reserve queued negative energy only
    - Enforce the consumer rule (`balance + reserved + delta ≥ 0`)
  - The defenses start logic MUST also use the shared helper and enforce the same consumer rule for negative energy deltas.

- No runtime mappings:
  - Runtime services MUST NOT map legacy `Building.type`. Require `catalogKey`. If missing, reject with `INVALID_REQUEST` (request-time) or skip with a temporary diagnostic (aggregation-only).
  - Any deterministic mapping MUST occur only in one-off data migration scripts (e.g., `packages/server/src/scripts/migrations/backfillCatalogKey.ts`).

## Testing Requirements

- Unit tests (shared):
  - Verify canonical cases:
    - With and without active solar/gas plants
    - With queued negative consumers reserved
    - Edge conditions around zero (projected exactly 0 should be allowed)
  - Assert identical results between UI-facing and server-facing calls.

- Server tests:
  - Ensure `StructuresService.start` consumes the helper and passes when UI balance indicates feasibility.

- End-to-End checks:
  - If UI shows a positive Energy Balance and a new consumer would not drop the projection below 0, starting should succeed.
  - If balance is just below 0, starting the same consumer should fail with a clear error.

## Logging

- Server logs related to energy feasibility MUST include:
  - Produced, consumed, balance, reservedNegative, delta, and projectedEnergy
  - A recognizable tag (e.g., `[StructuresService.start]`) to simplify E2E validation and debugging.
- Standardized log line format (parseable, fixed order):
  ```
  [StructuresService.start] key=<catalogKey> delta=<delta> produced=<produced> consumed=<consumed> balance=<balance> reserved=<reservedNegative> projectedEnergy=<projectedEnergy>
  ```
- Reference regex for parsing (example):
  ```
  /\[StructuresService\.start\]\s+key=(\S+)\s+delta=(-?\d+)\s+produced=(-?\d+)\s+consumed=(-?\d+)\s+balance=(-?\d+)\s+reserved=(-?\d+)\s+projectedEnergy=(-?\d+)/
  ```
- Producer rule clarification:
  Producers (delta ≥ 0) are always allowed; only enforce feasibility for consumers (delta < 0) using `canStartWithDelta`.

## Change Control

- Any changes to the energy model MUST:
  - Update this rule
  - Update shared helper and tests
  - Notify UI/server owners to refactor any direct/duplicated computations
