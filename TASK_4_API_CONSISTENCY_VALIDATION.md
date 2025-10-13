# Task 4: API Consistency Validation

## Overview
Validate and ensure all new routes follow established patterns and response formats across the entire API codebase.

## Functional Requirements
- **FR-12**: All new routes must follow the established response format: `{ success: boolean, data: any, error?: string }`
- **FR-13**: All new routes must require authentication via the existing middleware
- **FR-14**: All new routes must handle empire resolution consistently with existing patterns
- **FR-15**: All error responses must include appropriate HTTP status codes and error details

## Task List

### [x] Task 4.1: Audit Existing Game Routes Response Formats
- [x] 4.1.1: Analyze all existing `/api/game/*` routes for response format consistency
- [x] 4.1.2: Document response format patterns and identify any inconsistencies
- [x] 4.1.3: Create response format validation checklist

### [x] Task 4.2: Validate Authentication Middleware Usage
- [x] 4.2.1: Check all game routes use authentication middleware consistently
- [x] 4.2.2: Verify authentication error handling follows established patterns
- [x] 4.2.3: Ensure consistent user object structure across routes

### [x] Task 4.3: Validate Empire Resolution Consistency
- [x] 4.3.1: Audit empire resolution patterns across all game routes
- [x] 4.3.2: Ensure EmpireResolutionService is used consistently
- [x] 4.3.3: Standardize empire resolution error handling

### [ ] Task 4.4: Validate Error Response Patterns
- [x] 4.4.1: Audit HTTP status code usage across all routes
- [ ] 4.4.2: Ensure error response format consistency
- [ ] 4.4.3: Validate error details structure and completeness

### [ ] Task 4.5: Fix Any Inconsistencies Found
- [ ] 4.5.1: Implement response format fixes
- [ ] 4.5.2: Standardize authentication patterns
- [ ] 4.5.3: Fix empire resolution inconsistencies
- [ ] 4.5.4: Standardize error response formats

### [ ] Task 4.6: Create API Consistency Tests
- [ ] 4.6.1: Create automated tests for response format validation
- [ ] 4.6.2: Add authentication consistency tests
- [ ] 4.6.3: Add empire resolution consistency tests
- [ ] 4.6.4: Add error handling consistency tests

## Relevant Files
- `packages/server/src/routes/game/dashboard.ts` - ANALYZED - Authentication bypass issue
- `packages/server/src/routes/game/empire.ts` - ANALYZED - ✅ Consistent patterns
- `packages/server/src/routes/game/structures.ts` - ✅ **FIXED** - Now uses EmpireResolutionService
- `packages/server/src/routes/game/tech/index.ts` - ✅ **FIXED** - Now uses EmpireResolutionService
- `packages/server/src/routes/game/bases/index.ts` - ANALYZED - ✅ Consistent patterns (recently fixed)
- `packages/server/src/routes/game/fleets.ts` - ANALYZED - ✅ Consistent patterns
- `packages/server/src/routes/game/index.ts` - ANALYZED - Mixed patterns in test endpoints

## Progress Notes
- Starting Task 4.1: Auditing existing game routes response formats
- Completed Task 4.1.1: Analyzed 7 game route files
- Completed Task 4.1: Full audit complete with inconsistencies identified
- **CRITICAL FINDING**: 3 routes use manual empire resolution instead of EmpireResolutionService
- Completed Task 4.2.1: Authentication middleware analysis
- Completed Task 4.2: Authentication validation complete - ✅ Middleware consistent, ⚠️ User access patterns inconsistent
- Completed Task 4.3: Empire resolution audit complete - ❌ CRITICAL: 2 files need fixes
- ✅ **FIXED**: Replaced all manual empire resolution patterns with EmpireResolutionService
- ✅ **FIXED**: structures.ts - 4 routes now use EmpireResolutionService
- ✅ **FIXED**: tech/index.ts - 4 routes now use EmpireResolutionService

## Authentication Middleware Analysis (Task 4.2)

### ✅ **Authentication Middleware Usage - CONSISTENT**

**All 7 route files properly use authentication:**
1. `dashboard.ts` - ✅ `router.use(authenticate)`
2. `empire.ts` - ✅ `router.use(authenticate)`  
3. `structures.ts` - ✅ `router.use(authenticate)`
4. `tech/index.ts` - ✅ `router.use(authenticate)`
5. `bases/index.ts` - ✅ `router.use(authenticate)`
6. `fleets.ts` - ✅ `router.use(authenticate)`
7. `index.ts` - ✅ `router.use(authenticate)` (main game router)

**✅ RESULT**: All game routes properly require authentication (FR-13 ✅)

### ⚠️ **User Object Access Patterns - INCONSISTENT**

**Pattern 1 - EmpireResolutionService (Preferred)**:
```typescript
const user = req.user! as any;
const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
```
- Used by: `empire.ts`, `bases/index.ts`, `fleets.ts`

**Pattern 2 - Manual User ID Extraction (Inconsistent)**:
```typescript
const user = req.user! as any;
const userId = user?._id || user?.id;  // Manual extraction
// Then manual Supabase queries...
```
- Used by: `structures.ts`, `tech/index.ts`, main `index.ts`

**Pattern 3 - Direct Service Usage (Dashboard)**:
```typescript
const user = req.user! as any;
const dashboardData = await DashboardService.getDashboardData(user);
```
- Used by: `dashboard.ts` (service handles user resolution)

### ✅ **Authentication Error Handling - CONSISTENT**

**Middleware Error Responses (FR-15 compliant)**:
- `401` with `{ success: false, error: "Access denied. No token provided." }`
- `401` with `{ success: false, error: "Token has been revoked" }`
- `401` with `{ success: false, error: "Invalid token type" }`
- `401` with `{ success: false, error: "Token is not valid" }`

**✅ RESULT**: Authentication middleware follows consistent error format

### ✅ **User Object Structure - CONSISTENT**

**Authentication middleware provides standardized SupabaseUser object:**
```typescript
interface SupabaseUser {
  _id: string;        // Primary identifier
  id: string;         // Same as _id (for compatibility)
  email: string;
  username: string;
  role: 'user' | 'admin';
  gameProfile: {
    startingCoordinate?: string | null;
    empireId?: string | null;
  };
}
```

**✅ All routes receive consistent user object via `req.user`**

### ⚠️ **User ID Access Pattern Inconsistency**

**The main inconsistency is how routes access the user ID:**
- **Correct Pattern**: `const user = req.user! as any;` then use EmpireResolutionService
- **Inconsistent Pattern**: `const userId = user?._id || user?.id;` then manual queries

## Empire Resolution Consistency Audit (Task 4.3)

### ✅ **CONSISTENT Routes (Using EmpireResolutionService)**

**1. `empire.ts` - ✅ PERFECT**
```typescript
const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
if (!empireRow) {
  return res.status(404).json({ success: false, error: 'Empire not found' });
}
const empireId = String(empireRow.id);
```
- Used in: 2/2 routes (100%)

**2. `fleets.ts` - ✅ PERFECT**
```typescript
const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
if (!empireRow) {
  return res.status(404).json({ success: false, error: 'Empire not found' });
}
const empireId = String(empireRow.id);
```
- Used in: 4/4 routes (100%)

**3. `bases/index.ts` - ✅ PERFECT**
```typescript
const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
if (!empireRow) {
  return res.status(404).json({ success: false, error: 'Empire not found' });
}
const empireId = String(empireRow.id);
```
- Used in: 4/4 newly migrated routes (100%)

### ❌ **INCONSISTENT Routes (Manual Resolution)**

**4. `structures.ts` - ❌ MANUAL PATTERN**
```typescript
// Manual empire resolution (INCONSISTENT)
const userId = user?._id || user?.id;
let empireId: string | null = null;
const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
if (userRow.data?.empire_id) empireId = String(userRow.data.empire_id);
if (!empireId) {
  const e = await supabase.from('empires').select('id').eq('user_id', userId).maybeSingle();
  if (e.data?.id) empireId = String(e.data.id);
}
if (!empireId) return res.status(404).json({ success: false, error: 'Empire not found' });
```
- Used in: 4/4 routes (100% inconsistent)

**5. `tech/index.ts` - ❌ MANUAL PATTERN**
```typescript
// Same manual pattern as structures.ts
const userId = user?._id || user?.id;
// ... same manual Supabase queries ...
```
- Used in: 4/4 routes (100% inconsistent)

**6. `dashboard.ts` - ⚠️ BYPASSES EMPIRE RESOLUTION**
```typescript
// Passes user directly to service
const dashboardData = await DashboardService.getDashboardData(user);
```
- Service handles empire resolution internally

### ⚠️ **Mixed Patterns in `index.ts` (Test Routes)**

**Main game router has mixed patterns in test seeding endpoints:**
- Some use `EmpireResolutionService.resolveEmpireByUserObject()`
- Others use manual `supabase.from('empires').select().eq('user_id', userId)`

### 🎯 **Fix Requirements (FR-14 Compliance)**

**❌ CRITICAL FIXES NEEDED:**

1. **`structures.ts`** - Replace 4 instances of manual empire resolution
2. **`tech/index.ts`** - Replace 4 instances of manual empire resolution  
3. **`index.ts`** - Standardize test endpoint patterns

**✅ Target Pattern (Standard):**
```typescript
import { EmpireResolutionService } from '../../services/empire/EmpireResolutionService';

// In route handler:
const user = req.user! as any;
const empireRow = await EmpireResolutionService.resolveEmpireByUserObject(user);
if (!empireRow) {
  return res.status(404).json({ success: false, error: 'Empire not found' });
}
const empireId = String(empireRow.id);
```

**❌ Current Inconsistent Pattern (To Remove):**
```typescript
// REMOVE THIS PATTERN:
const userId = user?._id || user?.id;
let empireId: string | null = null;
const userRow = await supabase.from('users').select('id, empire_id').eq('id', userId).maybeSingle();
// ... manual resolution logic ...
```

### 📊 **Compliance Score:**
- **Compliant Routes**: 3/7 files (43%)
- **Non-compliant Routes**: 2/7 files (29%) - **CRITICAL**
- **Mixed/Special Cases**: 2/7 files (28%)

### ✅ **Empire Resolution Error Handling Analysis**

**✅ CONSISTENT Error Response (Good Pattern):**
```typescript
if (!empireRow) {
  return res.status(404).json({ success: false, error: 'Empire not found' });
}
```
- Used by: `empire.ts`, `fleets.ts`, `bases/index.ts` - **100% consistent**

**✅ CONSISTENT Error Response (Manual Pattern):**
```typescript
if (!empireId) return res.status(404).json({ success: false, error: 'Empire not found' });
```
- Used by: `structures.ts`, `tech/index.ts` - **Same result, different approach**

**✅ RESULT**: All routes return consistent empire not found errors:
- HTTP Status: `404`
- Format: `{ success: false, error: 'Empire not found' }`
- **FR-15 COMPLIANT** - Error handling is standardized

## Game Routes Analysis Results

### Files Analyzed:
1. `dashboard.ts` - 1 route (GET /dashboard)
2. `empire.ts` - 3 routes (GET /, GET /credits/history, deprecated routes)
3. `structures.ts` - 4 routes (catalog, status, queue, start, cancel)
4. `tech/index.ts` - 4 routes (catalog, status, start, queue, cancel)
5. `bases/index.ts` - 8 routes (4 existing + 4 newly migrated)
6. `fleets.ts` - 4 routes (list, overview, detail, move)
7. `index.ts` - Main router with test seeding endpoints

### Response Format Patterns Found:

#### ✅ **CONSISTENT PATTERNS (Good)**:
1. **Success Responses**: `{ success: true, data: {...} }`
2. **Error Responses**: `{ success: false, error: "message" }`
3. **Authentication**: All routes use `authenticate` middleware
4. **Empire Resolution**: Most routes resolve empire consistently

#### ⚠️ **INCONSISTENCIES IDENTIFIED**:

1. **Empire Resolution Methods**:
   - **Mixed approaches**: Some use `EmpireResolutionService`, others use manual resolution
   - **Example inconsistency**: 
     - `empire.ts`: Uses `EmpireResolutionService.resolveEmpireByUserObject()`
     - `structures.ts`: Uses manual `supabase.from('users').select().eq('id', userId)`
     - `tech/index.ts`: Uses manual empire resolution

2. **Error Response Variations**:
   - Some use `{ success: false, error: "message" }`
   - Others include additional fields like `code: "ERROR_CODE"`
   - Status code handling varies between routes

3. **Data Structure Variations**:
   - Some wrap data: `{ success: true, data: { catalog } }`
   - Others include message: `{ success: true, data: {...}, message: "..." }`

### Detailed Inconsistency Breakdown:

#### **Empire Resolution Inconsistency (Critical - FR-14)**

**✅ CONSISTENT (Using EmpireResolutionService)**:
- `empire.ts` - Uses `EmpireResolutionService.resolveEmpireByUserObject()`
- `bases/index.ts` - Uses `EmpireResolutionService.resolveEmpireByUserObject()` (newly migrated)
- `fleets.ts` - Uses `EmpireResolutionService.resolveEmpireByUserObject()` 

**❌ INCONSISTENT (Manual Resolution)**:
- `structures.ts` - Manual Supabase queries for empire resolution
- `tech/index.ts` - Manual Supabase queries for empire resolution
- `dashboard.ts` - Bypasses empire resolution entirely

#### **Response Format Inconsistency (Medium - FR-12)**

**✅ GOOD Examples**:
```typescript
// Consistent success format
{ success: true, data: { catalog } }
{ success: true, data: { empire: {...} } }

// Consistent error format  
{ success: false, error: 'Empire not found' }
```

**⚠️ INCONSISTENT Examples**:
```typescript
// Some routes add extra fields
{ success: true, data: {...}, message: 'Queue item cancelled' }
{ success: false, error: 'Error', code: 'ALREADY_IN_PROGRESS' }

// Mixed error structure
{ success: false, error: 'Empire not found' }
vs
{ success: false, code: 'EMPIRE_NOT_FOUND', error: 'Empire not found' }
```

#### **Status Code Inconsistency (Medium - FR-15)**

**Examples of inconsistent status code usage**:
- Some routes use `404` for "Empire not found"
- Others use `400` for validation errors inconsistently
- Error code mapping varies between routes

### Priority Assessment:

1. **HIGH PRIORITY**: Empire Resolution Inconsistency (FR-14 violation)
2. **MEDIUM PRIORITY**: Response format variations (FR-12 minor violations)
3. **LOW PRIORITY**: Status code standardization (FR-15 minor issues)

## API Consistency Validation Checklist

### ✅ **FR-12: Response Format Validation**

**Success Response Format**:
- [ ] Uses `{ success: true, data: {...} }` structure
- [ ] `success` field is always boolean `true`
- [ ] `data` field contains the response payload
- [ ] Optional `message` field for user-friendly messages (allowed but not required)

**Error Response Format**:
- [ ] Uses `{ success: false, error: "message" }` structure
- [ ] `success` field is always boolean `false`
- [ ] `error` field contains human-readable error message
- [ ] Optional `code` field for error classification (allowed but not required)
- [ ] Optional `details` field for additional error context

### ✅ **FR-13: Authentication Validation**

**Authentication Middleware**:
- [ ] Route uses `router.use(authenticate)` or individual route authentication
- [ ] No routes bypass authentication (except public endpoints)
- [ ] `req.user` object is available and validated
- [ ] Consistent user object structure access (`req.user._id` or `req.user.id`)

### ✅ **FR-14: Empire Resolution Validation**

**Empire Resolution Consistency**:
- [ ] Uses `EmpireResolutionService.resolveEmpireByUserObject(user)`
- [ ] No manual Supabase empire resolution queries
- [ ] Consistent empire not found handling: `404` status with `{ success: false, error: 'Empire not found' }`
- [ ] Empire ID properly extracted as `String(empireRow.id)`

### ✅ **FR-15: Error Handling Validation**

**HTTP Status Codes**:
- [ ] `200` - Successful operations
- [ ] `400` - Bad request/validation errors
- [ ] `401` - Authentication required (handled by middleware)
- [ ] `403` - Forbidden/authorization errors
- [ ] `404` - Resource not found (empire, fleet, base, etc.)
- [ ] `409` - Conflict (already in progress, duplicate operation)
- [ ] `500` - Server errors

**Error Details**:
- [ ] Error messages are descriptive and actionable
- [ ] Consistent error message format across similar operations
- [ ] No sensitive information leaked in error messages
- [ ] Database errors properly abstracted

### ✅ **Route-Specific Validation**

**Database Operations**:
- [ ] Proper error handling for Supabase operations
- [ ] Consistent null/undefined checking patterns
- [ ] Proper data type conversion (String(), Number(), etc.)

**Request Validation**:
- [ ] Required parameters validated with clear error messages
- [ ] Optional parameters have sensible defaults
- [ ] Input sanitization where necessary

**Response Construction**:
- [ ] Data properly formatted for frontend consumption
- [ ] Consistent field naming (camelCase preferred)
- [ ] No internal implementation details exposed
