# Supabase Migration Status

**Last Updated**: January 7, 2025 - 15:05 UTC

## Overview
This document tracks the progress of migrating from MongoDB to Supabase as the primary database for the Attrition game server.

## Migration Strategy
- **Dual-path approach**: Both MongoDB and Supabase services coexist
- **Runtime switching**: `getDatabaseType()` function determines which implementation to use
- **Gradual rollout**: Routes switch to Supabase implementations one by one
- **Service pattern**: Create `Supabase*Service` classes alongside existing MongoDB services

---

## ✅ Completed Services

### 1. **SupabaseEconomyService** ✓
- **File**: `packages/server/src/services/economy/SupabaseEconomyService.ts`
- **Functions**:
  - `sumCreditsPerHourForEmpire()` - Calculate total credits/hour from buildings
  - `computeResourcesGained()` - Calculate resource accrual since last update
- **Routes**: `/dashboard` (economy calculation portion)
- **Status**: ✅ Complete and in production

### 2. **SupabaseTechService** ✓
- **File**: `packages/server/src/services/tech/SupabaseTechService.ts`
- **Functions**:
  - `getStatus()` - Get tech eligibility and lab capacity
  - `start()` - Start technology research
  - `getQueue()` - List active research queue
- **Routes**: 
  - ✅ `/tech/status`
  - ✅ `/tech/start`
  - ✅ `/tech/queue`
- **Status**: ✅ Complete and in production

### 3. **SupabaseStructuresService** ✓
- **File**: `packages/server/src/services/structures/SupabaseStructuresService.ts`
- **Functions**:
  - `getStatus()` - Get building eligibility
  - `start()` - Start building construction/upgrade
  - `getQueue()` - List construction queue
  - `cancel()` - Cancel construction with credit refund
- **Routes**: 
  - ✅ `/structures/status`
  - ✅ `/structures/start`
  - ✅ `/structures/queue`
  - ✅ `/structures/cancel/:coord`
- **Status**: ✅ Complete and in production

### 4. **SupabaseDefensesService** ✓
- **File**: `packages/server/src/services/defenses/SupabaseDefensesService.ts`
- **Functions**:
  - `getStatus()` - Get defense eligibility
  - `start()` - Start defense construction
- **Routes**: 
  - ✅ `/defenses/status`
  - ✅ `/defenses/start`
  - ✅ `/defenses/queue`
  - ✅ `/defenses/queue/:id` (DELETE)
- **Status**: ✅ Complete and in production

### 5. **SupabaseUnitsService** ✓
- **File**: `packages/server/src/services/units/SupabaseUnitsService.ts`
- **Functions**:
  - `getStatus()` - Get unit eligibility
  - `start()` - Start unit production
  - `getQueue()` - List active production queue
- **Routes**: 
  - ✅ `/units/status`
  - ✅ `/units/start`
  - ✅ `/units/queue`
  - ✅ `/units/queue/:id` (DELETE)
- **Status**: ✅ Complete and in production

### 6. **SupabaseFleetMovementService** ✓
- **File**: `packages/server/src/services/fleets/SupabaseFleetMovementService.ts`
- **Functions**:
  - `moveFleet()` - Initiate fleet movement
  - `resolveArrival()` - Handle fleet arrival
- **Routes**: Not yet integrated
- **Status**: ✅ Service implemented, routes need integration

### 7. **SupabaseResourceService** ✓
- **File**: `packages/server/src/services/resources/SupabaseResourceService.ts`
- **Functions**:
  - `accrueResources()` - Update empire resources based on time passed
- **Routes**: Used in `/dashboard`
- **Status**: ✅ Complete and in production

### 8. **SupabaseCapacityService** ✓
- **File**: `packages/server/src/services/bases/SupabaseCapacityService.ts`
- **Functions**:
  - `getBaseCapacities()` - Calculate all capacity types for a base
  - `getBaseLabCapacity()` - Get research lab capacity
  - `getBaseCitizenCapacity()` - Get citizen worker capacity
  - `getBaseHangarCapacity()` - Get fleet hangar capacity
- **Routes**: Used by other services
- **Status**: ✅ Complete

### 9. **SupabaseBaseCitizenService** ✓
- **File**: `packages/server/src/services/bases/SupabaseBaseCitizenService.ts`
- **Functions**:
  - `calculateCitizenCapacity()` - Calculate citizen capacity from buildings
- **Routes**: Used by SupabaseCapacityService
- **Status**: ✅ Complete

### 10. **SupabaseBaseStatsService** ✓
- **File**: `packages/server/src/services/bases/SupabaseBaseStatsService.ts`
- **Functions**:
  - `getBaseStats()` - Get comprehensive base statistics
- **Routes**: Not yet integrated
- **Status**: ✅ Service implemented

### 11. **SupabaseCompletionService** ✓
- **File**: `packages/server/src/services/supabaseCompletionService.ts`
- **Functions**:
  - `completeTechQueue()` - Process completed tech research
  - `completeUnitQueue()` - Process completed unit production
  - `completeDefenseQueue()` - Process completed defense construction
- **Used By**: Game loop service
- **Status**: ✅ Complete and integrated

---

## 🚧 Partially Integrated Routes

### Tech Routes
- ✅ `/tech/catalog` - Using shared game data
- ✅ `/tech/status` - **Supabase active**
- ✅ `/tech/start` - **Supabase active**
- ✅ `/tech/queue` - **Supabase active**
- ❌ `/tech/queue/:id` (DELETE) - Still MongoDB only

### Structures Routes
- ✅ `/structures/catalog` - Using shared game data
- ✅ `/structures/status` - **Supabase active**
- ✅ `/structures/start` - **Supabase active**
- ✅ `/structures/queue` - **Supabase active**
- ✅ `/structures/cancel/:coord` - **Supabase active**

### Defense Routes
- ✅ `/defenses/catalog` - Using shared game data
- ✅ `/defenses/status` - **Supabase active**
- ✅ `/defenses/queue` - **Supabase active**
- ✅ `/defenses/start` - **Supabase active**
- ✅ `/defenses/queue/:id` (DELETE) - **Supabase active**

---

## ❌ Not Yet Started

### Services Needed

#### 1. Fleet Management
#### 2. Fleet Management
- **Missing routes**:
  - `/fleets` (list fleets)
  - `/fleets/:id` (get fleet details)
  - `/fleets/:id/move` (initiate movement)
  - `/fleets/:id/merge` (merge fleets)
  - `/fleets/:id/split` (split fleet)

#### 2. Combat System
- **Not started**: No Supabase implementation yet
- **Needed**: Combat resolution, damage calculation, fleet battles

#### 3. Empire Management
- **Partially done**: Dashboard uses Supabase
- **Missing**:
  - Empire settings updates
  - Empire deletion/reset
  - Empire statistics aggregation

#### 4. Leaderboard
- **Not started**: `/leaderboard` still MongoDB only
- **Needs**: Aggregate queries for rankings

#### 5. Credit Ledger
- **Not started**: Transaction logging still MongoDB
- **File**: `packages/server/src/services/creditLedgerService.ts`
- **Needs**: Supabase implementation

---

## 🎯 Next Priority Tasks

### High Priority (Block Core Features)
1. ✅ **Fix TypeScript build error** - COMPLETED 1/7/2025
2. ✅ **Integrate SupabaseDefensesService routes** - COMPLETED 1/7/2025
   - ✅ Wire up `/defenses/start`
   - ✅ Implement `/defenses/status` properly
   - ✅ Add `/defenses/queue`
   - ✅ Add `/defenses/queue/:id` DELETE

3. ✅ **Integrate SupabaseUnitsService routes** - COMPLETED 1/7/2025
   - ✅ Wire up `/units/start`
   - ✅ Add `/units/status`
   - ✅ Add `/units/queue`
   - ✅ Add `/units/queue/:id` DELETE

4. ✅ **Complete structure queue management** - COMPLETED 1/7/2025
   - ✅ Add `getQueue()` to SupabaseStructuresService
   - ✅ Add `cancel()` to SupabaseStructuresService
   - ✅ Wire up routes

### Medium Priority
1. **Fleet management routes**
   - Create fleet listing endpoint
   - Create fleet details endpoint
   - Integrate fleet movement service

2. **Tech queue cancellation**
   - Add Supabase path to `/tech/queue/:id` DELETE

### Lower Priority
3. **Combat system**
4. **Leaderboard Supabase queries**
5. **Credit ledger migration**

---

## Database Schema Status

### ✅ Supabase Tables Created
- `users`
- `empires`
- `locations`
- `colonies`
- `buildings`
- `tech_levels`
- `tech_queue`
- `unit_queue`
- `defense_queue`
- `fleets`
- `fleet_movements`

### ⚠️ Schema Gaps
- No `credit_transactions` table yet (using MongoDB)
- No `combat_reports` table yet
- May need additional indexes for performance

---

## Testing Status

### ✅ Tested Routes
- `/dashboard` - Working with Supabase
- `/tech/status` - Working
- `/tech/start` - Working
- `/tech/queue` - Working
- `/structures/start` - Fixed and deployed

### ⚠️ Needs Testing
- Defense routes (all integrated, need testing)
- Unit routes (all integrated, need testing)
- Fleet routes once created
- Queue cancellation flows

---

## Performance Considerations

### Optimizations Applied
- Batch queries where possible
- Use `.select()` to limit returned columns
- Index on common query fields (`empire_id`, `location_coord`, `status`)

### Known Issues
- Multiple sequential queries in some services (could be batched)
- No caching layer yet
- Real-time subscriptions not utilized

---

## Rollback Plan

If critical issues occur:
1. Set `DATABASE_TYPE=mongodb` in environment
2. Server automatically falls back to MongoDB for all routes
3. Supabase data persists for later retry

---

## Migration Completion Estimate

- **Services**: ~90% complete
- **Routes**: ~80% integrated
- **Testing**: ~40% complete
- **Overall Progress**: ~75% complete

**Estimated completion**: 1 week with current velocity

---

## Key Learnings

1. **Type safety**: Supabase client needs careful null handling
2. **Transaction atomicity**: Must handle credit deductions carefully
3. **Queue management**: Completion service is critical for game loop
4. **Error handling**: Need consistent error response format
5. **Performance**: Fewer round-trips than MongoDB in some cases

---

## Contributing

When adding new Supabase services:
1. Create `Supabase*Service.ts` in appropriate directory
2. Match MongoDB service interface where possible
3. Use consistent error response format
4. Add route integration with `getDatabaseType()` check
5. Update this document with progress
