# Legacy Code Removal Plan (Revised 2025-08-30)

This document tracks the staged removal of legacy building code and the migration toward a catalogKey- and capacity-driven architecture, while protecting currently-used UI flows.

## Executive Summary (This Pass)

- Removed: packages/client/src/components/game/BuildingModal.tsx (dead UI surface; wiring removed from ModalManager and modal types).
- Retained for now (still used by Base views): 
  - packages/client/src/services/buildingsService.ts
  - Server route GET /game/buildings/location/:coord (in packages/server/src/routes/game.ts)
- Retained for now (server legacy pieces used by loop/other services, pending refactor):
  - packages/server/src/services/buildingService.ts
  - packages/server/src/models/Building.ts
- Server request validation and energy logging are in place for StructuresService.start; INVALID_REQUEST test added and passing.

Rationale: Base views still depend on the legacy buildings list route/service for display. Immediate removal would break UI. These will be replaced in a follow-up refactor with modern structures/base-stats endpoints.

---

## Systems Overview

### Legacy System (to be sunset, but partially retained temporarily)
- Files (legacy path): buildingService.ts, resourceService.ts (legacy portions), Building.ts model
- Semantics:
  - Legacy building types (e.g., metal_mine, energy_plant, etc.)
  - Multi-resource economy (metal/energy/research)
  - Fixed construction times hardcoded in service

### Current System (active, authoritative)
- Files: structuresService.ts, economyService.ts, capacityService.ts
- Semantics:
  - Credits-only economy; energy derived from planet context
  - Construction time computed from capacities (packages/shared/src/capacities.ts)
  - Catalog-driven identifiers (catalogKey from @game/shared)

---

## What Changed In This Pass

### Removed Now
1) packages/client/src/components/game/BuildingModal.tsx
   - Removed from disk
   - ModalManager and modal type wiring removed earlier
   - Client build verified clean

### Retained (Deferred Removal)
These must remain until UI is migrated off legacy building lists:

- Client:
  - packages/client/src/services/buildingsService.ts

- Server:
  - GET /game/buildings/location/:coord (packages/server/src/routes/game.ts)
  - packages/server/src/services/buildingService.ts
  - packages/server/src/models/Building.ts

Note: resourceService.ts legacy methods remain; credits-related helpers stay in use.

---

## Planned Follow-up (Future Refactor, Not In This Pass)

Replace Base views’ reliance on buildingsService/legacy route with modern endpoints:
- Structures status endpoints (per-base)
- BaseStats header and table computation APIs
- After migration, retire:
  - packages/client/src/services/buildingsService.ts
  - GET /game/buildings/location/:coord
  - buildingService.ts and Building.ts model, where no longer needed

---

## CatalogKey Source-of-Truth Adoption

Authoritative rule: .clinerules/catalog-key-source-of-truth.md

### Completed
- BaseStatsService
  - Reads only b.catalogKey; skips entries missing catalogKey with a temporary diagnostic
  - Diagnostic: [BaseStatsService] skip: missing catalogKey _id=<id>

- StructuresService.start
  - Request validation requires catalogKey
  - On missing, returns:
    {
      "success": false,
      "code": "INVALID_REQUEST",
      "message": "catalogKey is required",
      "details": { "field": "catalogKey" }
    }
  - Energy feasibility logs standardized:
    [StructuresService.start] key={buildingKey} delta={delta} produced={produced} consumed={consumed} balance={balance} reserved={reservedNegative} projectedEnergy={projectedEnergy}
  - Test coverage added (passing):
    - packages/server/src/__tests__/structuresService.invalid_request.test.ts

### In Progress / Audits
- economyService.ts
  - Remove any type→key fallbacks; operate solely on catalogKey

- capacityService.ts
  - Audit references to legacy type; ensure no inference occurs

- Additional start endpoints (defenses/units/tech)
  - Ensure INVALID_REQUEST on missing catalogKey and standard logging where applicable

---

## Route and Component Status

### Routes (server)
- Keep (still used): GET /game/buildings/location/:coord
- Other legacy buildings endpoints: do not reintroduce; only remove further once UI is migrated.

### Frontend
- Removed: BuildingModal.tsx
- Retained (still used by Base views): buildingsService.ts and screens that call it (BaseDetail/BaseManagement/BasePage)

---

## Safe Removal Phasing

1) Verify Current System (done)
   - Capacity-based structures system works
   - Credits-only economy intact
   - Client build passes post-removal of BuildingModal

2) Defer Legacy Removal (in this pass)
   - Keep buildingsService.ts and GET /game/buildings/location/:coord
   - Keep Building model/service until no longer referenced

3) Migration (future task)
   - Update Base views to consume structures and base-stats endpoints
   - Remove buildingsService.ts and GET route
   - Remove buildingService.ts and Building.ts model

4) Verification (post-migration)
   - Full user-journey tests
   - Structures/build tables and energy gating still correct
   - Game loop unaffected

---

## Risk Assessment

Moderate risk if removals are premature (UI relies on legacy buildings list). This pass minimizes risk by only removing truly dead UI (BuildingModal) and keeping the endpoints/services that Base views still need, while strengthening server-side request validation and logging.

---

## Verification Commands

```bash
# Build shared + client to ensure types and UI still compile after removals
pnpm --filter @game/shared build
pnpm --filter @game/client build

# Server tests (includes INVALID_REQUEST test)
pnpm --filter @game/server test
```

Optional hygiene checks:
```bash
# Ensure no stale imports for the removed BuildingModal
git grep "BuildingModal" -- packages/

# Confirm required legacy pieces still present (until refactor)
git grep "buildingsService" -- packages/client/src
git grep "GET /game/buildings/location" -- packages/server/src/routes
```

---

## Appendix: Historical (Original Plan vs Revised)

Original plan proposed complete removal of:
- buildingService.ts, Building.ts, buildingsService.ts
- a set of legacy /buildings routes

Revised plan defers the buildingsService.ts and GET /game/buildings/location/:coord removal (and keeps Building model/service temporarily), to avoid breaking Base views. BuildingModal.tsx is removed now since it is fully unused. Server-side request validation and energy feasibility logging for StructuresService.start are now complete and covered by tests.
