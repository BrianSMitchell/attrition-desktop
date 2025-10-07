## Relevant Files

- `packages/server/src/routes/game.ts` - Main game endpoints (dashboard, bases, structures, queues); add Supabase code paths for production.
- `packages/server/src/routes/universe.ts` - Universe/coord/system endpoints; Supabase reads for production.
- `packages/server/src/config/supabase.ts` - Supabase client and helpers.
- `packages/server/src/config/database.ts` - DB_TYPE switch (supabase vs mongo).
- `packages/server/src/services/economy/SupabaseEconomyService.ts` - NEW: credits/hour + accrual helpers.
- `packages/server/src/services/bases/SupabaseBaseStatsService.ts` - NEW: area/energy/population budgets from Supabase.
- `packages/server/src/services/bases/SupabaseCapacityService.ts` - NEW: construction/production/research capacities per base.
- `packages/server/src/services/structures/SupabaseStructuresService.ts` - NEW: structures list, start/cancel (validations + ETA + writes).
- `packages/server/src/services/research/SupabaseResearchService.ts` - NEW: tech_queue read/enqueue (ETA + idempotency).
- `packages/server/src/services/units/SupabaseUnitsService.ts` - NEW: unit_queue read/enqueue/cancel.
- `packages/server/src/services/defenses/SupabaseDefensesService.ts` - NEW: defense_queue read/enqueue/cancel.
- `packages/shared/src/*` - Catalog & utility functions used server-side (getBuildingsList, getBuildingSpec, getStructureCreditCostForLevel, computeEnergyBalance).
- `tests/integration/routes.*.test.ts` - Add/update integration tests to validate Supabase paths when DB_TYPE=supabase.

### Notes

- Keep response DTOs stable; clients should not change.
- Gate production logic with `getDatabaseType() === 'supabase'`; Mongo paths remain for dev.
- Use identity keys for queue idempotency where available (unique indexes exist).
- Reuse shared catalog for parity on costs/yields; avoid duplication.
- Add minimal logging around accrual and queue writes to aid debugging in production.

## Tasks

- [ ] 1.0 Economy (Dashboard) – creditsPerHour + accrual (Supabase)
- [x] 1.1 Implement creditsPerHour by summing yields of all active buildings across empire bases (Supabase `buildings`, `colonies`, `empires.territories`, shared catalog).
- [x] 1.2 Add on-read accrual in `/api/game/dashboard` (Supabase): compute delta from `empires.last_resource_update`, update `empires.credits`, store `credits_remainder_milli`, return updated values.
- [x] 1.3 Add small diagnostic logs (duration, computed deltas, old/new credits) under a debug flag.

- [ ] 2.0 Bases Summary (Supabase) – populate queues + research status
- [x] 2.1 Load bases from `empires.territories` + `colonies` and return `name`, `location`.
- [x] 2.2 Research summary: pick earliest `tech_queue` pending with `completes_at`, else earliest pending unscheduled; expose `{ name, remaining, percent }`.
  - [ ] 2.3 Production/Defense queues: count pending items per base and compute the next item `{ name, remaining, percent }` using `completes_at` (or created_at if unscheduled).

- [ ] 3.0 Base Stats & Capacities (Supabase)
  - [ ] 3.1 Base stats: area/energy/population budgets via Supabase `locations.result`, `star_applied`, aggregated active buildings.
  - [ ] 3.2 Capacities: construction/production/research per base mirroring existing server helpers with Supabase data.

- [ ] 4.0 Structures (Supabase) – list + start/cancel
  - [ ] 4.1 Structures list: `constructionPerHour`, levels per `catalog_key`, `creditsCostNext`, `activeConstruction` ETA if present.
  - [ ] 4.2 Start construction: validations (ownership, single active per base, energy parity via `computeEnergyBalance`, area, population), compute cost + `completes_at` from capacities; insert rows and deduct credits.
  - [ ] 4.3 Cancel construction: revert in-progress item at a base; no refund in v0; keep DTO stable.

- [ ] 5.0 Research (Supabase) – queues + ETA
  - [ ] 5.1 Read `tech_queue` pending/completed for the empire.
  - [ ] 5.2 Enqueue research: compute `completes_at` based on research capacity; enforce idempotency via `identity_key`.
  - [ ] 5.3 (If surfaced) read/write `research_projects`; else read-only stub that returns empty.

- [ ] 6.0 Units (Supabase)
  - [ ] 6.1 Read `unit_queue` (pending) and compute next item ETA.
  - [ ] 6.2 Enqueue/cancel units: compute `completes_at` from capacity; enforce idempotency via `identity_key`.

- [ ] 7.0 Defenses (Supabase)
  - [ ] 7.1 Read `defense_queue` (pending) and compute next item ETA.
  - [ ] 7.2 Enqueue/cancel defenses: compute `completes_at` from capacity; enforce rules; idempotency if applicable.

- [ ] 8.0 Backward Compatibility & Flags
  - [ ] 8.1 Ensure all new logic is gated by `DB_TYPE=supabase` and Mongo code remains unaffected in dev.
  - [ ] 8.2 Verify DTO compatibility with existing client props; add safe defaults for missing fields.

- [ ] 9.0 Tests & Verification
  - [ ] 9.1 Add integration tests for dashboard accrual and bases summary (Supabase path).
  - [ ] 9.2 Add tests for structures start validations (energy, area, population) with deterministic data.
  - [ ] 9.3 Add tests for research/unit/defense queues (ETA + idempotency).
  - [ ] 9.4 Manual QA checklist for production logs (TRACE/DEBUG), map navigation, bases rendering, dashboard metrics.
