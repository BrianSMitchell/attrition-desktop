# Supabase Migration Audit

**Date:** October 7, 2025  
**Status:** In Progress  
**Database:** Production uses Supabase, but many services still MongoDB-only

## Executive Summary

This audit identifies all server-side code that currently uses MongoDB models and needs Supabase support for production deployment. The codebase uses a dual-database approach where:
- ✅ Some services have both MongoDB and Supabase implementations
- ⚠️ Many critical services are MongoDB-only
- ❌ The game loop and core mechanics need Supabase support

---

## ✅ Already Migrated to Supabase

### Core Services with Supabase Support
1. **BuildingService** - `buildingService.ts`
   - ✅ `completeDueConstructions()` - Has Supabase support
   
2. **SupabaseCompletionService** (New) - `supabaseCompletionService.ts`
   - ✅ `completeTechQueue()` - Supabase-only
   - ✅ `completeUnitQueue()` - Supabase-only
   - ✅ `completeDefenseQueue()` - Supabase-only

3. **HybridGameLoopService** - `hybridGameLoopService.ts`
   - ✅ Routes completion logic to Supabase when detected
   - ⚠️ Resource updates still MongoDB-only

4. **Base Stats** - `bases/SupabaseBaseStatsService.ts`
   - ✅ `getBaseStats()` - Supabase-only

5. **Capacity** - `bases/SupabaseCapacityService.ts`
   - ✅ `getBaseCapacities()` - Supabase-only

6. **Tech** - `tech/SupabaseTechService.ts`
   - ✅ `getTechLevels()` - Supabase-only
   - ✅ `getQueue()` - Supabase-only
   - ✅ `start()` - Supabase-only

7. **Units** - `units/SupabaseUnitsService.ts`
   - ✅ `getQueue()` - Supabase-only
   - ✅ `start()` - Supabase-only

8. **Economy** - `economy/SupabaseEconomyService.ts`
   - ✅ Supabase implementation exists

9. **Auth** - `authSupabase.ts`
   - ✅ Full Supabase implementation

10. **Routes** - Various route files
    - ✅ Most routes check `getDatabaseType()` and route appropriately

---

## ⚠️ CRITICAL: High Priority Migration Needed

These services are actively used in production but are MongoDB-only:

### 1. **ResourceService** - `resourceService.ts` 🔥 CRITICAL
**Status:** MongoDB-only  
**Impact:** Credits, resources not updating in production  
**Used by:** Game loop (every 60 seconds)  

**Methods needing Supabase:**
- `updateEmpireResources(empireId)` - Updates resource accumulation
- `updateEmpireCreditsAligned(empireId)` - Credit payouts
- Both called from `hybridGameLoopService.ts` line 182-183

**Current MongoDB Usage:**
```typescript
const empire = await Empire.findById(empireId);
// ... resource calculations ...
await empire.save();
```

### 2. **FleetMovementService** - `fleetMovementService.ts` 🔥 CRITICAL
**Status:** MongoDB-only  
**Impact:** Fleet movement broken in production  
**Used by:** Game loop, user actions  

**Methods needing Supabase:**
- `processArrivals()` - Complete fleet movements
- `moveFleet()` - Initiate fleet movements
- All fleet management operations

**Current MongoDB Usage:**
```typescript
const fleet = await Fleet.findById(fleetId);
const movement = await FleetMovement.find({...});
```

### 3. **BaseCitizenService** - `baseCitizenService.ts` ⚠️ HIGH
**Status:** MongoDB-only  
**Impact:** Citizen/population calculations incorrect  
**Used by:** Game loop (every 60 seconds)

**Methods needing Supabase:**
- `updateEmpireBases(empireId)` - Updates citizen counts per base
- Called from `hybridGameLoopService.ts` line 186

### 4. **CapacityService** - `capacityService.ts` ⚠️ HIGH
**Status:** MongoDB-only (has Supabase alternative)  
**Impact:** Capacity calculations may be inconsistent  

**Note:** `SupabaseCapacityService` exists but `CapacityService` is still used in some places

### 5. **TechService** - `techService.ts` ⚠️ HIGH  
**Status:** MongoDB-only (has Supabase alternative)  
**Impact:** Some tech operations may fail  

**Note:** `SupabaseTechService` exists but old service still referenced

---

## ⚠️ MEDIUM Priority: Supporting Services

### 6. **StructuresService** - `structuresService.ts`
**Status:** MongoDB-only  
**Impact:** Building operations through old API endpoints  

**Methods needing Supabase:**
- `startConstruction()` - Start building construction
- `cancelConstruction()` - Cancel building
- `upgradeBuilding()` - Upgrade existing building
- Various query methods

### 7. **UnitsService** - `unitsService.ts`
**Status:** MongoDB-only (has Supabase alternative)  
**Impact:** Unit operations through old API  

**Note:** `SupabaseUnitsService` exists

### 8. **DefensesService** - `defensesService.ts`
**Status:** MongoDB-only  
**Impact:** Defense operations may fail  

**Methods needing Supabase:**
- `startDefense()` - Start defense construction
- `cancelDefense()` - Cancel defense
- Various query methods

### 9. **EmpireEconomyService** - `empireEconomyService.ts`
**Status:** MongoDB-only  
**Impact:** Economy calculations may be inconsistent  

**Methods needing Supabase:**
- `getEmpireEconomy()` - Calculate empire-wide economy

### 10. **CreditLedgerService** - `creditLedgerService.ts`
**Status:** MongoDB-only  
**Impact:** Credit history tracking broken  

---

## 📊 Lower Priority: Supporting Features

### Admin & Debugging Tools (MongoDB-only)
These are development/admin tools that can remain MongoDB-only for now:
- Scripts in `scripts/` folder (diagnostics, migrations, utilities)
- Test frameworks in `test-utils/`
- Admin routes
- Security monitoring

### Routes Needing Supabase Checks
Some routes in `routes/game.ts` still directly use MongoDB models without checking database type:
- Line 301, 439, 463, 487, etc. - Various game operations
- Need to add `getDatabaseType()` checks and route to appropriate service

---

## 📋 Migration Priority Matrix

| Priority | Service | Impact | Complexity | Lines |
|----------|---------|--------|------------|-------|
| 🔥 P0 | ResourceService | CRITICAL - No credit payouts | Medium | ~180 |
| 🔥 P0 | FleetMovementService | CRITICAL - No fleet movement | High | ~450 |
| ⚠️ P1 | BaseCitizenService | HIGH - Wrong population | Low | ~40 |
| ⚠️ P1 | StructuresService | HIGH - Building operations | High | ~650 |
| ⚠️ P1 | DefensesService | HIGH - Defense operations | Medium | ~270 |
| 📊 P2 | EmpireEconomyService | MEDIUM - Economy calcs | Medium | ~90 |
| 📊 P2 | CreditLedgerService | MEDIUM - History tracking | Low | ~50 |
| 📊 P3 | Game route refactoring | MEDIUM - API consistency | High | ~500 |

---

## 🎯 Recommended Action Plan

### Phase 1: Critical Game Loop (Week 1)
1. ✅ **DONE:** BuildingService completion
2. ✅ **DONE:** Tech/Unit/Defense queue completions
3. **TODO:** ResourceService Supabase support
4. **TODO:** BaseCitizenService Supabase support

### Phase 2: Fleet & Movement (Week 2)
1. **TODO:** FleetMovementService Supabase support
2. **TODO:** Fleet management operations

### Phase 3: User Actions (Week 3)
1. **TODO:** StructuresService Supabase support
2. **TODO:** DefensesService Supabase support
3. **TODO:** Route refactoring for consistency

### Phase 4: Supporting Features (Week 4)
1. **TODO:** EmpireEconomyService Supabase support
2. **TODO:** CreditLedgerService Supabase support
3. **TODO:** Remaining route updates

---

## 🔍 Detection Pattern

To find MongoDB-only code:
```bash
# Find imports of MongoDB models
grep -r "from.*models" packages/server/src/

# Find .find( usage
grep -r "\.find\(" packages/server/src/

# Find .findOne( usage  
grep -r "\.findOne\(" packages/server/src/

# Find .save() usage (MongoDB-specific)
grep -r "\.save\(\)" packages/server/src/
```

---

## 📝 Migration Template

When migrating a service:

1. **Create Supabase service** (if doesn't exist):
   ```typescript
   // services/ServiceName/SupabaseServiceName.ts
   import { supabase } from '../config/supabase';
   
   export class SupabaseServiceName {
     static async method(params) {
       const { data, error } = await supabase
         .from('table')
         .select('columns')
         .eq('field', value);
       // ... logic
     }
   }
   ```

2. **Update existing service**:
   ```typescript
   import { getDatabaseType } from '../config/database';
   import { SupabaseServiceName } from './ServiceName/SupabaseServiceName';
   
   static async method(params) {
     if (getDatabaseType() === 'supabase') {
       return await SupabaseServiceName.method(params);
     }
     // MongoDB path...
   }
   ```

3. **Test both paths**:
   - Test with Supabase locally
   - Test with MongoDB locally
   - Verify production deployment

---

## 🎮 Current Production Status

**What Works:**
- ✅ Building construction & completion
- ✅ Tech research completion
- ✅ Unit production completion  
- ✅ Defense completion
- ✅ Base stats display
- ✅ Capacity calculations

**What's Broken:**
- ❌ Credit payouts (ResourceService)
- ❌ Resource accumulation (ResourceService)
- ❌ Fleet movement (FleetMovementService)
- ❌ Citizen updates (BaseCitizenService)
- ⚠️ Some user-initiated operations may fail

---

## 📞 Next Steps

1. **Immediate (Today):**
   - Implement ResourceService Supabase support
   - Implement BaseCitizenService Supabase support

2. **This Week:**
   - Implement FleetMovementService Supabase support
   - Test all game loop components

3. **Next Week:**
   - Migrate user action services
   - Comprehensive integration testing

4. **Following Week:**
   - Complete remaining services
   - Full production validation
