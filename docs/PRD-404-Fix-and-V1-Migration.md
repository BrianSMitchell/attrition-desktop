# PRD: Fix All 404 Errors and Complete V1 Service Migration

## Product Requirements Document
**Version:** 1.0  
**Date:** 2025-10-12  
**Status:** Planning Phase  

---

## Executive Summary

This PRD addresses the systematic resolution of all 404 errors in the Attrition game development environment and completes the migration from v1 services to the current game API structure. The goal is to eliminate all missing endpoints, consolidate duplicate service logic, and establish a clean, maintainable API architecture.

## Problem Statement

### Current Issues Identified from Logs:
1. **404 Errors on Missing Endpoints:**
   - `/api/game/capacities/:coord` - Base capacity calculations
   - `/api/game/buildings/location/:coord` - Building data by location
   - Other missing game endpoints

2. **Incomplete V1 Migration:**
   - V1 routes still exist alongside game routes
   - Duplicate service logic between v1 and game APIs
   - Inconsistent endpoint patterns
   - Technical debt from parallel implementations

3. **Client-Side Errors:**
   - TypeError: "t is not iterable" - Data format mismatches
   - Service boundary violations
   - Inconsistent response formats

## Success Criteria

### Primary Goals:
- ✅ Zero 404 errors in development environment
- ✅ Complete removal of v1 routes and services
- ✅ All client requests return valid responses
- ✅ Consistent API response formats across all endpoints
- ✅ No hardcoded values (following Constants Workflow)

### Performance Targets:
- All API requests complete within 500ms
- No duplicate database queries
- Reduced codebase complexity by 30%

## Technical Requirements

### Phase 1: Constants and Configuration Audit

Following the Constants Workflow, we must first identify and consolidate all hardcoded values:

#### 1.1 Endpoint Path Constants
```typescript
// constants/api-endpoints.ts
export const API_ENDPOINTS = {
  GAME: {
    TERRITORIES: '/api/game/territories',
    CAPACITIES: '/api/game/capacities',
    BUILDINGS: '/api/game/buildings',
    BASES: '/api/game/bases',
    // ... other endpoints
  },
  V1: {
    // Legacy endpoints to be migrated
  }
} as const;
```

#### 1.2 Database Field Mapping Constants
```typescript
// constants/database-fields.ts
export const DB_FIELDS = {
  BUILDINGS: {
    ID: 'id',
    EMPIRE_ID: 'empire_id',
    LOCATION_COORD: 'location_coord',
    CATALOG_KEY: 'catalog_key',
    // ... other fields
  }
} as const;
```

#### 1.3 Response Format Standards
```typescript
// constants/response-formats.ts
export const RESPONSE_FORMAT = {
  SUCCESS: (data: any, message?: string) => ({
    success: true,
    data,
    ...(message && { message })
  }),
  ERROR: (error: string, code?: string) => ({
    success: false,
    error,
    ...(code && { code })
  })
} as const;
```

### Phase 2: Missing Endpoint Implementation

#### 2.1 Capacities Service (`/api/game/capacities/:coord`)
**Purpose:** Return construction, production, and research capacities for a base

**Implementation Plan:**
- Create `CapacityService` in `services/bases/`
- Migrate logic from v1 `territoryRoutes.ts` lines 70-89
- Add route to `routes/game/bases/index.ts`
- Ensure consistent response format

**API Specification:**
```typescript
GET /api/game/capacities/:coord
Response: {
  success: true,
  data: {
    construction: { value: number, source: string },
    production: { value: number, source: string },
    research: { value: number, source: string }
  }
}
```

#### 2.2 Buildings by Location Service (`/api/game/buildings/location/:coord`)
**Purpose:** Return all buildings at a specific location

**Implementation Plan:**
- Create route in `routes/game/bases/index.ts`
- Query buildings table by location_coord
- Format response to match client expectations

**API Specification:**
```typescript
GET /api/game/buildings/location/:coord
Response: {
  success: true,
  data: {
    buildings: Array<{
      id: string,
      catalogKey: string,
      level: number,
      isActive: boolean,
      // ... other fields
    }>
  }
}
```

#### 2.3 Additional Missing Endpoints Analysis
**Action Required:** Systematic scan of client-side API calls to identify all missing endpoints

### Phase 3: V1 Service Migration Strategy

#### 3.1 Service Mapping Analysis
**Current V1 Services to Migrate:**
- `routes/v1/territoryRoutes.ts` → `routes/game/territories/` ✅ (Completed)
- `routes/v1/baseRoutes.ts` → `routes/game/bases/`
- `routes/v1/structureRoutes.ts` → `routes/game/structures/`
- Other v1 routes as identified

#### 3.2 Migration Methodology
1. **Extract Constants** - Identify hardcoded values
2. **Create Service Layer** - Abstract business logic
3. **Implement Game Route** - Following established patterns
4. **Test Compatibility** - Ensure client compatibility
5. **Remove V1 Route** - Clean up legacy code

#### 3.3 Data Consistency Validation
- Verify all migrated endpoints return same data structure
- Ensure database queries are optimized
- Validate authentication middleware consistency

### Phase 4: Error Resolution Strategy

#### 4.1 TypeError Resolution ("t is not iterable")
**Root Cause:** Client expects array but receives object or null

**Solution Approach:**
1. Audit all API responses for data structure consistency
2. Implement response validation middleware
3. Add client-side error boundary improvements
4. Create data transformation utilities

#### 4.2 Response Format Standardization
**Implementation:**
- Create response wrapper utility
- Apply to all endpoints
- Validate with TypeScript interfaces
- Add runtime response validation in development

## Implementation Phases

### Phase 1: Planning and Constants (Week 1)
- [ ] Complete codebase scan for hardcoded values
- [ ] Create constants files following Constants Workflow
- [ ] Document all missing endpoints
- [ ] Create migration mapping document

### Phase 2: Critical 404 Fixes (Week 1-2)
- [ ] Implement `/api/game/capacities/:coord`
- [ ] Implement `/api/game/buildings/location/:coord`
- [ ] Fix immediate client-side errors
- [ ] Test all critical user paths

### Phase 3: V1 Migration (Week 2-3)
- [ ] Migrate remaining v1 routes
- [ ] Consolidate duplicate service logic
- [ ] Update client-side API calls
- [ ] Remove v1 routes directory

### Phase 4: Testing and Validation (Week 3-4)
- [ ] Comprehensive API testing
- [ ] Client-side integration testing
- [ ] Performance optimization
- [ ] Documentation updates

## Risk Assessment

### High Risk:
- **Client Breaking Changes:** API format changes could break frontend
  - *Mitigation:* Maintain backward compatibility during migration
- **Data Consistency:** Migration could introduce data integrity issues
  - *Mitigation:* Comprehensive testing and gradual rollout

### Medium Risk:
- **Performance Degradation:** Consolidated services might be slower
  - *Mitigation:* Query optimization and caching strategy
- **Incomplete Migration:** Some v1 dependencies might be missed
  - *Mitigation:* Systematic dependency analysis

### Low Risk:
- **Development Environment Disruption:** Minimal impact expected
  - *Mitigation:* Feature flagging for new implementations

## Acceptance Criteria

### Functional Requirements:
1. All API endpoints return 200 status codes for valid requests
2. No 404 errors in development environment logs
3. Client application loads without errors
4. All game features remain functional

### Technical Requirements:
1. Zero hardcoded values (validated by ESLint rules)
2. Consistent response format across all endpoints  
3. V1 routes directory completely removed
4. API response time < 500ms for all endpoints
5. Unit test coverage > 80% for new services

### Quality Assurance:
1. All endpoints documented in API specification
2. Error handling follows established patterns
3. Database queries optimized (no N+1 queries)
4. Security middleware applied consistently

## Dependencies

### Internal:
- Authentication middleware updates
- Database schema validation
- Client-side API integration updates

### External:
- Supabase service availability
- Development environment stability

## Success Metrics

### Immediate (Week 1):
- Reduction in 404 errors to zero
- Critical user paths functional

### Short-term (Month 1):
- V1 routes completely removed
- API response consistency achieved
- Client-side errors eliminated

### Long-term (Month 3):
- Codebase complexity reduced
- Developer velocity improved
- System reliability increased

---

## Next Steps

1. **Approve PRD** - Stakeholder review and approval
2. **Create Implementation Plan** - Detailed task breakdown
3. **Set up Monitoring** - Error tracking and metrics
4. **Begin Phase 1** - Constants audit and planning
5. **Weekly Reviews** - Progress tracking and adjustments

---

*This PRD follows the Constants Workflow methodology to ensure systematic elimination of hardcoded values and establishment of maintainable, scalable API architecture.*