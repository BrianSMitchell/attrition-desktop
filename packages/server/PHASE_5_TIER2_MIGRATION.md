# Phase 5: Tier 2 Service Migration Strategy

**Goal:** Migrate Tier 2 services to use typed errors and update remaining route files with response builders.

**Scope:** 4 services + 4 route files
**Estimated Duration:** 2-3 hours
**Type Safety:** Zero new type errors (like Phase 4)

---

## Tier 2 Services Analysis

### 1. StructuresService (`src/services/structures/StructuresService.ts`)

**Current Status:** Uses formatError/formatSuccess pattern + custom ServiceResult types

**Error Scenarios:**
- Empire not found (line 113) → NotFoundError
- Location not found (line 174) → NotFoundError  
- Location not owned (line 178) → ConflictError
- Tech requirements not met (lines 187-195) → ValidationError
- Building already exists (around line 200+) → ConflictError
- Insufficient credits (lines 200+) → BadRequestError
- No building capacity (lines 200+) → BadRequestError
- DB errors on insert/update → DatabaseError

**Strategy:**
- Replace formatError/formatSuccess with throw statements
- Remove ServiceResult union types
- Add explicit error context for database operations
- Maintain success response structure (will be wrapped by routes)

**Lines to Update:** ~150+ (medium-sized service)

### 2. ResourceService (`src/services/resources/ResourceService.ts`)

**Current Status:** Uses generic Error throws, simple methods

**Error Scenarios:**
- Empire not found (lines 43, 82) → NotFoundError
- Update failures → DatabaseError

**Strategy:**
- Replace `throw new Error()` with typed errors
- Add database error context
- Minimal changes needed (simpler service)

**Lines to Update:** ~20 (small service)

### 3. TechService (`src/services/tech/TechService.ts`)

**Current Status:** Returns error objects mixed with success objects (inconsistent)

**Error Scenarios:**
- Location not found (line 84) → NotFoundError
- Not owner (line 90) → ConflictError
- Requirements not met (line 117) → ValidationError
- Capacity error (line 128) → BadRequestError
- No capacity (line 136) → BadRequestError
- DB errors → DatabaseError

**Strategy:**
- Refactor to throw errors instead of returning error objects
- Remove console.log statements (many debug logs present)
- Consolidate success/error handling
- Routes will handle thrown errors

**Lines to Update:** ~100+ (complex service with debug logging)

### 4. FleetMovementService (`src/services/fleets/FleetMovementService.ts`)

**Current Status:** Unknown (7 static methods found)

**Strategy:**
- Read full file to understand error patterns
- Apply same typed error migration
- Likely has DB and validation errors

**Lines to Update:** TBD (need full review)

---

## Route Files Remaining

### 1. buildingRoutes.ts
- Uses formatError/formatSuccess pattern
- Deprecated endpoints (deprecation headers)
- Update to use response builders

### 2. fleetRoutes.ts  
- Check error patterns
- Update responses

### 3. technologyRoutes.ts
- Check error patterns
- Update responses

### 4. territoryRoutes.ts
- Check error patterns
- Update responses

---

## Migration Pattern (Applied Consistently)

### Pattern for Services

```typescript
// BEFORE
function formatError(code: string, message: string, details?: any) {
  return { success: false, code, message, details, error: message };
}

static async getStatus(empireId: string) {
  if (error || !empire) {
    throw new Error(ERROR_MESSAGES.EMPIRE_NOT_FOUND);
  }
  return { success: true, data: result, message: "OK" };
}

// AFTER
static async getStatus(empireId: string) {
  if (error) {
    throw new DatabaseError('Failed to fetch empire', 'GET_EMPIRE', {
      empireId,
      supabaseError: error.message
    });
  }
  if (!empire) {
    throw new NotFoundError('Empire', empireId);
  }
  return result;  // Caller wraps with response builder
}
```

### Pattern for Routes

```typescript
// BEFORE
app.get('/structures/status', async (req, res) => {
  try {
    const status = await StructuresService.getStatus(empireId);
    res.json({ success: true, data: status });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// AFTER
app.get('/structures/status', async (req, res) => {
  const status = await StructuresService.getStatus(empireId);
  res.json(createSuccessResponse(status));
});

// Error middleware handles thrown errors automatically
```

---

## Implementation Order (Recommended)

### Phase A: Services (4 services, low risk)

1. **ResourceService** (Easiest, fewest errors)
   - 2 simple methods
   - Just add NotFoundError for 2 cases
   - Estimated: 15 minutes

2. **StructuresService** (Medium complexity)
   - Multiple error paths
   - Remove formatError/formatSuccess pattern
   - Estimated: 45 minutes

3. **TechService** (Complex due to debugging)
   - Many console.logs to preserve
   - Mixed error/success returns
   - Estimated: 50 minutes

4. **FleetMovementService** (Unknown complexity)
   - Review first to assess effort
   - Estimated: 30-60 minutes

### Phase B: Routes (4 route files, low risk)

5. **buildingRoutes.ts** - Apply response builders
6. **fleetRoutes.ts** - Apply response builders
7. **technologyRoutes.ts** - Apply response builders
8. **territoryRoutes.ts** - Apply response builders

---

## Error Type Mapping for Phase 5

| Scenario | Error Type | Status Code |
|----------|-----------|------------|
| Resource not found | NotFoundError | 404 |
| User doesn't own resource | ConflictError | 409 |
| Invalid input/parameters | ValidationError | 422 |
| Tech/requirements not met | ValidationError | 422 |
| Insufficient resources (credits) | BadRequestError | 400 |
| No capacity/limits exceeded | BadRequestError | 400 |
| Database operation failed | DatabaseError | 500 |
| Location already in progress | ConflictError | 409 |

---

## Quality Checklist (Per Service)

- [ ] All `throw new Error()` replaced with typed errors
- [ ] All `formatError()` calls removed  
- [ ] All `return { success: false }` replaced with throws
- [ ] Database operations have error context
- [ ] Documentation updated (JSDoc)
- [ ] No type errors on compilation
- [ ] No new ESLint errors
- [ ] Service methods return clean data (not wrapped)

---

## Testing Strategy

Since Phase 4 established the error middleware pattern, Phase 5 can reuse that:

1. Services throw typed errors
2. Error middleware catches and formats
3. Routes use response builders for success paths
4. All error handling flows through errorHandler.ts middleware

**Validation:** Existing tests should still pass (behavior unchanged)

---

## Commit Strategy

Will follow atomic commit pattern:

- Commit 1: ResourceService migration
- Commit 2: StructuresService migration
- Commit 3: TechService migration
- Commit 4: FleetMovementService migration (if separate)
- Commit 5: Route file updates
- Commit 6: Final documentation

**Message Format:**
```
feat(services): migrate [ServiceName] to typed errors

- Replace formatError/return error objects with throw statements
- Use typed error classes (ValidationError, NotFoundError, etc.)
- Add database error context
- Maintain backward-compatible success responses

Refs: Task 5.X - Phase 5 Tier 2 Migration
```

---

## Risk Assessment

**Low Risk:**
- Error handling is isolated in services
- Phase 4 proved the pattern works
- Tests exist for core functionality
- Can revert individual services if needed

**Mitigation:**
- Test each service immediately after migration
- Verify response format consistency
- Check error codes match documentation
- Confirm type compilation clean

---

## Success Criteria

✅ All Tier 2 services use typed errors  
✅ All route files use response builders  
✅ Zero new type errors  
✅ Zero new ESLint errors  
✅ Backward compatible responses  
✅ Atomic commits with clear history  
✅ Comprehensive documentation  

---

## Next Steps After Phase 5

- Phase 6: Complete Tier 2 (if any services remain)
- Phase 7: Generate API client types
- Phase 8: Monitoring and telemetry integration

**Total Project Status After Phase 5:** 90%+ type safety adoption
