# Phase 2: Backend Services Migration - Refactor Plan

**Document ID:** PHASE2_REFACTOR_PLAN_SERVER.md  
**Phase:** 2 of 4 (TypeScript Migration)  
**Target Package:** `packages/server/src`  
**Effort Estimate:** 1-1.5 weeks  
**Status:** Assessment & Planning Phase

---

## Executive Summary

The server package is largely TypeScript-ready with **136 TypeScript files** and only **8 JavaScript files**. All remaining JavaScript files are concentrated in the **ESLint plugin** (`src/plugins/eslint-plugin-attrition/`). This makes Phase 2 focused and low-risk.

**Scope:** Migrate 8 JavaScript files to TypeScript and verify all server services compile without errors.

---

## Current State Assessment

### File Statistics

| Metric | Count |
|--------|-------|
| Total JS/TS Files | 144 |
| TypeScript Files | 136 (94.4%) |
| JavaScript Files | 8 (5.6%) |
| TypeScript Complete | ✅ |

### JavaScript Files by Location

All 8 remaining JavaScript files are in **ESLint plugin**:

```
packages/server/src/plugins/eslint-plugin-attrition/
├── lib/
│   ├── index.js                                    (160 lines)
│   ├── rules/
│   │   ├── id-consistency.js                      (~80 lines)
│   │   ├── max-complexity.js                      (~120 lines)
│   │   ├── no-excessive-logging.js                (~100 lines)
│   │   ├── no-legacy-database-checks.js           (~90 lines)
│   │   └── service-extraction-required.js         (~110 lines)
│   └── utils/
│       ├── astHelpers.js                          (~200 lines)
│       └── metricsIntegration.js                  (~150 lines)
```

**Total Lines of Code to Migrate:** ~1,010 lines (ESLint plugin only)

### Package Structure

**Main Server Components (Already TypeScript):**
- ✅ `controllers/` - Route handlers
- ✅ `services/` - Business logic
- ✅ `models/` - Database models
- ✅ `routes/` - API routes
- ✅ `middleware/` - Express middleware
- ✅ `monitoring/` - Monitoring and metrics
- ✅ `systems/` - Game systems
- ✅ `utils/` - Utility functions
- ✅ `config/` - Configuration
- ✅ `constants/` - Constants

**Plugin System (Mixed):**
- ❌ `plugins/eslint-plugin-attrition/` - **[TARGET FOR MIGRATION]**

### TypeScript Configuration

**Current Status:**
- ✅ `tsconfig.json` exists and is properly configured
- ✅ ESLint and TypeScript linting enabled
- ✅ All TypeScript compilation passing (except ESLint plugin)
- ✅ Jest configuration supports `.ts` files

---

## Issues Found in ESLint Plugin

After initial review of `index.js`:

### 1. **Mixed Module Systems**
```javascript
// CommonJS (current)
const idConsistency = require('./rules/id-consistency');
module.exports = plugin;

// Should be ES6 imports/exports
import idConsistency from './rules/id-consistency';
export default plugin;
```

### 2. **Dynamic Imports Using String**
```javascript
// Current (not type-safe)
const { MetricsCollector } = await import('../../utils/codeMetrics/metricsCollector.js');

// Should be
import { MetricsCollector } from '../../utils/codeMetrics/metricsCollector';
```

### 3. **Missing Type Annotations**
- No explicit return types
- No parameter types
- Uses generic `any` implicitly
- Plugin meta/config not typed

### 4. **Processing Functions Need Typing**
```typescript
// Current (implicit any)
preprocess: function(text, filename) {
  return [{ text, filename }];
}

// Should be
preprocess(text: string, filename: string): { text: string; filename: string }[] {
  return [{ text, filename }];
}
```

---

## Migration Strategy

### Approach

**Goal:** Convert all 8 JavaScript files to TypeScript with proper typing while maintaining backward compatibility.

**Strategy:** 
1. Type ESLint rule interfaces first (foundation)
2. Migrate helper utilities (dependencies)
3. Migrate rule implementations (mid-level)
4. Migrate plugin index (top-level)
5. Comprehensive testing

### Conversion Challenges & Solutions

| Challenge | Risk | Solution |
|-----------|------|----------|
| ESLint types may need DefinitelyTyped | Medium | Install `@types/eslint` package |
| AST manipulation has implicit types | Medium | Create typed AST helper interfaces |
| Dynamic imports with strings | Medium | Use static imports where possible |
| Plugin export format (CJS vs ESM) | Low | Keep export format, add TS types |
| File extension handling (.js references) | Low | Update to .ts references |

---

## Success Criteria

### Phase 2 Completion Checklist

✅ **Code Quality:**
- [ ] All 8 JavaScript files converted to TypeScript
- [ ] No `any` types without justification comments
- [ ] All functions have explicit return types
- [ ] All parameters have explicit types
- [ ] ESLint rules properly typed with interfaces

✅ **Compilation:**
- [ ] TypeScript compilation clean (`npx tsc --noEmit`)
- [ ] No compilation warnings
- [ ] ESLint plugin compiles successfully
- [ ] All imports resolve correctly

✅ **Testing:**
- [ ] Existing tests pass (no regressions)
- [ ] ESLint plugin functions correctly
- [ ] Rules properly lint code
- [ ] Plugin configuration applies correctly

✅ **Documentation:**
- [ ] Added JSDoc comments to ESLint rules
- [ ] Documented type interfaces
- [ ] Updated plugin README (if exists)

✅ **Metrics:**
- [ ] 0 JavaScript files remaining in server/src
- [ ] 100% TypeScript coverage for src code
- [ ] Compilation time acceptable

---

## Proposed File Migration Order

### Phase 2A: Infrastructure (Dependencies)

**1. `lib/utils/astHelpers.ts`** (~200 lines)
- **Description:** AST manipulation utilities
- **Dependencies:** ESTree/TypeScript compiler
- **Risk Level:** Medium
- **Actions:**
  - Add return types to all functions
  - Create typed AST node interfaces
  - Add parameter types
  - Add JSDoc comments

**2. `lib/utils/metricsIntegration.ts`** (~150 lines)
- **Description:** Metrics collection integration
- **Dependencies:** Project config, metrics system
- **Risk Level:** Low
- **Actions:**
  - Type config objects
  - Add function signatures
  - Update dynamic import calls

### Phase 2B: ESLint Rules (Core)

**3. `lib/rules/id-consistency.ts`** (~80 lines)
- **Description:** Validates ID naming consistency
- **Dependencies:** astHelpers
- **Risk Level:** Low

**4. `lib/rules/no-excessive-logging.ts`** (~100 lines)
- **Description:** Detects excessive logging
- **Dependencies:** astHelpers
- **Risk Level:** Low

**5. `lib/rules/no-legacy-database-checks.ts`** (~90 lines)
- **Description:** Prevents legacy database patterns
- **Dependencies:** astHelpers
- **Risk Level:** Low

**6. `lib/rules/max-complexity.ts`** (~120 lines)
- **Description:** Enforces complexity limits
- **Dependencies:** astHelpers
- **Risk Level:** Medium

**7. `lib/rules/service-extraction-required.ts`** (~110 lines)
- **Description:** Requires service layer extraction
- **Dependencies:** astHelpers
- **Risk Level:** Medium

### Phase 2C: Plugin Entry Point (High-Level)

**8. `lib/index.ts`** (~160 lines)
- **Description:** ESLint plugin main entry
- **Dependencies:** All rule files
- **Risk Level:** Low (depends on others being correct)
- **Actions:**
  - Convert CommonJS to ES6 (keeping export format compatible)
  - Type plugin interface
  - Type config objects
  - Update dynamic imports

---

## Implementation Checklist

### Pre-Migration

- [ ] Read existing ESLint plugin rules to understand pattern
- [ ] Check @types/eslint availability and version
- [ ] Identify any external dependencies
- [ ] Create branch for Phase 2 (optional: `feature/phase-2-server-migration`)
- [ ] Verify no active development in server package

### Per-File Process

For each file:
1. [ ] Read and understand current implementation
2. [ ] Create `.ts` file with updated syntax
3. [ ] Add explicit type annotations
4. [ ] Add JSDoc comments
5. [ ] Update imports (remove `.js` extensions)
6. [ ] Run TypeScript compiler
7. [ ] Fix any type errors
8. [ ] Run tests (if applicable)
9. [ ] Delete old `.js` file
10. [ ] Commit with descriptive message

### Post-Migration

- [ ] Full TypeScript compilation check
- [ ] Run full test suite
- [ ] Verify ESLint plugin still works
- [ ] Update package.json if needed
- [ ] Update README/documentation
- [ ] Final review with checklist

---

## Estimated Effort

| Task | Effort | Notes |
|------|--------|-------|
| astHelpers migration | 1-2 hours | AST types complex but straightforward |
| metricsIntegration migration | 30-45 min | Simpler utility module |
| Each rule migration | 30-45 min each | 5 rules = 2.5-3.75 hours |
| Plugin index migration | 45-60 min | Consolidates and finalizes |
| Testing & verification | 1-2 hours | Ensure everything works |
| Documentation | 30-45 min | Comments and README |
| **Total Estimated** | **8-11 hours** | ~1-1.5 days focused work |

---

## Risk Assessment

### Low Risk ✅
- **Isolated files:** Only ESLint plugin affected
- **No API changes:** Pure internal refactor
- **Full TypeScript ready:** Server already 94% TypeScript
- **Clear structure:** Well-defined, small modules
- **Test coverage exists:** Can validate changes

### Medium Risk ⚠️
- **AST types:** Need proper ESLint type definitions
- **Dynamic imports:** May need refactoring
- **Plugin compatibility:** Must maintain ESLint plugin contract

### Mitigation Strategies
1. **Backup original files** before conversion
2. **Convert incrementally** with testing after each
3. **Keep export format** consistent with current
4. **Use @types/eslint** for type definitions
5. **Comprehensive testing** of plugin functionality

---

## Resources Needed

### Type Definitions
- `@types/eslint` - ESLint TypeScript types
- `@types/node` - Node.js types
- Compiler API types (built-in)

### Tools
- `tsc` - TypeScript compiler (already available)
- `eslint` - ESLint CLI (already available)
- Jest - Testing framework (already available)

### Documentation
- ESLint Plugin API: https://eslint.org/docs/latest/extend/plugins
- TypeScript Handbook: https://www.typescriptlang.org/docs/
- AST Specification: https://github.com/estree/estree

---

## Testing Strategy

### Automated Tests
1. **Compilation tests:** Run `tsc --noEmit`
2. **Linting tests:** Run `eslint` on test files
3. **Unit tests:** Run Jest test suite
4. **Plugin tests:** Verify plugin loads and rules work

### Manual Tests
1. **Plugin loading:** Test ESLint can load plugin
2. **Rule application:** Test each rule works on sample code
3. **Configuration:** Test different config profiles
4. **Integration:** Test with full ESLint setup

---

## Rollback Plan

If migration encounters critical issues:

1. **Revert git changes:** `git revert HEAD`
2. **Keep original .js files:** Still in repo history
3. **Notify team:** If on shared branch
4. **Reassess strategy:** Identify blocking issue

**Rollback Threshold:** If can't solve TypeScript errors after 2-3 hours per file

---

## Decision Points for User

### Before Starting Phase 2B

After migrating utils, ask user:

> **✅ Utilities Migrated**
> 
> - astHelpers.ts: ✅ Complete (0 errors)
> - metricsIntegration.ts: ✅ Complete (0 errors)
> 
> Ready to proceed with ESLint rules migration? (Continue/Review/Abort)

### After Each Major Chunk

After completing 2-3 rule files:

> **✅ Progress Update**
> 
> - Completed: [files list]
> - Remaining: [count] files
> - Compilation: Clean ✅
> - Tests: Passing ✅
> 
> Continue? (Continue/Review/Adjust)

### Before Phase Completion

After all migrations:

> **✅ Phase 2 Summary**
> 
> - 8 JavaScript files → 8 TypeScript files ✅
> - Compilation: 0 errors ✅
> - Tests: All passing ✅
> - Ready for Phase 3? (Approve/Review/Revise)

---

## Next Steps (After Approval)

1. **Get user approval** of this plan
2. **Start Phase 2A** with utility migrations
3. **Proceed incrementally** with checkpoints
4. **Document progress** in this file
5. **Move to Phase 3** once complete

---

## Progress Tracking

```
Phase 1 (Complete): Assessment & Planning ✅

Phase 2 (In Progress):
□ Phase 2A: Utilities
  □ astHelpers.ts
  □ metricsIntegration.ts
□ Phase 2B: ESLint Rules
  □ id-consistency.ts
  □ no-excessive-logging.ts
  □ no-legacy-database-checks.ts
  □ max-complexity.ts
  □ service-extraction-required.ts
□ Phase 2C: Plugin Index
  □ index.ts

Phase 3 (Not Started): Desktop/Electron Migration
Phase 4 (Not Started): Configuration & Build Files
```

---

## Key Success Factors

1. ✅ **Isolated scope:** Only ESLint plugin
2. ✅ **Clear dependencies:** Utils → Rules → Index
3. ✅ **Type definitions available:** @types/eslint exists
4. ✅ **Existing tests:** Can validate changes
5. ✅ **Small files:** Easy to review and fix
6. ✅ **Incremental approach:** Reduce risk
7. ✅ **Clear success metrics:** 0 errors, tests pass

---

## Questions for User

Before starting Phase 2 execution, clarify:

1. **Timeline:** Is 1-1.5 weeks acceptable for Phase 2?
2. **Strictness:** Should ESLint plugin follow same strict type rules as shared package?
3. **Testing:** Should we add new tests for ESLint rules during migration?
4. **Branch strategy:** Work on main branch or feature branch?
5. **Rollback threshold:** How many type errors before reverting?

---

## Appendix: File Size Reference

```
astHelpers.js                    ~200 lines
metricsIntegration.js           ~150 lines
no-excessive-logging.js         ~100 lines
no-legacy-database-checks.js    ~90 lines
id-consistency.js               ~80 lines
service-extraction-required.js  ~110 lines
max-complexity.js               ~120 lines
index.js                        ~160 lines
─────────────────────────────────────────
Total                           ~1,010 lines
```

All relatively small files, making this migration low-complexity compared to Phase 1.

---

**Status:** ✅ Ready for Approval and Execution

**Recommended Action:** Review plan, confirm success criteria, and proceed with Phase 2A
