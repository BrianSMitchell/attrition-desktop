# Task List: Complete Supabase Migration

**Based on:** PRD-Complete-Supabase-Migration.md  
**Priority:** Critical  
**Estimated Duration:** 3 weeks

---

## Overview

This task list implements Supabase support for 21 MongoDB-only endpoints across three phases. Each task includes implementation steps, testing requirements, and relevant file references.

**Goal:** Enable full production functionality while maintaining MongoDB support for local development.

---

## Phase 1: Critical Fleet Endpoints (Week 1)

### 🚨 Priority 1: Fix Production Blocker

- [x] **1.0 Implement Supabase Support for GET `/fleets-overview`** ⚠️ **CRITICAL** ✅ COMPLETE
  - [x] 1.1 Study existing MongoDB implementation (line 3467 in `packages/server/src/routes/game.ts`)
  - [x] 1.2 Examine Supabase `fleets` table schema to understand column names and relationships
  - [x] 1.3 Check if `fleet_movements` table exists and how it relates to stationed vs. traveling fleets
  - [x] 1.4 Add `if (getDatabaseType() === 'supabase')` check at start of endpoint
  - [x] 1.5 Implement Supabase query for stationed fleets at the given base coordinate
  - [x] 1.6 Implement Supabase query for inbound fleet movements to the base
  - [x] 1.7 Query empires table to get owner names for all fleets
  - [x] 1.8 Format response to match MongoDB format exactly (field name mapping: `id` → `_id`, `empire_id` → `empireId`, etc.)
  - [x] 1.9 Add error handling for Supabase errors
  - [ ] 1.10 Test locally with `NODE_ENV=production` and Supabase credentials
  - [ ] 1.11 Test in development with `NODE_ENV=development` to ensure MongoDB path still works
  - [ ] 1.12 Deploy to production and verify base detail page loads without timeout
  
### Fleet Read Operations

- [x] **2.0 Implement Supabase Support for GET `/fleets`** ✅ COMPLETE
  - [x] 2.1 Study MongoDB implementation (line 3435)
  - [x] 2.2 Add `getDatabaseType()` check
  - [x] 2.3 Get empire ID for current user from Supabase
  - [x] 2.4 Query fleets table filtering by `empire_id` and optional `location_coord`
  - [x] 2.5 Format response with proper field mapping
  - [ ] 2.6 Test both database paths
  
- [x] **3.0 Implement Supabase Support for GET `/fleets/:id`** ✅ COMPLETE
  - [x] 3.1 Study MongoDB implementation (line 3542)
  - [x] 3.2 Add `getDatabaseType()` check
  - [x] 3.3 Validate fleet ID format (MongoDB uses ObjectId, Supabase uses UUID)
  - [x] 3.4 Query single fleet by ID with empire ownership check
  - [x] 3.5 Parse and format fleet composition (units array) correctly
  - [x] 3.6 Handle case where fleet doesn't exist or doesn't belong to player
  - [ ] 3.7 Test both database paths
  
- [x] **4.0 Implement Supabase Support for GET `/fleets/:id/status`** ✅ COMPLETE
  - [x] 4.1 Study MongoDB implementation (line 3675)
  - [x] 4.2 Add `getDatabaseType()` check
  - [x] 4.3 Query fleet and any active movement for that fleet
  - [x] 4.4 Calculate ETA if fleet is in transit
  - [x] 4.5 Format status response
  - [ ] 4.6 Test both database paths

### Fleet Write Operations

- [ ] **5.0 Implement Supabase Support for POST `/fleets/:id/dispatch`**
  - [ ] 5.1 Study MongoDB implementation (line 3600)
  - [ ] 5.2 Review FleetMovementService to understand movement creation
  - [ ] 5.3 Add `getDatabaseType()` check
  - [ ] 5.4 Verify fleet ownership and current location
  - [ ] 5.5 Validate destination coordinates exist in locations table
  - [ ] 5.6 Calculate travel time based on distance
  - [ ] 5.7 Create fleet_movement record in Supabase
  - [ ] 5.8 Update fleet status to 'traveling'
  - [ ] 5.9 Test movement creation and verify response format
  - [ ] 5.10 Test both database paths

- [x] **6.0 Implement Supabase Support for POST `/fleets/:id/estimate-travel`** ✅ COMPLETE
  - [x] 6.1 Study MongoDB implementation (line 3740)
  - [x] 6.2 Add `getDatabaseType()` check
  - [x] 6.3 Get fleet information (speed, type)
  - [x] 6.4 Calculate distance to destination
  - [x] 6.5 Return estimated arrival time
  - [ ] 6.6 Test both database paths

- [ ] **7.0 Implement Supabase Support for PUT `/fleets/:id/recall`**
  - [ ] 7.1 Study MongoDB implementation (line 3806)
  - [ ] 7.2 Add `getDatabaseType()` check
  - [ ] 7.3 Find active movement for fleet
  - [ ] 7.4 Cancel movement and return fleet to origin
  - [ ] 7.5 Update fleet status
  - [ ] 7.6 Test recall functionality
  - [ ] 7.7 Test both database paths

### Phase 1 Testing & Deployment

- [ ] **8.0 Phase 1 Integration Testing**
  - [ ] 8.1 Test complete fleet workflow: view → select → dispatch → recall
  - [ ] 8.2 Verify desktop app can view fleets in production
  - [ ] 8.3 Test error cases (invalid IDs, unauthorized access, etc.)
  - [ ] 8.4 Performance test: measure response times for fleet queries
  - [ ] 8.5 Deploy to production and monitor for errors

---

## Phase 2: Empire & Military Operations (Week 2)

### Empire Management

- [ ] **9.0 Implement Supabase Support for POST `/empire`** (Create Empire)
  - [ ] 9.1 Study MongoDB implementation (line 390)
  - [ ] 9.2 Add `getDatabaseType()` check  
  - [ ] 9.3 Insert new empire record in Supabase with user_id
  - [ ] 9.4 Update user record to link empire_id
  - [ ] 9.5 Create initial home planet/colony if needed
  - [ ] 9.6 Test empire creation flow
  - [ ] 9.7 Test both database paths

- [ ] **10.0 Implement Supabase Support for POST `/empire/update-resources`**
  - [ ] 10.1 Study MongoDB implementation (line 462)
  - [ ] 10.2 Add `getDatabaseType()` check
  - [ ] 10.3 Update empire credits/resources in Supabase
  - [ ] 10.4 Add transaction logging if applicable
  - [ ] 10.5 Test resource updates
  - [ ] 10.6 Test both database paths

### Territory Management

- [ ] **11.0 Implement Supabase Support for POST `/territories/colonize`**
  - [ ] 11.1 Study MongoDB implementation (line 646)
  - [ ] 11.2 Understand colonization requirements and costs
  - [ ] 11.3 Add `getDatabaseType()` check
  - [ ] 11.4 Verify location is unowned and colonizable
  - [ ] 11.5 Deduct colonization cost from empire
  - [ ] 11.6 Update location owner_id in Supabase
  - [ ] 11.7 Create colony record
  - [ ] 11.8 Add initial buildings/structures
  - [ ] 11.9 Test colonization flow
  - [ ] 11.10 Test both database paths

### Military Operations

- [ ] **12.0 Implement Supabase Support for POST `/defenses/start`**
  - [ ] 12.1 Study MongoDB implementation (line 1333)
  - [ ] 12.2 Reference existing `/tech/start` Supabase implementation (line 1211) as template
  - [ ] 12.3 Add `getDatabaseType()` check
  - [ ] 12.4 Verify defense catalog key exists and prerequisites met
  - [ ] 12.5 Calculate cost and construction time
  - [ ] 12.6 Deduct resources from empire
  - [ ] 12.7 Create defense queue entry in Supabase
  - [ ] 12.8 Test defense construction start
  - [ ] 12.9 Test both database paths

- [ ] **13.0 Implement Supabase Support for GET `/base-units`**
  - [ ] 13.1 Study MongoDB implementation (line 3383)
  - [ ] 13.2 Understand unit storage model in Supabase
  - [ ] 13.3 Add `getDatabaseType()` check
  - [ ] 13.4 Query units at specified base grouped by type
  - [ ] 13.5 Return counts per unit type
  - [ ] 13.6 Test unit listing
  - [ ] 13.7 Test both database paths

### Phase 2 Testing & Deployment

- [ ] **14.0 Phase 2 Integration Testing**
  - [ ] 14.1 Test empire creation and resource management
  - [ ] 14.2 Test territory colonization flow
  - [ ] 14.3 Test defense and unit construction
  - [ ] 14.4 Verify production functionality
  - [ ] 14.5 Deploy to production

---

## Phase 3: Queue Management & Polish (Week 3)

### Queue Management

- [ ] **15.0 Implement Supabase Support for DELETE `/defenses/queue/:id`**
  - [ ] 15.1 Study MongoDB implementation (line 1370)
  - [ ] 15.2 Reference `/units/queue/:id` Supabase implementation (line 1629) as template
  - [ ] 15.3 Add `getDatabaseType()` check
  - [ ] 15.4 Verify queue entry exists and belongs to player
  - [ ] 15.5 Refund partial resources if applicable
  - [ ] 15.6 Delete queue entry from Supabase
  - [ ] 15.7 Test queue cancellation
  - [ ] 15.8 Test both database paths

- [ ] **16.0 Implement Supabase Support for DELETE `/tech/queue/:id`**
  - [ ] 16.1 Study MongoDB implementation (line 3328)
  - [ ] 16.2 Add `getDatabaseType()` check
  - [ ] 16.3 Similar to defenses queue cancellation
  - [ ] 16.4 Test tech queue cancellation
  - [ ] 16.5 Test both database paths

- [ ] **17.0 Implement Supabase Support for DELETE `/bases/:coord/structures/cancel`**
  - [ ] 17.1 Study MongoDB implementation (line 3184)
  - [ ] 17.2 Add `getDatabaseType()` check
  - [ ] 17.3 Find active construction at base
  - [ ] 17.4 Refund resources
  - [ ] 17.5 Delete or mark construction as cancelled
  - [ ] 17.6 Test structure cancellation
  - [ ] 17.7 Test both database paths

### Resource & Research

- [ ] **18.0 Implement Supabase Support for GET `/credits/history`**
  - [ ] 18.1 Study MongoDB implementation (line 486)
  - [ ] 18.2 Add `getDatabaseType()` check
  - [ ] 18.3 Query credit transactions from Supabase
  - [ ] 18.4 Order by timestamp descending
  - [ ] 18.5 Implement pagination if applicable
  - [ ] 18.6 Test transaction history
  - [ ] 18.7 Test both database paths

- [ ] **19.0 Implement Supabase Support for GET `/research`**
  - [ ] 19.1 Study MongoDB implementation (line 1135)
  - [ ] 19.2 Add `getDatabaseType()` check
  - [ ] 19.3 Query research projects for empire
  - [ ] 19.4 Include progress and completion status
  - [ ] 19.5 Test research listing
  - [ ] 19.6 Test both database paths

### Documentation & Testing

- [ ] **20.0 Update API Documentation**
  - [ ] 20.1 Document dual-database support in API docs
  - [ ] 20.2 Update endpoint examples to reflect both modes
  - [ ] 20.3 Add troubleshooting section for database issues
  - [ ] 20.4 Document field name mappings (MongoDB camelCase vs Supabase snake_case)

- [ ] **21.0 Create Database Migration Guide**
  - [ ] 21.1 Write guide for adding Supabase support to future endpoints
  - [ ] 21.2 Include code templates and examples
  - [ ] 21.3 Document common gotchas and solutions
  - [ ] 21.4 Add section on testing both database paths

- [ ] **22.0 Final Production Validation**
  - [ ] 22.1 Deploy all changes to production
  - [ ] 22.2 Test all 21 migrated endpoints in production
  - [ ] 22.3 Verify 0 MongoDB-related timeouts or errors
  - [ ] 22.4 Monitor performance metrics
  - [ ] 22.5 Get user confirmation that all features work

---

## Relevant Files

### Primary Implementation Files
- `packages/server/src/routes/game.ts` - Main game routes file (contains all 21 endpoints to migrate)
- `packages/server/src/config/database.ts` - Database selection logic and getDatabaseType() function
- `packages/server/src/config/supabase.ts` - Supabase client configuration

### Reference Implementations (Examples with Supabase Support)
- `packages/server/src/routes/game.ts:81` - `/dashboard` - Good example of Supabase queries
- `packages/server/src/routes/game.ts:2690` - `/bases/:coord/structures/:key/construct` - Complex Supabase logic with validations
- `packages/server/src/routes/game.ts:1211` - `/tech/start` - Queue creation pattern
- `packages/server/src/routes/game.ts:1629` - `/units/queue/:id` - Queue deletion pattern
- `packages/server/src/routes/auth.ts:36,206,458` - Authentication routes with Supabase

### Service Layers (May Need Updates)
- `packages/server/src/services/fleetMovementService.ts` - Fleet movement logic
- `packages/server/src/services/bases/SupabaseBaseStatsService.ts` - Base statistics  
- `packages/server/src/services/bases/SupabaseCapacityService.ts` - Base capacity calculations
- `packages/server/src/services/economy/SupabaseEconomyService.ts` - Economy calculations

### MongoDB Models (For Understanding Data Structure)
- `packages/server/src/models/Fleet.ts` - Fleet schema
- `packages/server/src/models/Empire.ts` - Empire schema
- `packages/server/src/models/Colony.ts` - Colony schema
- `packages/server/src/models/Building.ts` - Building schema

### Testing Files
- `packages/server/src/routes/game.test.ts` - Game routes tests (may need creation)

---

## Notes

### Testing Strategy Per Endpoint

For each endpoint implementation, follow this testing checklist:

1. **Local MongoDB Test** (`NODE_ENV=development`)
   ```bash
   # Start local MongoDB
   docker-compose up -d mongodb
   
   # Run server in development mode
   cd packages/server
   NODE_ENV=development npm start
   
   # Test endpoint with curl or Postman
   ```

2. **Local Supabase Test** (`NODE_ENV=production` with local Supabase credentials)
   ```bash
   # Set Supabase credentials in .env
   NODE_ENV=production
   SUPABASE_URL=https://vgiyiesglcxnzngpyhlb.supabase.co
   SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   
   # Run server
   npm start
   
   # Test endpoint
   ```

3. **Production Test** (Deploy and test with desktop app)
   ```bash
   # Deploy to Render
   git push origin main
   
   # Wait for deployment
   # Test with desktop app
   ```

### Common Implementation Pattern

Every endpoint should follow this structure:

```typescript
router.METHOD('/path', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (getDatabaseType() === 'supabase') {
    // ========== SUPABASE PATH ==========
    const userId = req.user!._id || req.user!.id;
    
    // Get empire
    const { data: userRow } = await supabase
      .from('users')
      .select('empire_id')
      .eq('id', userId)
      .maybeSingle();
    
    if (!userRow?.empire_id) {
      return res.status(404).json({ success: false, error: 'Empire not found' });
    }
    
    // Query data
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('empire_id', userRow.empire_id);
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        code: 'DB_ERROR',
        error: error.message 
      });
    }
    
    // Format and return
    return res.json({ success: true, data: normalizeData(data, 'supabase') });
  }
  
  // ========== MONGODB PATH ==========
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }
  
  const docs = await MongoModel.find({ empireId: empire._id });
  
  return res.json({ success: true, data: normalizeData(docs, 'mongodb') });
}));
```

### Field Name Mapping Reference

| MongoDB (camelCase) | Supabase (snake_case) |
|---------------------|------------------------|
| `_id` | `id` |
| `empireId` | `empire_id` |
| `userId` | `user_id` |
| `locationCoord` | `location_coord` |
| `createdAt` | `created_at` |
| `updatedAt` | `updated_at` |
| `sizeCredits` | `size_credits` |
| `estimatedArrivalTime` | `estimated_arrival_time` |

---

## Success Criteria

- ✅ All 21 endpoints have Supabase implementations
- ✅ Production users can access all game features
- ✅ Development with MongoDB still works
- ✅ No breaking changes to API responses
- ✅ All endpoints tested in both modes
- ✅ Production server shows 0 database-related errors
- ✅ Desktop app fully functional in production

---

## Estimated Time Per Phase

- **Phase 1:** 5 days (7 endpoints × 4-6 hours each)
- **Phase 2:** 5 days (5 endpoints × 4-6 hours each + complex empire logic)
- **Phase 3:** 3 days (5 endpoints × 3-4 hours each + documentation)

**Total:** ~13-15 working days (3 weeks with buffer)
