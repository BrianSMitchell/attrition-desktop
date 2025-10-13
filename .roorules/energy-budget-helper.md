---
description: Mandate a single shared Energy Budget helper consumed by both server and client to prevent drift between UI display and feasibility gating.
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["energy", "consistency", "shared-helper", "parity", "testing"]
globs: ["packages/shared/src/**/*.ts", "packages/server/src/**/*.ts", "packages/client/src/**/*.ts", "packages/client/src/**/*.tsx"]
---

# Energy Budget Helper — Single Source of Truth

## Objective

Eliminate UI/server drift by enforcing a single shared helper that computes energy production, consumption, reservedNegative (queued consumers), and balance. All feasibility gating and on-screen Energy Balance must use this helper.

## Canonical API (in packages/shared)

File: `packages/shared/src/energyBudget.ts`

```ts
export interface EnergyContextInput {
  buildingsAtBase: Array<{
    key: string;            // canonical catalog key
    level: number;          // integer level
    isActive: boolean;      // active (count in produced/consumed)
    isQueuedConsumer?: boolean; // queued/inactive negative item to reserve
  }>;
  location: {
    solarEnergy?: number;   // from planet/system context
    gasYield?: number;      // from planet/system context
  };
  includeQueuedReservations?: boolean; // default true
  baseline?: number;                   // default 2
}

export interface EnergyBalance {
  produced: number;
  consumed: number;
  balance: number;        // produced - consumed
  reservedNegative: number;
}

/**
 * Computes energy production/consumption/balance according to canonical rules:
 * - Baseline +2 per base
 * - Solar plants: +level × solarEnergy
 * - Gas plants: +level × gasYield
 * - Other buildings: use BuildingSpec.energyDelta per level (>=0 -> produced, <0 -> consumed)
 * - Reservations: sum queued/inactive negative deltas only (producers not pre-counted)
 */
export function computeEnergyBalance(input: EnergyContextInput): EnergyBalance;

/**
 * Producers (delta >= 0) are always allowed.
 * Consumers (delta < 0) only if balance + reservedNegative + delta >= 0.
 */
export function canStartWithDelta(args: {
  balance: number;
  reservedNegative: number;
  delta: number;
}): boolean;
```

Implementation notes:
- Read per-building `energyDelta` from the shared catalog (`packages/shared/src/buildings.ts`) using catalogKey. No runtime mapping from legacy `type`; if upstream data lacks catalogKey, fix via a one-off migration (e.g., `packages/server/src/scripts/migrations/backfillCatalogKey.ts`).
- Reservations only count negative queued items (e.g., an upcoming lab or factory). Never pre-count queued producers.

## Adoption Requirements

### Server (authoritative feasibility)
- StructuresService.start and any other energy-gated start operations MUST call `computeEnergyBalance`.
- Producers are allowed without projection; consumers require `canStartWithDelta`.
- Maintain existing debug logs with tag `[StructuresService.start]` and include:
  - `delta, produced, consumed, balance, reservedNegative, projectedEnergy`
- Any API returning base energy stats MUST derive values via the helper.

### Client (UI display)
- Base energy panels and any projections MUST call `computeEnergyBalance` from `@game/shared`.
- Do not re-implement energy math in the client. Map local building/state into the helper’s input shape.

## Tests (packages/shared)

Create `packages/shared/src/__tests__/energyBudget.test.ts` with canonical scenarios:
1. Baseline only (+2)
2. Solar scaling (various levels and solarEnergy)
3. Gas scaling (various levels and gasYield)
4. Mixed producers/consumers using `energyDelta`
5. Queued reservations add only negative queued items
6. Projection rule edge: exactly 0 is allowed; negative fails

## End-to-End Validation

Augment `.clinerules/end-to-end-testing-protocol.md` scenarios:
- Positive projection scenario passes (`projectedEnergy >= 0`)
- Negative projection scenario fails with clear error
- Capture logs that include: `produced, consumed, balance, reservedNegative, delta, projectedEnergy`

## Change Control

Any changes to the energy model MUST:
- Update this rule
- Update `packages/shared/src/energyBudget.ts`
- Update unit tests and E2E log assertions
- Refactor all server/client sites to rely on the helper

## Success Criteria

- A single implementation in shared used by server feasibility checks and UI panels
- Identical values for Produced/Consumed/Balance across UI and server responses
- E2E tests confirm parity and verify projection gating using logs
