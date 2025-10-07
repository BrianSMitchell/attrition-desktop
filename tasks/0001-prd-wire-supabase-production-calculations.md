# PRD: Wire All Production Calculations to Supabase (Phase 1)

## 1. Introduction / Overview
Production currently renders most pages but several metrics and lists are still stubbed or reading from legacy MongoDB Atlas code paths. This PRD specifies Phase 1 of switching the production calculation layer to Supabase while keeping MongoDB for local development. The goal is to compute economy rates, queues, capacities, and base views from Supabase tables and return responses with the same shapes that the client already consumes.

Scope follows the agreed priority order: Economy (credits/hour + accrual) → Bases summary (queues + research) → Structures (start/cancel) → Research queue → Units → Defenses.

## 2. Goals
1. Dashboard creditsPerHour computed from Supabase buildings and shown to the user.
2. On‑read accrual of credits using empires.last_resource_update + credits_remainder_milli.
3. Bases page shows real bases from empires.territories/colonies plus real queued research/production/defense.
4. Structures list and start/cancel operate on Supabase data with parity validations (energy/area/population).
5. Research, unit, and defense queues read/write on Supabase with idempotency and ETA calculation.
6. All production (DB_TYPE=supabase) endpoints stop depending on MongoDB Atlas, while dev (DB_TYPE=mongo) remains intact.

## 3. User Stories
- As a new player in production, I want to see my true economy rate and growing credits so progress feels real.
- As a player, I want the Bases page to show my actual colonies and what’s currently queued or researching.
- As a builder, I want to start/cancel a structure and see ETA and energy/area/population validations enforced consistently.
- As a researcher, I want research to schedule with a visible completion time and appear in summaries.
- As a commander, I want unit/defense queues to operate and list the real in‑progress items from Supabase.

## 4. Functional Requirements
FR1. Economy (Dashboard)
1.1 creditsPerHour is computed by summing catalog yields of all active buildings across all bases (Supabase buildings table; catalog from @game/shared getBuildingsList).
1.2 On read of /api/game/dashboard (supabase), perform accrual:
- Compute elapsed milliseconds since empires.last_resource_update.
- Convert to fractional credits using creditsPerHour (credits/hour).
- Add to empires.credits; store fractional remainder in empires.credits_remainder_milli; update last_resource_update.
- Return updated credits and creditsPerHour.

FR2. Bases Summary (Supabase)
2.1 /api/game/bases/summary must return real bases from empires.territories and colonies.name; if no colony row, default to "Base <coord>".
2.2 Include research summary: earliest pending scheduled research (tech_queue status=pending with completes_at), else earliest pending unscheduled.
2.3 Include production/defense queued counts and "next" item ETA where available (unit_queue/defense_queue status=pending; earliest completes_at or oldest created_at when unscheduled).

FR3. Base Stats & Capacities
3.1 /api/game/base-stats/:coord returns area, energy, population budgets using Supabase data:
- Location result (solar/gas/crystals) from locations.result and star_applied.
- Buildings aggregated levels per catalog_key; active=true or pendingUpgrade=true count toward current level where applicable.
3.2 /api/game/capacities/:coord computes construction/production/research per base via the same rules used on the client (mirror existing server helpers) and Supabase reads.

FR4. Structures (List + Start/Cancel)
4.1 /api/game/bases/:coord/structures returns:
- constructionPerHour (from capacities)
- items[] with currentLevel, nextLevel, creditsCostNext (from cost tables: getStructureCreditCostForLevel; fallback to spec.creditsCost for level 1)
- activeConstruction (if one queued with future completes_at)
4.2 Start (POST /bases/:coord/structures/:key/construct):
- Validations: ownership, single active construction per base (no overlapping), energy parity (computeEnergyBalance), area, population.
- Compute cost and ETA from credits/hour capacity.
- Deduct credits and insert/build Supabase rows accordingly (see Integration section).
4.3 Cancel (DELETE /bases/:coord/structures/cancel):
- Revert queued construction for this base; no refund in v0.

FR5. Research
5.1 Read tech_queue for pending/completed items.
5.2 If research_projects are surfaced by UI, support read/write for those rows; otherwise leave as read-only for now.
5.3 Server computes completes_at on enqueue using capacities (research per hour) and known costs.

FR6. Units & Defenses
6.1 unit_queue and defense_queue endpoints: list pending items and show earliest next item with ETA.
6.2 start/cancel endpoints compute completes_at on enqueue, enforce single-queue rules if applicable, validate budgets/energy where needed.
6.3 Identity/idempotency: enforce uniqueness via identity_key unique index for pending items.

FR7. Backward Compatibility
7.1 When DB_TYPE=supabase, use the Supabase code paths; when DB_TYPE=mongo, use existing Mongo paths.
7.2 Response shapes must remain compatible with existing clients.

## 5. Non‑Goals (Out of Scope)
- No fleet features in this phase.
- No battle/combat or PvP.
- No leaderboards or XP overhaul.
- No background accrual job (Phase 2 candidate).

## 6. Design Considerations
- Maintain shared DTO shapes for dashboard, bases, and structures; do not break client rendering.
- Use @game/shared catalog helpers for parity in costs and energy deltas (getBuildingsList, getStructureCreditCostForLevel, getBuildingSpec, computeEnergyBalance).
- Keep single active construction per base invariant (current v0 model).
- Use Supabase count: 'exact', head: true for fast counts when payload isn’t needed.

## 7. Technical Considerations
Tables used (Supabase):
- empires(id, user_id, name, territories[], credits, energy, last_resource_update, credits_remainder_milli, …)
- users(id, username, empire_id, starting_coordinate, …)
- locations(coord PK unique, type, owner_id, orbit_position, terrain JSONB, position_base JSONB, star_applied JSONB, result JSONB, star_overhaul JSONB)
- colonies(id, empire_id, location_coord, name)
- buildings(id, empire_id, location_coord, catalog_key, level, is_active, pending_upgrade, construction_started, construction_completed, credits_cost)
- tech_queue(id, empire_id, location_coord, tech_key, level, status, started_at, completes_at, identity_key, …)
- research_projects(id, empire_id, type, name, research_cost, research_progress, is_completed, …) [if surfaced]
- unit_queue(id, empire_id, location_coord, unit_key, status, started_at, completes_at, identity_key, …)
- defense_queue(id, empire_id, location_coord, defense_key, status, started_at, completes_at)

Idempotency:
- tech_queue: uniq_tech_queue_identity (WHERE status='pending')
- unit_queue: uniq_unit_queue_identity (WHERE status='pending')

Accrual math:
- creditsPerHour: SUM(active buildings yield) across all bases.
- deltaMillis = now - empires.last_resource_update.
- deltaCreditsFloat = creditsPerHour * (deltaMillis / 3600000).
- intPart = floor(deltaCreditsFloat + remainderFromMilli/3600000 * creditsPerHour); remainderMilli = (deltaMillis + previousRemainder) % 3600000 proxy stored as credits_remainder_milli.

## 8. Success Metrics
- Dashboard shows stable, non‑mock creditsPerHour; credits increment on refresh without server errors.
- Bases page lists player bases and shows real queues/research (non-empty for starter base).
- Structures start/cancel works, enforcing energy/area/population limits consistently.
- Research, unit, defense queues iterate from Supabase with valid completes_at values.
- Zero references to MongoDB Atlas code paths when DB_TYPE=supabase.

## 9. Open Questions
- Do we need colony naming rules when multiple colonies exist at a base, or is one colony per base guaranteed in Phase 1?
- For research_projects, which UI flows are currently active in production (or should we restrict to queue only)?
- Should we add a feature flag to disable auto‑bootstrap of empires on first dashboard hit, now that backfill exists?

---

## Relevant Files
- `packages/server/src/routes/game.ts` – Supabase implementations for dashboard, bases, base-stats, capacities, structures.
- `packages/server/src/routes/universe.ts` – Supabase map/coord/system endpoints.
- `packages/server/src/services/*` – Where capacity/economy helpers are reused or ported.
- `packages/shared/src/*` – Catalog and utility functions (costs, energy deltas).
- `packages/server/src/config/database.ts` – DB_TYPE switch remains authoritative.
- `packages/server/src/config/supabase.ts` – Single Supabase client and helpers.

### Notes
- Mongo code remains for development (Docker) and is not removed.
- We will gate all new production logic on `getDatabaseType() === 'supabase'`.
