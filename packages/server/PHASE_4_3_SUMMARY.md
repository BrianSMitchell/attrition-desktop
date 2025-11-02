# Phase 4.3: Update Request/Response Types in API Routes

## Overview
Updated API routes to use consistent, typed `ApiResponse<T>` and `PaginatedResponse<T>` wrappers instead of inline response objects.

## Changes Made

### 1. Created Response Builder Utilities
**File:** `src/utils/responseBuilder.ts`

Helper functions for creating properly typed responses:
- `createSuccessResponse<T>(data, message?, code?)` - Creates typed `ApiResponse<T>`
- `createErrorResponse(error, code?, message?)` - Creates typed error response
- `createPaginatedResponse<T>(data, pagination, message?, code?)` - Creates `PaginatedResponse<T>`
- `createPaginationMeta(page, limit, total)` - Helper to build pagination metadata
- `isPaginatedResponse<T>(response)` - Type guard for pagination detection

### 2. Updated API Routes

#### empireRoutes.ts
- Added import for response builders
- Updated 4 endpoints:
  - GET `/dashboard` - Now uses `createSuccessResponse(dashboardData)`
  - POST `/empire` - Uses typed error response
  - GET `/empire` - Uses `createSuccessResponse(dashboardData)`
  - GET `/credits/history` - Uses `createSuccessResponse({ history })`

#### unitRoutes.ts
- Added import for response builders
- Updated 28+ inline response objects across 10 endpoints:
  - GET `/catalog` - Catalog responses
  - GET `/defenses/catalog` - Defense catalog
  - GET `/defenses/status` - Status response with error handling
  - GET `/defenses/queue` - Queue list response
  - POST `/defenses/start` - Start construction with error codes
  - DELETE `/defenses/queue/:id` - Cancel with success/error responses
  - GET `/units/status` - Unit status with proper error handling
  - GET `/base-units` - Base units aggregation
  - GET `/units/queue` - Unit production queue
  - DELETE `/units/queue/:id` - Cancel unit production

### 3. Response Pattern Improvements

**Before:**
```javascript
res.json({ success: true, data: dashboardData });
res.status(400).json({ success: false, error: 'Missing field' });
```

**After:**
```javascript
res.json(createSuccessResponse(dashboardData));
res.status(400).json(createErrorResponse('Missing field', 'MISSING_FIELD'));
```

## Benefits

✅ **Type Safety** - All responses use correct `ApiResponse<T>` or `PaginatedResponse<T>` types  
✅ **Consistency** - Uniform response structure across all endpoints  
✅ **Maintainability** - Error codes and messages defined in one place  
✅ **Better Docs** - Type hints show what response structure consumers expect  
✅ **DRY Principle** - No duplicate response object construction  

## Files Modified

- `src/utils/responseBuilder.ts` (NEW)
- `src/routes/v1/empireRoutes.ts` (Updated: 4 endpoints)
- `src/routes/v1/unitRoutes.ts` (Updated: 10+ endpoints)

## Remaining Routes

The following v1 routes still need updates but are next in phase 4:
- `buildingRoutes.ts` - Structures and defenses
- `fleetRoutes.ts` - Fleet operations  
- `technologyRoutes.ts` - Tech research
- `territoryRoutes.ts` - Territory/base management

## Type System Integration

This update integrates with the new type system by:
1. Using centralized response wrapper types from `src/types/index.ts`
2. Leveraging error classes from `src/types/error.types.ts` (via errorHandler)
3. Creating consistent request/response contracts for API consumers
4. Enabling type inference for API client generation (future benefit)

## Testing Strategy

All updated endpoints:
- Maintain backward compatibility (same response structure)
- Use the same HTTP status codes as before
- Handle errors consistently through the error middleware
- Are covered by existing error scenarios

## Next Steps

- Phase 4.3 Continued: Update remaining route files (buildingRoutes, fleetRoutes, etc.)
- Phase 4.4: Migrate key services to use new types
- Phase 4.5: Run full type checking and linting
- Phase 4.6: Commit all Phase 4 changes
