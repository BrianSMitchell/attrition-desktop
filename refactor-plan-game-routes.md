# game/index.ts Refactoring Plan

**Date:** 2025-10-29  
**Target File:** `packages/server/src/routes/game/index.ts`  
**Current State:** 875 lines, 24 routes  
**Goal:** Reduce to <200 lines by extracting domain-specific routes

---

## Phase 1: Assessment ✅

### Current Structure

**File:** `routes/game/index.ts`
- **Lines:** 875
- **Total Routes:** 24
- **Methods:** 14 GET, 6 POST, 4 DELETE

### Route Breakdown by Domain

#### Already Extracted (3 subdirectories exist)
- ✅ `bases/` - Base management routes
- ✅ `tech/` - Technology routes
- ✅ `territories/` - Territory routes

#### Remaining in game/index.ts (to be extracted)

**1. Capacity Routes (1 route)**
- `GET /capacities/:coord` - Get base capacities

**2. Building/Location Routes (1 route)**
- `GET /buildings/location/:coord` - Get buildings at location

**3. Research Routes (1 route)**
- `GET /research` - Get research status

**4. Structure Routes (3 routes)**
- `GET /structures/catalog` - Get structure catalog
- `GET /structures/queue` - Get structure queue
- `DELETE /structures/cancel/:coord` - Cancel structure

**5. Defense Routes (4 routes)**
- `GET /defenses/catalog` - Get defense catalog
- `GET /defenses/status` - Get defense status
- `GET /defenses/queue` - Get defense queue
- `POST /defenses/start` - Start defense construction
- `DELETE /defenses/queue/:id` - Delete defense from queue

**6. Unit Routes (5 routes)**
- `GET /units/catalog` - Get unit catalog
- `GET /units/status` - Get unit status
- `POST /units/start` - Start unit production
- `GET /units/queue` - Get unit queue
- `DELETE /units/queue/:id` - Delete unit from queue

**7. Test/Seed Routes (4 routes)**
- `POST /test/seed-research` - Seed research data
- `POST /test/seed-defenses` - Seed defense data
- `POST /test/seed-structures` - Seed structure data
- `DELETE /test/buildings/queued/:catalogKey` - Delete test building

**8. Tech Routes (overlap with tech/ directory)**
- `GET /tech/catalog` - Get tech catalog
- `GET /tech/status` - Get tech status
- `POST /tech/start` - Start tech research

---

## Current File Organization

```
packages/server/src/routes/game/
├── index.ts (875 lines) ← TARGET
├── bases/
│   └── index.ts (496 lines)
├── tech/
│   └── index.ts (170 lines)
└── territories/
    └── index.ts (131 lines)
```

---

## Proposed Structure

```
packages/server/src/routes/game/
├── index.ts (<200 lines) ← Main router registration
├── bases/
│   └── index.ts (existing)
├── tech/
│   └── index.ts (existing - consolidate with tech routes from index)
├── territories/
│   └── index.ts (existing)
├── structures.ts (NEW - 150-200 lines)
│   ├── GET /structures/catalog
│   ├── GET /structures/queue
│   └── DELETE /structures/cancel/:coord
├── defenses.ts (NEW - 200-250 lines)
│   ├── GET /defenses/catalog
│   ├── GET /defenses/status
│   ├── GET /defenses/queue
│   ├── POST /defenses/start
│   └── DELETE /defenses/queue/:id
├── units.ts (NEW - 250-300 lines)
│   ├── GET /units/catalog
│   ├── GET /units/status
│   ├── POST /units/start
│   ├── GET /units/queue
│   └── DELETE /units/queue/:id
└── test-seeds.ts (NEW - 100-150 lines)
    ├── POST /test/seed-research
    ├── POST /test/seed-defenses
    ├── POST /test/seed-structures
    └── DELETE /test/buildings/queued/:catalogKey
```

**Note:** Capacity and Buildings routes will remain in index.ts as they're singular endpoints.

---

## Migration Strategy

### Priority Order (based on PRD recommendations)

1. **Test/Seed Routes** (easiest, self-contained)
2. **Structures Routes** (medium complexity)
3. **Defenses Routes** (similar pattern to structures)
4. **Units Routes** (similar pattern to defenses)
5. **Tech Routes** (consolidate with existing tech/ directory)
6. **Research Routes** (single endpoint, can stay in index.ts)

### Per-Domain Migration Steps

For each domain (e.g., structures, defenses, units):

1. **Create new route file** (e.g., `structures.ts`)
2. **Copy routes and dependencies** from index.ts
3. **Update imports** (supabase, constants, middleware)
4. **Export router** with proper typing
5. **Register in index.ts** (leave old routes temporarily)
6. **Test routes work** via API calls or tests
7. **Remove old routes** from index.ts
8. **Commit atomically** with descriptive message

---

## Risk Assessment

### Low Risk
- ✅ Test routes (isolated, low usage)
- ✅ Catalog endpoints (read-only, no side effects)

### Medium Risk
- ⚠️ Structure/Defense/Unit routes (production-critical)
- ⚠️ Queue management (stateful operations)

### Mitigation Strategies
1. **Keep old routes** until new ones verified
2. **Test each domain** independently before removing old code
3. **Atomic commits** - one domain at a time
4. **Rollback plan** - git revert if issues arise

---

## Success Criteria

### Primary Goals
- [ ] `game/index.ts` reduced to <200 lines
- [ ] All 24 routes still functional
- [ ] No API contract changes (same endpoints, same responses)
- [ ] All tests pass (if they exist)

### Secondary Goals
- [ ] Each new route file <300 lines
- [ ] Clear domain separation
- [ ] Consistent error handling across files
- [ ] Documentation updated

### Metrics

| Metric | Before | Target | Status |
|--------|--------|--------|--------|
| game/index.ts lines | 875 | <200 | ⏳ Pending |
| Total route files | 4 | 8+ | ⏳ Pending |
| Routes per file | 24 (1 file) | 3-6 avg | ⏳ Pending |
| Largest file | 875 lines | <500 lines | ⏳ Pending |

---

## Implementation Timeline

### Phase 1: Test Routes (Estimated: 30 minutes)
- Create `test-seeds.ts`
- Move 4 test routes
- Test and commit

### Phase 2: Structures Routes (Estimated: 45 minutes)
- Create `structures.ts`
- Move 3 structure routes
- Test and commit

### Phase 3: Defenses Routes (Estimated: 1 hour)
- Create `defenses.ts`
- Move 4 defense routes
- Test and commit

### Phase 4: Units Routes (Estimated: 1 hour)
- Create `units.ts`
- Move 5 unit routes
- Test and commit

### Phase 5: Tech Consolidation (Estimated: 30 minutes)
- Move remaining tech routes to `tech/index.ts`
- Verify no duplication

### Phase 6: Final Cleanup (Estimated: 30 minutes)
- Remove extracted routes from game/index.ts
- Update router registration
- Final testing
- Documentation update

**Total Estimated Time:** 4-5 hours

---

## Open Questions

1. **Should research route stay in index.ts or move to tech/?**
   - Single endpoint, could go either way
   - Recommendation: Move to tech/index.ts for consistency

2. **Should we create unit tests during refactoring?**
   - PRD says maintain existing functionality
   - Recommendation: Add characterization tests if time permits

3. **What about the fleets routes mentioned in PRD?**
   - Not found in game/index.ts (may be in separate file already)
   - Recommendation: Check if already refactored

4. **Should catalog endpoints be grouped separately?**
   - All domains have catalog routes (tech, structures, defenses, units)
   - Recommendation: Keep with their domains for now

---

## Dependencies & Imports

### Common Dependencies (all route files need)
```typescript
import { Router, Response } from 'express';
import { supabase } from '../../config/supabase';
import { asyncHandler } from '../../middleware/errorHandler';
import { authenticate, AuthRequest } from '../../middleware/auth';
import { HTTP_STATUS } from '@shared/response-formats';
import { DB_TABLES, DB_FIELDS } from '../../constants/database-fields';
```

### Domain-Specific Imports
- **Structures:** `getBuildingsList` from @game/shared
- **Defenses:** `getDefensesList` from @game/shared
- **Units:** `getUnitsList` from @game/shared
- **Tech:** `getTechnologyList` from @game/shared

---

## Testing Strategy

### Manual Testing Checklist (per domain)
- [ ] GET endpoints return expected data
- [ ] POST endpoints create/update correctly
- [ ] DELETE endpoints remove correctly
- [ ] Error cases return appropriate status codes
- [ ] Authentication required and working

### API Test Commands
```powershell
# Example: Test structures catalog
Invoke-WebRequest -Uri "http://localhost:3001/api/game/structures/catalog" `
  -Headers @{"Authorization"="Bearer $TOKEN"} `
  -Method GET

# Example: Test units queue
Invoke-WebRequest -Uri "http://localhost:3001/api/game/units/queue" `
  -Headers @{"Authorization"="Bearer $TOKEN"} `
  -Method GET
```

---

## Rollback Plan

If issues arise:

### Quick Rollback (during development)
```bash
git log --oneline -5  # Find commit before refactor
git revert [commit-hash]
```

### Full Rollback (if merged to main)
1. Revert the merge commit
2. Fix issues in feature branch
3. Re-merge when stable

---

## Next Steps

**Waiting for user approval to proceed to Phase 2 (Execution).**

Once approved, will begin with Phase 1: Test Routes extraction.

---

## Progress Tracking

- [x] **Phase 1: Assessment** ✅ Complete
- [ ] **Phase 2: Safety Net (Testing)** ⏳ Pending
- [ ] **Phase 3: Incremental Execution** ⏳ Pending
- [ ] **Phase 4: Validation** ⏳ Pending
- [ ] **Phase 5: Retrospective** ⏳ Pending

### Execution Progress (will update as we go)
- [x] Test Routes extracted ✅ (2025-10-29)
- [ ] Structures Routes extracted
- [ ] Defenses Routes extracted
- [ ] Units Routes extracted
- [ ] Tech Routes consolidated
- [ ] Final cleanup complete

---

**Plan Status:** ✅ Ready for Review  
**Approval Needed:** Yes - proceed to execution?
