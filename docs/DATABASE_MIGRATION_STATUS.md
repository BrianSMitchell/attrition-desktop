# Database Migration Status: MongoDB to Supabase

**Last Updated:** 2025-10-29  
**Status:** ✅ COMPLETE  
**Environment:** Production AND Development both use Supabase (MongoDB fully removed)  
**Verification:** See [SUPABASE-MIGRATION-COMPLETE.md](../SUPABASE-MIGRATION-COMPLETE.md) for details

## Overview

Our application uses a dual-database approach:
- **Development (Local):** MongoDB via Docker
- **Production (Render.com):** Supabase (PostgreSQL)

The server automatically selects the database based on `NODE_ENV`:
- `development` → MongoDB
- `production` → Supabase

However, not all API endpoints have been updated to support Supabase. This document tracks which endpoints are database-agnostic and which still only support MongoDB.

## Current Production Issues

### Critical
1. ❌ **Fleet Overview Endpoint** (`GET /api/game/fleets-overview`) - Causes timeout on base detail page
   - **Error:** `Operation fleets.find() buffering timed out after 10000ms`
   - **Impact:** Users cannot view base details in production
   - **Line:** 3467 in `game.ts`

### Status Legend
- ✅ **Full Support** - Has Supabase implementation with `getDatabaseType()` check
- 🟡 **Partial Support** - Has Supabase code but may need testing/refinement
- ❌ **MongoDB Only** - Only works with MongoDB, needs Supabase implementation
- 🔵 **Database Agnostic** - Doesn't directly interact with database

---

## Authentication Routes (`/api/auth`)

| Method | Endpoint | Status | Notes |
|--------|----------|--------|-------|
| POST | `/register` | ✅ | Has Supabase support (line 36) |
| POST | `/login` | ✅ | Has Supabase support (line 206) |
| GET | `/me` | ✅ | Has Supabase support (line 458) |
| POST | `/logout` | 🔵 | Token-based, no DB queries |

---

## Game Routes (`/api/game`)

### Core Empire & Dashboard

| Method | Endpoint | Status | Priority | Notes |
|--------|----------|--------|----------|-------|
| GET | `/dashboard` | ✅ | High | Has Supabase support (line 81) |
| POST | `/empire` | ❌ | Medium | MongoDB only (line 390) |
| GET | `/empire` | ✅ | High | Has Supabase support (line 400) |
| POST | `/empire/update-resources` | ❌ | Low | MongoDB only (line 462) |
| GET | `/credits/history` | ❌ | Low | MongoDB only (line 486) |
| GET | `/territories` | ✅ | Medium | Has Supabase support (line 512) |
| GET | `/buildings/location/:coord` | ✅ | Medium | Has Supabase support (line 572) |
| POST | `/territories/colonize` | ❌ | Medium | MongoDB only (line 646) |

### Research & Technology

| Method | Endpoint | Status | Priority | Notes |
|--------|----------|--------|----------|-------|
| GET | `/research` | ❌ | Low | MongoDB only (line 1135) |
| GET | `/tech/catalog` | 🔵 | N/A | Uses shared game catalog |
| GET | `/tech/status` | ✅ | Medium | Has Supabase support (line 1172) |
| POST | `/tech/start` | ✅ | High | Has Supabase support (line 1211) |
| GET | `/tech/queue` | ✅ | Medium | Has Supabase support (line 3294) |
| DELETE | `/tech/queue/:id` | ❌ | Low | MongoDB only (line 3328) |

### Structures & Buildings

| Method | Endpoint | Status | Priority | Notes |
|--------|----------|--------|----------|-------|
| GET | `/structures/catalog` | 🔵 | N/A | Uses shared game catalog |
| GET | `/bases/:coord/structures` | ✅ | High | Has Supabase support (line 2464) |
| POST | `/bases/:coord/structures/:key/construct` | ✅ | **Critical** | Has Supabase support (line 2690) - **THIS WORKS** |
| DELETE | `/bases/:coord/structures/cancel` | ❌ | Medium | MongoDB only (line 3184) |

### Defenses

| Method | Endpoint | Status | Priority | Notes |
|--------|----------|--------|----------|-------|
| GET | `/defenses/catalog` | 🔵 | N/A | Uses shared game catalog |
| GET | `/defenses/status` | ✅ | Medium | Has Supabase support (line 1296) |
| GET | `/defenses/queue` | ✅ | Medium | Has Supabase support (line 1308) |
| POST | `/defenses/start` | ❌ | Medium | MongoDB only (line 1333) |
| DELETE | `/defenses/queue/:id` | ❌ | Low | MongoDB only (line 1370) |
| GET | `/bases/:coord/defenses` | ✅ | Medium | Has Supabase support (line 2405) |

### Units & Military

| Method | Endpoint | Status | Priority | Notes |
|--------|----------|--------|----------|-------|
| GET | `/units/catalog` | 🔵 | N/A | Uses shared game catalog |
| GET | `/units/status` | ✅ | Medium | Has Supabase support (line 1399) |
| POST | `/units/start` | ✅ | High | Has Supabase support (line 1442) |
| GET | `/units/queue` | ✅ | Medium | Has Supabase support (line 1533) |
| DELETE | `/units/queue/:id` | ✅ | Low | Has Supabase support (line 1629) |
| GET | `/base-units` | ❌ | Medium | MongoDB only (line 3383) |

### Fleets (All MongoDB Only - HIGH PRIORITY)

| Method | Endpoint | Status | Priority | Notes |
|--------|----------|--------|----------|-------|
| GET | `/fleets` | ❌ | High | MongoDB only (line 3435) |
| GET | `/fleets-overview` | ❌ | **Critical** | **BLOCKING PRODUCTION** (line 3467) |
| GET | `/fleets/:id` | ❌ | High | MongoDB only (line 3542) |
| POST | `/fleets/:id/dispatch` | ❌ | High | MongoDB only (line 3600) |
| GET | `/fleets/:id/status` | ❌ | Medium | MongoDB only (line 3675) |
| POST | `/fleets/:id/estimate-travel` | ❌ | Low | MongoDB only (line 3740) |
| PUT | `/fleets/:id/recall` | ❌ | Medium | MongoDB only (line 3806) |

### Base Statistics

| Method | Endpoint | Status | Priority | Notes |
|--------|----------|--------|----------|-------|
| GET | `/bases/summary` | ✅ | High | Has Supabase support (line 1732) |
| GET | `/base-stats/:coord` | ✅ | High | Has Supabase support (line 2252) |
| GET | `/capacities/:coord` | ✅ | High | Has Supabase support (line 2299) |
| GET | `/bases/:coord/stats` | ✅ | High | Has Supabase support (line 2347) |

### Testing/Admin Endpoints

| Method | Endpoint | Status | Priority | Notes |
|--------|----------|--------|----------|-------|
| POST | `/test/seed-research` | ❌ | Low | Test endpoint, MongoDB only |
| POST | `/test/seed-defenses` | ❌ | Low | Test endpoint, MongoDB only |
| POST | `/test/seed-structures` | ❌ | Low | Test endpoint, MongoDB only |
| DELETE | `/test/buildings/queued/:catalogKey` | ❌ | Low | Test endpoint, MongoDB only |

---

## Universe Routes (`/api/universe`)

| Method | Endpoint | Status | Priority | Notes |
|--------|----------|--------|----------|-------|
| GET | `/systems` | ✅ | High | Has Supabase support |
| GET | `/systems/:coord` | ✅ | High | Has Supabase support |
| GET | `/locations` | ✅ | Medium | Has Supabase support |
| GET | `/locations/:coord` | ✅ | High | Has Supabase support |

---

## Summary Statistics

### By Status
- ✅ **Full Supabase Support:** 26 endpoints (~50%)
- ❌ **MongoDB Only:** 21 endpoints (~40%)
- 🔵 **Database Agnostic:** 5 endpoints (~10%)

### By Priority
- **Critical:** 2 endpoints need immediate attention
  - `/fleets-overview` (blocking production users)
  - `/bases/:coord/structures/:key/construct` (✅ already done!)
  
- **High Priority:** 8 endpoints
  - All fleet-related endpoints
  - Empire and territory management
  
- **Medium Priority:** 7 endpoints
  - Defense and unit queue management
  - Base unit listing
  
- **Low Priority:** 4 endpoints (mostly test/admin)

---

## Implementation Pattern

All endpoints that support both databases follow this pattern:

```typescript
router.get('/endpoint', asyncHandler(async (req: AuthRequest, res: Response) => {
  if (getDatabaseType() === 'supabase') {
    // Supabase implementation using supabase client
    const { data, error } = await supabase
      .from('table_name')
      .select('*')
      .eq('field', value);
    
    // Process and return data
    return res.json({ success: true, data });
  }
  
  // MongoDB implementation (fallback for development)
  const docs = await MongoModel.find({ field: value });
  
  // Process and return data
  return res.json({ success: true, data: docs });
}));
```

---

## Next Steps

1. **Immediate:** Fix `/fleets-overview` to unblock production
2. **Phase 1:** Implement remaining fleet endpoints (all critical for fleet management)
3. **Phase 2:** Add Supabase to empire/territory POST endpoints
4. **Phase 3:** Complete remaining queue management endpoints
5. **Phase 4:** Update test/admin endpoints (low priority)

---

## Notes for Developers

- Always check `getDatabaseType()` before database operations
- Supabase uses PostgreSQL (relational), MongoDB is document-based
- Field names may differ: MongoDB uses `_id`, Supabase uses `id`
- Supabase requires explicit column selection: `.select('id, name, ...')`
- Test both database paths when implementing new endpoints
- Run local tests with `NODE_ENV=development` (MongoDB)
- Test production path by setting `NODE_ENV=production` locally with Supabase credentials
