# PRD: Complete MongoDB-to-Supabase Migration

**Document ID:** PRD-2025-001  
**Created:** 2025-10-07  
**Status:** Approved  
**Priority:** Critical  
**Owner:** Backend Team

---

## Executive Summary

Our space empire MMO currently supports dual-database deployment (MongoDB for development, Supabase for production), but only ~50% of API endpoints have been migrated to support Supabase. This creates a critical production issue where users cannot access certain features (notably fleet management) when playing on the production server.

**Goal:** Complete the database migration by implementing Supabase support for all remaining MongoDB-only endpoints, enabling full functionality in production while maintaining backward compatibility with local MongoDB development environments.

---

## Problem Statement

### Current State
- Production server (Render.com) is configured to use Supabase (PostgreSQL)
- Development environments use MongoDB via Docker
- Server automatically selects database based on `NODE_ENV`
- **Only 26 out of 52 endpoints** have Supabase implementations

### Critical Issues
1. **Production Blocker:** `/fleets-overview` endpoint times out, preventing users from viewing base details
2. **Incomplete Features:** All 7 fleet management endpoints are MongoDB-only
3. **User Impact:** Production users cannot manage fleets, view comprehensive base information, or access certain empire management features

### Root Cause
Endpoints were originally written for MongoDB and not all were updated when Supabase support was added. The server correctly connects to Supabase in production, but MongoDB-only endpoints attempt MongoDB queries that timeout.

---

## Success Criteria

### Must Have
1. ✅ All 21 MongoDB-only endpoints have Supabase implementations
2. ✅ Production users can access all game features without timeouts
3. ✅ Development environments continue to work with MongoDB
4. ✅ No breaking changes to API contracts (request/response formats)
5. ✅ All endpoints tested in both MongoDB and Supabase modes

### Should Have
1. Consistent error handling across both database implementations
2. Performance metrics comparing MongoDB vs Supabase query times
3. Database-agnostic service layer for common operations
4. Updated API documentation reflecting dual-database support

### Nice to Have
1. Automated tests that run against both databases
2. Database selection override via environment variable (for testing)
3. Migration guide for future endpoints

---

## User Stories

### As a Production User
- **Story 1:** I want to view all fleets at my base so I can plan military operations
  - **Acceptance:** `/fleets-overview` returns fleet data without timeout
  
- **Story 2:** I want to dispatch fleets to other locations so I can expand my empire
  - **Acceptance:** All fleet management endpoints work in production

- **Story 3:** I want to manage my territories and colonies without errors
  - **Acceptance:** Territory/colony POST endpoints work in production

### As a Developer
- **Story 4:** I want to develop locally with MongoDB and deploy to Supabase seamlessly
  - **Acceptance:** All endpoints work in both environments without code changes
  
- **Story 5:** I want clear patterns to follow when creating new endpoints
  - **Acceptance:** Documentation and examples for database-agnostic endpoint development

---

## Technical Requirements

### Architecture Pattern

All endpoints must follow this structure:

```typescript
router.METHOD('/endpoint', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (getDatabaseType() === 'supabase') {
    // ====== SUPABASE IMPLEMENTATION ======
    const userId = req.user!._id || req.user!.id;
    
    // 1. Get empire ID
    const { data: userRow } = await supabase
      .from('users')
      .select('empire_id')
      .eq('id', userId)
      .single();
    
    const empireId = userRow?.empire_id;
    if (!empireId) {
      return res.status(404).json({ success: false, error: 'Empire not found' });
    }
    
    // 2. Query data
    const { data, error } = await supabase
      .from('table_name')
      .select('columns')
      .eq('empire_id', empireId);
    
    if (error) {
      return res.status(500).json({ 
        success: false, 
        code: 'DB_ERROR',
        error: error.message 
      });
    }
    
    // 3. Format and return
    return res.json({ success: true, data: formatData(data) });
  }
  
  // ====== MONGODB IMPLEMENTATION (Development) ======
  const empire = await Empire.findOne({ userId: req.user!._id });
  if (!empire) {
    return res.status(404).json({ success: false, error: 'Empire not found' });
  }
  
  const docs = await MongoModel.find({ empireId: empire._id });
  
  return res.json({ success: true, data: formatData(docs) });
}));
```

### Database Schema Mapping

| Concept | MongoDB | Supabase | Notes |
|---------|---------|----------|-------|
| Primary Key | `_id` (ObjectId) | `id` (UUID) | Field name differs |
| Empire Reference | `empireId` (ObjectId) | `empire_id` (UUID) | Snake_case in Supabase |
| Location Reference | `locationCoord` (string) | `location_coord` (string) | Snake_case in Supabase |
| Timestamps | `createdAt`, `updatedAt` | `created_at`, `updated_at` | Auto-managed |
| Nested Objects | Embedded documents | JSONB columns or foreign keys | Structure differs |

### Key Differences to Handle

1. **Field Naming:** MongoDB uses camelCase, Supabase uses snake_case
2. **ID Format:** MongoDB uses ObjectId (string representation), Supabase uses UUID
3. **Query Syntax:** 
   - MongoDB: `Model.find({ field: value })`
   - Supabase: `supabase.from('table').select('*').eq('field', value)`
4. **Relationships:** MongoDB uses embedded docs or refs, Supabase uses foreign keys
5. **Array Operations:** MongoDB has native array operators, Supabase uses PostgreSQL array functions

---

## Scope

### In Scope - Phase 1: Critical (Week 1)

**Fleet Management** (Blocking Production)
1. `GET /fleets-overview` ← **CRITICAL: Fixes production blocker**
2. `GET /fleets`
3. `GET /fleets/:id`
4. `POST /fleets/:id/dispatch`
5. `GET /fleets/:id/status`
6. `POST /fleets/:id/estimate-travel`
7. `PUT /fleets/:id/recall`

### In Scope - Phase 2: High Priority (Week 2)

**Empire & Territory Management**
1. `POST /empire`
2. `POST /empire/update-resources`
3. `POST /territories/colonize`

**Military Operations**
4. `POST /defenses/start`
5. `GET /base-units`

### In Scope - Phase 3: Medium Priority (Week 3)

**Queue Management**
1. `DELETE /defenses/queue/:id`
2. `DELETE /tech/queue/:id`
3. `DELETE /bases/:coord/structures/cancel`

**Resource & Research**
4. `GET /credits/history`
5. `GET /research`

### Out of Scope
- Test/admin endpoints (`/test/*`) - Low priority, can remain MongoDB-only for now
- Schema changes or data migrations
- Performance optimization beyond basic functionality
- New features or endpoint changes

---

## Implementation Guidelines

### Error Handling

```typescript
// Supabase error
if (error) {
  console.error('[Supabase Error]', error);
  return res.status(500).json({
    success: false,
    code: 'DB_ERROR',
    message: 'Database operation failed',
    details: error.message
  });
}

// Not found
if (!data || data.length === 0) {
  return res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: 'Resource not found'
  });
}
```

### Data Transformation

Create helper functions to normalize data between databases:

```typescript
// Example helper
function normalizeFleet(fleet: any, source: 'mongodb' | 'supabase') {
  if (source === 'supabase') {
    return {
      _id: fleet.id,
      name: fleet.name,
      locationCoord: fleet.location_coord,
      empireId: fleet.empire_id,
      // ... map all fields
    };
  }
  return fleet; // MongoDB already in correct format
}
```

### Testing Strategy

For each endpoint:
1. ✅ Test with `NODE_ENV=development` (MongoDB)
2. ✅ Test with `NODE_ENV=production` and Supabase credentials locally
3. ✅ Verify response format matches API documentation
4. ✅ Test error cases (not found, invalid data, etc.)
5. ✅ Deploy to production and verify with desktop app

---

## Dependencies

### Technical Dependencies
- Supabase client library (`@supabase/supabase-js`) ✅ Already installed
- Access to Supabase project credentials ✅ Already configured
- Understanding of Supabase schema ✅ Schema documented

### Knowledge Dependencies
- Supabase schema design and relationships
- Fleet system data model
- Empire/territory relationship structure
- Queue management patterns

### Existing Code to Reference
- `/dashboard` endpoint (line 81) - Good example of Supabase queries
- `/bases/:coord/structures/:key/construct` (line 2690) - Complex Supabase logic
- `/tech/start` (line 1211) - Queue creation pattern

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Schema differences cause data loss | High | Medium | Thorough testing in both environments before deployment |
| Performance degradation in Supabase | Medium | Low | Profile queries, add indexes if needed |
| Breaking changes to API contracts | High | Low | Maintain exact response formats, add integration tests |
| Fleet data model too complex for quick migration | Medium | Medium | Start with read-only fleet endpoints, defer write operations if needed |

---

## Timeline & Milestones

### Week 1: Critical Fleet Endpoints
- **Day 1-2:** Implement `/fleets-overview` and `/fleets` (read-only)
- **Day 3-4:** Implement `/fleets/:id` detail and status
- **Day 5:** Deploy and test with production app

### Week 2: Fleet Operations & Empire Management
- **Day 1-2:** Implement fleet dispatch/recall (write operations)
- **Day 3-4:** Empire and territory POST endpoints
- **Day 5:** Testing and bug fixes

### Week 3: Queue Management & Polish
- **Day 1-3:** Remaining queue delete endpoints
- **Day 4:** Documentation and testing
- **Day 5:** Final production validation

---

## Success Metrics

### Functional Metrics
- ✅ 0 production timeouts related to database queries
- ✅ 100% of game features accessible in production
- ✅ All integration tests passing in both environments

### Performance Metrics
- API response time < 500ms for 95th percentile
- No N+1 query problems
- Database connection pool healthy

### Developer Experience
- < 2 hours to implement Supabase support for new endpoint
- Clear documentation and examples
- Automated testing for both databases

---

## Open Questions

1. **Q:** Should we create a database abstraction layer instead of if/else in each endpoint?
   - **A:** Not in this phase. Keep it simple with if/else. Consider abstraction layer in future refactor.

2. **Q:** How do we handle fleet movements (pending/traveling state)?
   - **A:** Investigate `fleet_movements` table in Supabase. May need to query both fleets and movements tables.

3. **Q:** What about WebSocket events for fleet arrivals?
   - **A:** Out of scope for this PRD. Socket events should work once underlying endpoints are fixed.

---

## Appendix

### Reference Documentation
- [Database Migration Status](./DATABASE_MIGRATION_STATUS.md)
- [Supabase Schema](../supabase/README.md)
- [API Documentation](./API.md)

### Related Issues
- Production Issue: `/fleets-overview` timeout
- User Report: "Cannot view fleets in production"
