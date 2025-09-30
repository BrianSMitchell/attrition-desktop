# Structures Construction Queue — Full Decommission Plan (Clean Slate)

Date: 2025-09-11
Author: Cline Dev
Status: Approved for execution (strict removal)

## Summary

We will fully remove the Structures construction queue system from both server and client to reach a clean baseline. This eliminates queue endpoints, models, processors, UI panels, and tests. The Structures tab will become read-only (no Start, no ETA), and Bases Summary will report `construction.queued = 0` with no "next" item until a future replacement system is designed and implemented.

This plan follows Baby Steps methodology with incremental, validated changes and documents any temporary DTO behavior.

## Goals

- Remove Structures queue feature code and data flows:
  - Server: routes, service, model, game loop processor
  - Client: queue UI panel, start actions, service methods
  - Tests and docs related to Structures queue
- Leave the game in a stable, buildable, testable state
- Preserve non-structure queues (Tech, Units)
- Maintain a read-only Structures view for players (catalog and current levels only)
- Keep API surface coherent; document all changes

## Non‑Goals

- Do not remove Technology or Units queue systems
- Do not ship a replacement construction system in this pass
- Do not modify economic/energy/capacity models beyond removing construction queue dependencies

## Scope — What Will Be Removed

- Server
  - Endpoints:
    - `POST /api/game/structures/start`
    - `GET /api/game/structures/status`
    - `GET /api/game/structures/queue`
    - `DELETE /api/game/structures/queue/:id`
  - Implementation:
    - `packages/server/src/models/StructuresQueue.ts`
    - `packages/server/src/services/structuresQueueService.ts`
    - `packages/server/src/services/structuresQueueProcessor.ts`
  - Game loop:
    - All imports/calls to `StructuresQueueProcessor.activatePendingStructures()` and `.processStructuresQueue()` in `gameLoopService.ts`
  - Fix scripts:
    - `packages/server/fix-queue.ts`, `packages/server/fix-queue.js` (if only used for structures queue)
- Client
  - UI:
    - `packages/client/src/components/game/StructuresQueuePanel.tsx`
    - Start buttons and queue visibility in Structures tab (e.g., in `BaseDetail.tsx`)
  - Service methods:
    - In `packages/client/src/services/structuresService.ts`: remove `start`, `getQueue`, `cancelQueueItem`, `getStatus`
    - Keep `getCatalog()` for read-only display if still needed
- Tests & Docs
  - Integration/E2E tests hitting removed endpoints (e.g., `tests/integration/routes.structures.queue.cancel.refund.test.ts`)
  - `docs/structures-queue-refactor.md` (move to legacy or delete)

## Temporary DTO/Behavior Notes

- `GET /api/game/bases/summary`
  - Maintain shape but set `construction.queued: 0`
  - Omit `construction.next` (or set `undefined`)
- `GET /api/game/bases/:coord/structures`
  - Provide catalog w/ current levels only
  - Remove `canStart`, `etaMinutes`, and any fields that implied queue capability
- Client Structures tab
  - Read-only. Show message like: “Construction is currently disabled while the system is being rebuilt.”

## Risks and Mitigations

- Client references to removed service methods → build errors
  - Mitigation: Remove references first; compile after each change
- E2E/Integration tests expecting queue endpoints → failures
  - Mitigation: Remove/skip affected tests in the same change step
- Game loop references to queue processor → runtime errors
  - Mitigation: Remove imports/uses in `gameLoopService.ts`, compile and smoke‑test

## Detailed Execution Plan (Baby Steps)

Each step is atomic; build and smoke-test after each. Commit per step.

### Step 0 — Documentation (this file)
- Add this plan to `docs/overhaul/structures-queue-removal-plan.md`
- Share with team; get approval (done)

### Step 1 — Client Freeze (disable UI pathways)
- Remove all usage of `StructuresQueuePanel` in UI (e.g., `BaseDetail.tsx`)
- Remove Start actions that call `structuresService.start(...)`
- Replace with read-only messaging in Structures tab
- In `structuresService.ts`:
  - Remove `start`, `getQueue`, `cancelQueueItem`, `getStatus` exports and call sites
  - Keep `getCatalog()` only if still referenced (otherwise remove file and fix imports)
- Build client and fix any references

### Step 2 — Server Routes Removal
- In `packages/server/src/routes/game.ts`:
  - Remove imports for `StructuresQueue`, `StructuresQueueService`
  - Remove handlers for:
    - `/structures/status`
    - `/structures/start`
    - `/structures/queue` (GET, DELETE)
  - In `/bases/summary`:
    - Remove inactive-building queue aggregation (legacy “queued” via `Building.isActive=false`)
    - Return `construction: { queued: 0 }` and omit `next`
- Build server; ensure routes compile and app starts

### Step 3 — Server Implementation Cleanup
- Delete:
  - `packages/server/src/models/StructuresQueue.ts`
  - `packages/server/src/services/structuresQueueService.ts`
  - `packages/server/src/services/structuresQueueProcessor.ts`
- Update `packages/server/src/services/gameLoopService.ts`:
  - Remove import of `StructuresQueueProcessor`
  - Remove calls to `activatePendingStructures()` and `processStructuresQueue()`
  - Optional: also remove legacy `BuildingService.completeDueConstructions()` to ensure no timed construction remains
- Build server; smoke-test loop startup

### Step 4 — Tests and Docs
- Remove tests targeting structures queue endpoints:
  - e.g., `tests/integration/routes.structures.queue.cancel.refund.test.ts`
- Update any E2E/integration specs that depended on queue visibility or actions
- Move `docs/structures-queue-refactor.md` to `docs/legacy/structures-queue-refactor.md` or delete it
- Run unit/integration suites; update snapshots/expectations as needed

### Step 5 — Database Hygiene (Optional but Recommended)
- Add a one-off script:
  - `packages/server/src/scripts/purgeStructuresQueue.ts`:
    - Connect to DB
    - `deleteMany({})` on the `StructuresQueue` collection
    - Log deleted count, guard behind environment confirmation (e.g., `CONFIRM_PURGE=1`)
- Coordinate execution out-of-band (do not run automatically in app)

### Step 6 — Smoke Test and Validation
- Launch server and client
- Validate:
  - No client calls to `/game/structures/*` other than catalog (if retained)
  - Structures tab is read-only with a clear message
  - `/game/bases/summary` returns `construction.queued: 0` and no `next`
  - Game loop logs show no structures queue activity
- Confirm no test failures relating to removed endpoints

## API Changes (Summary)

Removed:
- `POST /api/game/structures/start`
- `GET /api/game/structures/status`
- `GET /api/game/structures/queue`
- `DELETE /api/game/structures/queue/:id`

Retained (read-only):
- `GET /api/game/structures/catalog` (optional; can be removed later if unused)
- `GET /api/game/bases/:coord/structures` (adjust to read-only view; remove queue-related fields)

Adjusted:
- `GET /api/game/bases/summary`
  - `construction.queued = 0`
  - `construction.next` omitted

## Client Changes (Summary)

- Remove `StructuresQueuePanel` and any imports/usages
- Remove Start actions and any queue controls
- `structuresService.ts` stripped down to `getCatalog()` only (or removed fully if not used)
- Structures tab: read‑only with explanatory banner

## Future Replacement Options (Post‑Cleanup)

The following are options for a new construction system to design later:

1) Instant Build MVP
- If credits available, apply building instantly (create/upgrade Building)
- No timers, no queues
- Clear, simple UX and server semantics

2) Capacity‑Driven Construction (reimagined)
- Single source‑of‑truth helper for ETA (shared lib)
- Idempotent, minimal DTO with canonical logs
- Optional background activation only if strictly necessary

Regardless of approach, align with:
- `.clinerules/capacity-parity.md` for ETA parity (if timers exist)
- `.clinerules/dto-error-schema-and-logging.md` for canonical responses/logs
- `.clinerules/catalog-key-source-of-truth.md` to require `catalogKey` in requests

## Revert Plan

If we need to revert the removal:
- Restore model/service/processor files from VCS history
- Re-add routes and client UI panel
- Re-enable game loop processor calls
- Re-run tests that were removed
- Confirm end‑to‑end functionality

## Tracking Checklist

- [ ] Step 0: This doc committed
- [ ] Step 1: Client freeze (remove UI panel and start calls)
- [ ] Step 1: Build client without errors
- [ ] Step 2: Remove server routes and legacy queued building aggregation
- [ ] Step 2: Build server without errors
- [ ] Step 3: Delete queue impl and strip game loop references
- [ ] Step 3: Build server; smoke test
- [ ] Step 4: Remove tests/docs; update remaining specs
- [ ] Step 5: Add purge script (optional); do not run automatically
- [ ] Step 6: End‑to‑end smoke test; confirm no queue traffic or references

## Architecture Diagram (Before → After)

```mermaid
flowchart LR
  subgraph Before (Queue-based)
    UI[StructuresQueuePanel] -->|/structures/queue| API[game.ts routes]
    UI -->|/structures/start| API
    API --> Svc[StructuresQueueService]
    Svc --> MQ[(StructuresQueue Model)]
    Loop[GameLoopService] --> Proc[StructuresQueueProcessor]
    Proc --> MQ
  end

  subgraph After (Read-only)
    UIRO[Structures tab (read-only)] -->|/structures/catalog| API2[game.ts routes]
    API2 -.->|no queue endpoints| X1
    Loop -.->|no queue processing| X2
    Summary[Base Summary] -->|construction.queued=0| Client
  end
```

## Notes

- This decommission intentionally leaves unit/tech queue systems intact.
- Any temporary mismatch with `.clinerules/base-events-summary.md` is documented here and should be reconciled in the future replacement.
- All changes will be performed in small commits with incremental validation.
