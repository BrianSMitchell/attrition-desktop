# TypeScript Migration Strategy Document

**Document ID:** Task 1.2 - Migration Strategy  
**Created:** 2025-11-02  
**Status:** Active  
**Last Updated:** 2025-11-02  
**Effort Estimate:** 4-5 weeks  
**Priority:** High  

---

## Executive Summary

This document outlines the **strategic approach** to migrating the Attrition project to TypeScript with **gradual strictness progression**. Based on the configuration audit (Task 1.1) and PRD requirements, this strategy balances **type safety** with **practical implementation speed**.

**Key Strategic Decision:** Instead of implementing full strict mode immediately, we'll use a **phased progression** from moderate to strict TypeScript settings, allowing developers to adapt and the codebase to stabilize.

---

## Part 1: Migration Overview

### 1.1 What We're Migrating

**Target Packages (In Order):**

| Phase | Package | Files | LOC | Status |
|-------|---------|-------|-----|--------|
| 1 | `packages/shared` | 0 | 0 | ✅ Already TypeScript |
| 2 | `packages/server` | 8 | 2,216 | ⚠️ Partially JS |
| 3 | `packages/desktop` | 9 | 5,202 | ⚠️ Partially JS |
| 3 | `packages/launcher` | 3 | ~1,500 (est) | ⚠️ Partially JS |
| 4 | Config files | Multiple | Various | ⚠️ Need coverage |
| — | **TOTAL** | **20+** | **~8,918+** | — |

### 1.2 Migration Philosophy

**NOT a rewrite.** This is **type annotation** of existing JavaScript code.

- ✅ Keep all business logic exactly the same
- ✅ Keep all file structure and organization
- ✅ Rename `.js` → `.ts` with minimal changes
- ✅ Add type annotations incrementally
- ❌ Don't refactor code during migration
- ❌ Don't change runtime behavior
- ❌ Don't reorganize file structure

**Why?** Separating type migration from refactoring = lower risk, easier review, clearer history.

---

## Part 2: Strictness Progression

### 2.1 The Phased Strictness Approach

**Problem we're solving:** Moving to strict mode (TypeScript's default recommendation) immediately is overwhelming and creates noise. Instead, we'll enable strictness **incrementally**, phase by phase.

```
                    Strictness Timeline
                    ==================

Phase 1-2           Phase 3-4           Future Releases
(Shared + Server)   (Desktop + Config)  (Strict Everywhere)
     │                   │                      │
     v                   v                      v
┌─────────────────┐  ┌────────────────┐  ┌──────────────┐
│  moderate:      │  │ moderate→strict│  │   strict:    │
│  base checks    │  │ incremental    │  │   full mode  │
│  enabled        │  │ improvements   │  │   enabled    │
└─────────────────┘  └────────────────┘  └──────────────┘
```

### 2.2 Configuration by Phase

#### Phase 1-2: Moderate Strictness (Foundation & Server)

**tsconfig.json settings:**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": false,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  }
}
```

**What this enables:**
- ✅ No implicit `any` — all types must be specified or inferred
- ✅ No implicit `this` — function methods must type `this`
- ✅ Null checks — code handles `null` and `undefined` explicitly
- ⚠️ Everything else from strict mode disabled (for now)

**Why this balance?**
- `noImplicitAny` catches most bugs (undeclared variables)
- `strictNullChecks` prevents null reference errors
- Other strict options deferred until team is comfortable
- Gives developers **breathing room** to adapt

#### Phase 3-4: Increased Strictness (Desktop & Config)

**Add to Phase 1-2 settings:**

```json
{
  "compilerOptions": {
    "strict": false,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

**What we're adding:**
- ✅ Function type checking — parameter types must match
- ✅ Return types required — all paths must return correct type
- ✅ Unused variable detection — catch dead code
- ✅ Switch fallthrough prevention — explicit `break` required

**Timeline:** Enabled by end of Phase 3, refined during Phase 4

#### Future Releases: Full Strict Mode

```json
{
  "compilerOptions": {
    "strict": true
  }
}
```

**Single setting enables:**
- All previous checks
- `strictNullChecks`
- `strictFunctionTypes`
- `strictBindCallApply`
- `strictPropertyInitialization`
- `noImplicitReturns`
- `noUnusedLocals`
- `noUnusedParameters`
- `noFallthroughCasesInSwitch`

**Timing:** After Phases 1-4 complete, propose in next release planning

---

## Part 3: Type Annotation Strategy

### 3.1 When to Annotate vs. Infer

#### Case 1: Simple Variables (Inference)
```typescript
// ❌ Over-annotated
const count: number = 42;
const name: string = "Alice";

// ✅ Let TypeScript infer
const count = 42;
const name = "Alice";
```

#### Case 2: Function Parameters (Always Annotate)
```typescript
// ❌ Bad — implicit any
function greet(name) {
  return `Hello, ${name}`;
}

// ✅ Good — explicit types
function greet(name: string): string {
  return `Hello, ${name}`;
}
```

#### Case 3: Complex Objects (Interface)
```typescript
// ❌ Messy — repeats everywhere
function processUser(user: { id: number; name: string; email: string }) {
  // ...
}

// ✅ Clean — interface once
interface User {
  id: number;
  name: string;
  email: string;
}

function processUser(user: User): void {
  // ...
}
```

#### Case 4: Arrays and Generics (Always Explicit)
```typescript
// ❌ Bad — unclear what's in array
const items = [];
items.push(42);
items.push("hello");  // ← Types mixed!

// ✅ Good — explicit type
const numbers: number[] = [];
numbers.push(42);
numbers.push("hello");  // ← TypeScript error!
```

### 3.2 Type Definition Locations

**By file purpose:**

| Location | Purpose | Examples |
|----------|---------|----------|
| `types.ts` | Shared types (package level) | User, Request, Response |
| `*.types.ts` | Module-specific types | UserService.types.ts |
| Inline | Simple, single-use types | Local interfaces in functions |
| Enums | Constant sets | Status, Role |
| `*.interface.ts` | Large interfaces only | If >50 lines |

### 3.3 TypeScript Patterns to Follow

#### Pattern 1: Const Assertions for Constants

```typescript
// ❌ Bad — loses specificity
const STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved'
};

const status: string = STATUS.PENDING;  // ← Could be any string!

// ✅ Good — preserves literal types
const STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved'
} as const;

type StatusType = typeof STATUS[keyof typeof STATUS];  // ← 'pending' | 'approved'
const status: StatusType = STATUS.PENDING;  // ← Type-safe
```

#### Pattern 2: Discriminated Unions for Complex Types

```typescript
// ❌ Bad — confusing structure
interface Result {
  success: boolean;
  data?: any;
  error?: any;
}

// ✅ Good — clear intent
type Result = 
  | { success: true; data: User }
  | { success: false; error: string };

// Usage type-checks correctly
function handle(result: Result) {
  if (result.success) {
    console.log(result.data.name);  // ← data exists here
  } else {
    console.log(result.error);  // ← error exists here
  }
}
```

#### Pattern 3: Generic Services

```typescript
// ✅ Good — reusable, typed service
interface Repository<T> {
  get(id: string): Promise<T>;
  list(): Promise<T[]>;
  create(item: T): Promise<T>;
}

// Specific implementation
class UserRepository implements Repository<User> {
  get(id: string): Promise<User> { /* ... */ }
  list(): Promise<User[]> { /* ... */ }
  create(item: User): Promise<User> { /* ... */ }
}
```

---

## Part 4: Phase-by-Phase Strategy

### 4.1 Phase 1: packages/shared (Foundation)

**Duration:** 1-1.5 weeks  
**Complexity:** Low (already mostly TypeScript)  
**Goal:** Establish type patterns for other phases

#### Key Files to Convert

All files in `packages/shared/src/`:
- ✅ Already TypeScript (mostly)
- Add comprehensive type definitions
- Create `types.ts` for public API

#### Configuration Requirements

```json
// packages/shared/tsconfig.json — KEEP AS IS
{
  "strict": true,
  "noImplicitAny": true,
  "noImplicitThis": true,
  "strictNullChecks": true
}
```

**Why full strict mode here?** Foundation packages should be most strict — they're used everywhere.

#### Success Criteria

- ✅ All exports have type annotations
- ✅ `types.ts` documents all public types
- ✅ `pnpm type:check` passes for shared
- ✅ All tests pass
- ✅ No breaking API changes

---

### 4.2 Phase 2: packages/server (Backend Services)

**Duration:** 1-1.5 weeks  
**Complexity:** Medium (8 files, 2,216 LOC)  
**Goal:** Type backend business logic and plugins

#### Key Files to Convert

**Core files:**
- `database.js` → `database.ts` (main database connection)
- Any service files (if exist)

**ESLint plugin (complex):**
- `plugins/eslint-plugin-attrition/lib/index.js`
- `plugins/eslint-plugin-attrition/lib/rules/*.js` (5 rules)
- `plugins/eslint-plugin-attrition/lib/utils/*.js` (helpers)

#### Configuration

```json
// packages/server/tsconfig.json — MODIFY
{
  "strict": false,
  "noImplicitAny": true,
  "noImplicitThis": true,
  "strictNullChecks": true,
  "noImplicitReturns": true
}
```

**Why not strict yet?** Backend has more complex patterns (decorators, plugins). Gradual is safer.

#### Special Considerations: ESLint Plugin

**Complexity:** High — AST manipulation, complex types

**Approach:**
1. Convert `astHelpers.js` first (helpers → types are clearer)
2. Then convert individual rules (each depends on helpers)
3. Finally convert `index.js`

**Type Patterns:**
```typescript
// Import ESLint types
import { Rule } from 'eslint';

// Type the rule structure
const rule: Rule.RuleModule = {
  meta: { /* ... */ },
  create(context) {
    return {
      // Type visitors
      'BinaryExpression': (node) => { /* ... */ }
    };
  }
};
```

#### Success Criteria

- ✅ All 8 `.js` files converted to `.ts`
- ✅ ESLint plugin typed (no `any` in plugin)
- ✅ `pnpm type:check` passes for server
- ✅ All server tests pass
- ✅ No plugin functionality changes

---

### 4.3 Phase 3: packages/desktop + packages/launcher

**Duration:** 1-1.5 weeks  
**Complexity:** High (12 files, 6,700+ LOC)  
**Goal:** Type Electron app and launcher

#### Key Files to Convert

**packages/desktop/src:**
- Core: `main.js`, `db.js`, `preload.js`, `preload.cjs`
- Services: 6 service files (error logging, monitoring, etc.)

**packages/launcher/src:**
- Core: `main.js`, `preload.js`
- Services: `updateChecker.js`

#### Special Considerations: Electron/IPC

**Challenge:** IPC (Inter-Process Communication) serializes data, losing types

**Solution:** Create strict types for IPC messages

```typescript
// Define message contracts
interface IPCMessage {
  channel: 'error-log' | 'update-check' | 'performance-data';
  data: ErrorLogData | UpdateCheckData | PerformanceData;
}

// Type the listeners
ipcMain.on('error-log', (event, data: ErrorLogData) => {
  // ← data is typed, no any!
});
```

#### Configuration

```json
// packages/desktop/tsconfig.json — CREATE (from template)
{
  "strict": false,
  "noImplicitAny": true,
  "noImplicitThis": true,
  "strictNullChecks": true,
  "noImplicitReturns": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true
}
```

#### Success Criteria

- ✅ All 12 `.js` files converted
- ✅ Electron app launches without type errors
- ✅ IPC messages properly typed
- ✅ All tests pass
- ✅ Manual testing: app runs normally

---

### 4.4 Phase 4: Configuration Files & Finalization

**Duration:** 1 week  
**Complexity:** Low (mostly file renames)  
**Goal:** Complete migration and document

#### Files to Convert

**Root level:**
- `.eslintrc.js` → `.eslintrc.ts` (or .mjs if unsupported)

**Package level:**
- `packages/*/jest.config.js` → `.ts` (where possible)
- Other build config files

#### Strictness Checkpoint: Increase to Phase 3-4 Levels

Update all packages to Phase 3-4 strictness:

```json
{
  "noImplicitAny": true,
  "noImplicitThis": true,
  "strictNullChecks": true,
  "strictFunctionTypes": true,
  "strictBindCallApply": true,
  "strictPropertyInitialization": true,
  "noImplicitReturns": true,
  "noUnusedLocals": true,
  "noUnusedParameters": true,
  "noFallthroughCasesInSwitch": true
}
```

#### Documentation Tasks

1. **TYPESCRIPT_MIGRATION_SUMMARY.md** — Overview of what was migrated
2. **TYPESCRIPT_BEST_PRACTICES.md** — Patterns to follow going forward
3. **README.md updates** — TypeScript setup instructions
4. **MIGRATION.md** — Breaking changes (if any)

#### Success Criteria

- ✅ All config files migrated
- ✅ Full test suite passes
- ✅ `pnpm type:check` passes across all packages
- ✅ No compilation errors
- ✅ All documentation complete
- ✅ Team trained on new patterns

---

## Part 5: Implementation Logistics

### 5.1 Git Strategy

#### Branching

```
main (production)
  ↑
  └─── feature/typescript-migration (long-lived feature branch)
         ├── Phase 1 commits
         ├── Phase 2 commits
         ├── Phase 3 commits
         └── Phase 4 commits
             ↓
            PR to main (single large PR OK given scope)
```

#### Commit Strategy

**One commit per sub-task** (as per Task List Management rule)

```bash
# After completing Task 1.1 in task list
git commit -m "feat(shared): add comprehensive type definitions" \
  -m "- Create types.ts with all public API types" \
  -m "- Document constant types with enums" \
  -m "- Update barrel exports" \
  -m "Refs: Task 1.1 from PRD-0019"
```

#### Git Tags for Phases

```bash
# After each phase completes
git tag -a "ts-migration-phase-1-complete" -m "TypeScript migration Phase 1 (shared)"
git tag -a "ts-migration-phase-2-complete" -m "TypeScript migration Phase 2 (server)"
git tag -a "ts-migration-phase-3-complete" -m "TypeScript migration Phase 3 (desktop)"
git tag -a "ts-migration-phase-4-complete" -m "TypeScript migration Phase 4 (config)"

# List tags
git tag -l "ts-migration*"
```

### 5.2 Testing Strategy

#### Per-Phase Testing

**After each phase:**
```bash
# Type checking
pnpm type:check

# Linting
pnpm lint

# Unit tests
pnpm test --filter=@game/[package]

# Build verification
pnpm build
```

#### Full Test Suite (After Each Phase)

```bash
# Complete verification
pnpm type:check && pnpm lint && pnpm test

# Build everything
pnpm build
```

#### Manual Testing

| Phase | Manual Test | Command |
|-------|-------------|---------|
| 1 | Shared module imports | `npm run type:check` |
| 2 | Server startup | `npm run start:dev` |
| 3 | Electron app launch | `npm run dev:desktop` |
| 4 | Build pipeline | `npm run build` |

### 5.3 Rollback Plan

**If migration breaks something:**

1. **Tag current state:**
   ```bash
   git tag "ts-migration-broken-at-phase-[N]"
   ```

2. **Identify issue:**
   - Was it a specific file conversion?
   - Was it a type definition problem?
   - Was it a build tool issue?

3. **Rollback options:**
   ```bash
   # Option 1: Revert entire phase
   git revert <phase-start-commit>..<phase-end-commit>
   
   # Option 2: Revert specific file
   git checkout <old-commit> -- <file>
   ```

4. **Document what went wrong** for team learning

---

## Part 6: Team Communication & Training

### 6.1 Communication Timeline

**Before Phase 1:**
- Share this strategy document
- Hold team briefing (30 min)
- Explain why each phase matters

**During Each Phase:**
- Weekly check-ins on progress
- Document common issues
- Share type patterns learned

**After Phase 4:**
- Full retrospective
- Document lessons learned
- Plan strict mode rollout

### 6.2 Team Training Plan

#### Training Materials

1. **TypeScript Migration Guide** (before Phase 1)
   - What's changing
   - Why we're doing it
   - How to read TypeScript errors

2. **Type Annotation Patterns** (during Phase 1)
   - When to annotate vs. infer
   - Common patterns
   - Anti-patterns to avoid

3. **ESLint Plugin Typing** (before Phase 2)
   - AST concepts
   - How to type visitor functions
   - Common plugin patterns

4. **Electron/IPC Typing** (before Phase 3)
   - IPC message contracts
   - Serialization considerations
   - Event handler typing

#### Knowledge Sharing Sessions

```
Week 1:  Kickoff + Strategy (30 min)
Week 2:  Type Annotations 101 (45 min)
Week 3:  Phase 1 retrospective + patterns learned (30 min)
Week 4:  ESLint plugin typing deep dive (1 hour)
Week 5:  Phase 2 retrospective (30 min)
Week 6:  Electron/IPC typing (1 hour)
Week 7:  Phase 3 retrospective (30 min)
Week 8:  Finalization + strict mode planning (45 min)
```

---

## Part 7: Baseline Metrics

### 7.1 Before Migration

**Files & Code Volume:**

| Package | Files | LOC | Status |
|---------|-------|-----|--------|
| shared | 0 | 0 | ✅ Already TS |
| server | 8 | 2,216 | ⚠️ JS |
| desktop | 9 | 5,202 | ⚠️ JS |
| launcher | 3 | ~1,500 | ⚠️ JS |
| **TOTAL** | **20** | **~8,918** | — |

**TypeScript Strictness:**

| Package | strict | Phase |
|---------|--------|-------|
| client | ✅ true | — (not migrating) |
| server | ✅ true | — |
| shared | ✅ true | — |
| desktop | ❌ N/A | 1→2 |
| launcher | ❌ N/A | 1→2 |

### 7.2 Success Metrics (Post-Migration)

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| Files in TypeScript | ~18 | ~38+ | 100% |
| Line coverage in TS | ~60% | ~100% | ✅ |
| Compilation errors | 0 (no build) | 0 | ✅ |
| Type errors caught at compile | 0 | Unknown | Measure & improve |
| Test coverage | Current | Current+ | ≥ Current |

### 7.3 Developer Experience Metrics

**To measure after migration:**
- Time to onboard new developers
- Bug reports related to types
- Code review feedback volume
- Build time impact

---

## Part 8: Future: Strict Mode Roadmap

### 8.1 When to Move to Full Strict Mode

**Timing:** 2-3 releases after Phase 4 completes

**Prerequisite Checklist:**
- [ ] Team comfortable with TypeScript
- [ ] No critical bugs from migration
- [ ] All packages at Phase 3-4 strictness
- [ ] Performance acceptable
- [ ] Linting/type checking part of CI/CD

### 8.2 Strict Mode Benefits

```
Before Strict Mode          After Strict Mode
──────────────────────      ────────────────
❌ Functions without       ✅ All functions
  return types               return types

❌ Unused variables        ✅ All variables
  silently ignored           used

❌ Null/undefined may      ✅ Must handle
  appear unexpectedly        null/undefined

❌ Fallthrough in          ✅ Explicit break
  switch statements          or return
```

### 8.3 Strict Mode Adoption Plan

```json
// Move from Phase 3-4 to Full Strict
{
  "compilerOptions": {
    "strict": true  // ← Single change enables all strict options
  }
}
```

**Effort:** Minimal if Phases 1-4 done well

---

## Part 9: Risk Mitigation

### 9.1 Potential Issues & Solutions

| Issue | Likelihood | Mitigation |
|-------|-----------|------------|
| Type inference incorrect | Low | Explicit types, comprehensive testing |
| Build times increase | Medium | Monitor, optimize if needed |
| Third-party type issues | Medium | Create `.d.ts` stubs as needed |
| Complex service typing | High | Pair programming during Phase 2 |
| Electron IPC issues | Medium | Early testing, clear type contracts |

### 9.2 Contingency Plans

**If Phase 1 takes too long:**
- Extend timeline by 1 week
- Don't compress subsequent phases
- Learn from delays

**If type checking slows builds significantly:**
- Use `tsc --noEmit` for type-only checking
- Parallel type checking in CI
- Cache compilation results

**If ESLint plugin is too complex:**
- Type only the public API first
- Leave internal helpers untyped initially
- Document complexity for future improvement

---

## Part 10: Definitions & Reference

### 10.1 Key Terms

| Term | Definition |
|------|-----------|
| Strict Mode | TypeScript's most restrictive settings for maximum type safety |
| Declaration File | `.d.ts` files that provide type info without implementation |
| Type Inference | TypeScript automatically determining types from code |
| Type Annotation | Explicit `variable: Type` syntax |
| Discriminated Union | Type that uses property values to narrow possibilities |
| Generic | Reusable type parameter (like functions with parameters) |

### 10.2 TypeScript Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Strict Mode Guide](https://www.typescriptlang.org/tsconfig#strict)
- [Type Checking Best Practices](https://www.typescriptlang.org/docs/handbook/)

---

## Part 11: Approval & Sign-Off

### 11.1 Strategy Approval

**This strategy requires approval on:**

- [ ] Phased strictness approach (moderate → strict)
- [ ] Phase durations and order
- [ ] Configuration settings per phase
- [ ] Type annotation guidelines
- [ ] Rollback procedures

### 11.2 Phase Gate Reviews

After each phase completes:
- Review metrics
- Assess developer impact
- Decide: proceed to next phase or extend

---

## Summary: The Migration Path

```
Current State (JS + TS mixed)
           ↓
Phase 1: Share package (types, patterns)
           ↓
Phase 2: Server backend (ESLint plugin challenge)
           ↓
Phase 3: Desktop + Launcher (Electron/IPC typing)
           ↓
Phase 4: Configuration + Strictness increase
           ↓
Future: Full strict mode (after team stabilizes)
           ↓
Production: All TypeScript, fully typed
```

**Timeline:** 4-5 weeks to complete Phases 1-4

**Investment:** High initial effort, significant long-term payoff in code quality and developer productivity

**Risk:** Low (migration, not refactoring)

---

## Appendix: Phase Checklist

### Phase 1 Completion Checklist

- [ ] All `packages/shared/src/*.js` → `.ts`
- [ ] `packages/shared/src/types.ts` created
- [ ] All exports have type annotations
- [ ] `pnpm type:check` passes
- [ ] All tests pass
- [ ] `SHARED_MIGRATION.md` created
- [ ] Team trained on type patterns
- [ ] Phase 1 complete commit tagged

### Phase 2 Completion Checklist

- [ ] All `packages/server/src/*.js` → `.ts` (8 files)
- [ ] ESLint plugin fully typed
- [ ] `packages/server/src/types/` created
- [ ] `pnpm type:check` passes for server
- [ ] All server tests pass
- [ ] `SERVER_MIGRATION.md` created
- [ ] Phase 2 complete commit tagged

### Phase 3 Completion Checklist

- [ ] All `packages/desktop/src/*.js` → `.ts` (9 files)
- [ ] All `packages/launcher/src/*.js` → `.ts` (3 files)
- [ ] `packages/desktop/tsconfig.json` created
- [ ] `packages/launcher/tsconfig.json` created
- [ ] IPC messages properly typed
- [ ] Electron app launches without errors
- [ ] All tests pass
- [ ] Manual testing complete
- [ ] `DESKTOP_MIGRATION.md` created
- [ ] Phase 3 complete commit tagged

### Phase 4 Completion Checklist

- [ ] Root `tsconfig.json` updated with all package references
- [ ] Config files converted to `.ts`
- [ ] Strictness increased to Phase 3-4 levels
- [ ] Full test suite passes
- [ ] Full build succeeds
- [ ] `MIGRATION.md` created
- [ ] `TYPESCRIPT_BEST_PRACTICES.md` created
- [ ] Team trained on new practices
- [ ] Retrospective completed
- [ ] Phase 4 complete commit tagged

---

**Document Complete** ✅

Next step: Begin Phase 1 implementation (Task 2.1)

