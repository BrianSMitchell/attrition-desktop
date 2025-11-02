# TypeScript Migration - Comprehensive PRD

**Document ID:** 0019-prd-typescript-migration.md  
**Created:** 2025-11-02  
**Status:** Active  
**Priority:** High  
**Effort Estimate:** 3-4 weeks

---

## 1. Introduction & Overview

The Attrition project is a monorepo with mixed JavaScript and TypeScript codebases. This PRD outlines a **phased, thorough TypeScript migration** to improve type safety, developer experience, and code maintainability across three critical packages: `shared`, `server`, and `desktop`.

**Core Problem:** JavaScript files lack type safety, making it harder to catch bugs at development time and increasing runtime errors in production. Inconsistent typing across packages creates friction when integrating between modules.

**Goal:** Migrate all production JavaScript files to TypeScript with gradual strictness improvements, ensuring type safety without breaking existing functionality.

---

## 2. Goals

1. **Eliminate Runtime Type Errors** - Convert all `.js` files to `.ts` in `packages/shared`, `packages/server`, and `packages/desktop`
2. **Improve Developer Experience** - Enable IDE autocomplete, IntelliSense, and compile-time error detection
3. **Increase Code Quality** - Establish type annotations and interfaces for better maintainability
4. **Ensure Stability** - All existing tests pass; no breaking changes to public APIs
5. **Enable Strict Mode** - Gradually move from moderate to strict TypeScript configuration
6. **Document Types** - Create clear type definitions and interfaces for complex objects
7. **Support Configuration Files** - Migrate all build/config `.js` files to TypeScript

---

## 3. User Stories

- **As a** developer working on the `shared` package, **I want** to have type-safe utility functions **so that** I catch errors before runtime and get autocomplete suggestions.

- **As a** server-side developer, **I want** all backend services to be fully typed **so that** I can refactor with confidence and understand data structures without guessing.

- **As an** Electron app developer, **I want** the desktop services and IPC handlers to be typed **so that** I avoid serialization bugs and type mismatches between processes.

- **As a** DevOps engineer, **I want** build and configuration files in TypeScript **so that** they're self-documenting and configurable with type safety.

- **As a** project maintainer, **I want** a clear migration roadmap **so that** I can prioritize work and measure progress throughout the process.

---

## 4. Functional Requirements

### Phase 1: Foundation (Weeks 1-1.5)
**Goal:** Migrate `packages/shared` - the foundation layer used by all other packages.

1. Convert all `.js` files in `packages/shared/src/` to `.ts` files
   - Constants in `constants/` folder (business-thresholds, configuration-keys, database-fields, etc.)
   - API utilities in `api/` folder (index.js, types.js, utils.js)
   - Game logic modules (buildings.js, capacities.js, defenses.js, energyBudget.js, etc.)
   - Main index.js file

2. Create TypeScript interfaces for exported objects and functions
   - Define strict types for all exported constants
   - Create enums for string-based constants (e.g., status values, configuration keys)
   - Document complex object structures with interfaces

3. Update `packages/shared/tsconfig.json` to `strict: true` (or plan for gradual migration)

4. Ensure all exports have explicit type annotations

5. Create a `types.ts` file documenting all public API types

6. Run full test suite; all tests must pass

7. Verify zero compilation errors with `pnpm type:check`

### Phase 2: Backend Services (Weeks 1.5-2.5)
**Goal:** Migrate `packages/server/src` - backend business logic and services.

1. Convert all `.js` files in `packages/server/src/` to `.ts` files
   - Core database and service files
   - Plugin system files (especially ESLint plugin in `plugins/eslint-plugin-attrition/`)
   - Request handlers and middleware

2. Create TypeScript interfaces for:
   - Request/response objects
   - Service method signatures
   - Database query results
   - Event payloads

3. Type the ESLint plugin rules:
   - id-consistency.js
   - max-complexity.js
   - no-excessive-logging.js
   - no-legacy-database-checks.js
   - service-extraction-required.js
   - Helper utilities (astHelpers.js, metricsIntegration.js)

4. Update server routes to have explicit parameter and return types

5. Migrate test configuration files:
   - jest.config.js → jest.config.ts
   - Other supporting config files

6. Run full test suite; all tests must pass

7. Verify zero compilation errors with `pnpm type:check`

### Phase 3: Desktop/Electron (Weeks 2.5-3.5)
**Goal:** Migrate `packages/desktop/src` - Electron main process and services.

1. Convert all `.js` files in `packages/desktop/src/` to `.ts` files
   - Main process (main.js)
   - Database integration (db.js)
   - Preload scripts (preload.js, preload.cjs)
   - All services in `services/` folder

2. Create TypeScript interfaces for:
   - Electron IPC message handlers
   - Window state and configuration
   - Service event signatures
   - Error logging and monitoring objects

3. Type the service layer:
   - certificatePinning.ts
   - errorLoggingService.ts
   - eventQueueService.ts
   - httpClient.ts
   - performanceMonitoringService.ts
   - updateService.ts

4. Ensure IPC handlers are properly typed (prevents serialization issues)

5. Migrate launcher package (`packages/launcher/src/`):
   - main.js → main.ts
   - preload.js → preload.ts
   - updateChecker.js → updateChecker.ts

6. Run full test suite and manual testing in Electron

7. Verify zero compilation errors with `pnpm type:check`

### Phase 4: Configuration & Build Files (Weeks 3.5-4)
**Goal:** Migrate remaining configuration files to TypeScript.

1. Convert root-level config files:
   - .eslintrc.js → .eslintrc.ts (or migrate to eslint.config.js)
   - Other root configs as appropriate

2. Convert package-level config files:
   - `packages/client/` jest and build configs
   - `packages/npc-memory-service/` configs
   - Any other `.js` config files

3. Update all tsconfig.json files to reference TypeScript configs

4. Ensure build process still works with TypeScript configs

### Cross-Phase Requirements (All Phases)

**Type Safety & Quality:**
- Gradual TypeScript strictness: Start with moderate settings, progress toward strict
- All public APIs must have explicit type annotations
- Complex objects must have TypeScript interfaces
- Return types must be explicitly specified for all functions
- No `any` types without `// @ts-ignore` comments with justification

**Testing & Validation:**
- All existing tests must pass after conversion
- Add new unit tests for converted modules with type coverage
- Run type checking: `pnpm type:check`
- Run linting: `pnpm lint`
- Run full test suite: `pnpm test`
- Verify no compilation errors: `tsc --noEmit`

**Configuration Management:**
- Update all `tsconfig.json` files for new source types
- Update `package.json` scripts to handle `.ts` files in output paths
- Ensure build tools (webpack, vite, etc.) recognize new file extensions
- Update exclude patterns to not process build artifacts

**Documentation:**
- Document any breaking type changes in MIGRATION.md
- Update module README files with TypeScript info
- Document complex type definitions inline with JSDoc/TSDoc comments

**Dependencies & Imports:**
- Update import paths to reference `.ts` files instead of `.js`
- Ensure all type definitions are imported correctly
- Update barrel exports (`index.ts`) with proper type re-exports

---

## 5. Non-Goals (Out of Scope)

- **Rewriting business logic** - Only type conversion, not refactoring
- **Major architectural changes** - Keep current structure, just add types
- **Updating dependencies** - Use current versions as-is
- **Complete rewrite of generated files** - Bundled assets (in `resources/assets/`) stay as-is
- **Converting node_modules** - Third-party packages unchanged
- **Changing runtime behavior** - All functionality remains identical

---

## 6. Design Considerations

### TypeScript Configuration Strategy

**Phased Strictness Approach:**
```
Phase 1-2: Moderate settings
- "strict": false
- Individual strict options enabled:
  - "noImplicitAny": true
  - "noImplicitThis": true
  - "strictNullChecks": true

Phase 3-4: Full strictness (after team is comfortable)
- "strict": true
- "noImplicitAny": true
- "noImplicitThis": true
- "strictNullChecks": true
- "strictFunctionTypes": true
- "strictBindCallApply": true
- "strictPropertyInitialization": true
- "noImplicitReturns": true
- "noFallthroughCasesInSwitch": true
```

### Type Definition Organization

- **`types/` folder** - Shared type definitions and interfaces
- **`constants.ts`** - Enums and constant types
- **Inline types** - Type definitions within source files (when module-specific)
- **Barrel exports** - `index.ts` files that re-export all types from a module

### File Naming Convention
- Converted files: `fileName.ts` (not `fileName.d.ts`)
- Type-only files: `fileName.types.ts` (if needed)
- Interface files: `fileName.interface.ts` (optional, only for large interface files)

---

## 7. Technical Considerations

### Dependencies & Compatibility

- **TypeScript version:** Must match current project setup (check `package.json`)
- **Node.js:** Minimum 18.0.0 (already required)
- **ts-node/tsx:** For running `.ts` files directly in Node
- **Type definitions:** Install `@types/*` packages as needed for dependencies

### Build Process Integration

- **Webpack/Vite:** Must be configured to handle `.ts` files (likely already done for client)
- **Jest:** ts-jest plugin should handle `.ts` test files (already configured)
- **ESLint:** Must recognize `.ts` files in linting rules
- **Pre-commit hooks:** Update to lint/type-check `.ts` files

### Migration Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Import path changes | Create migration script to update paths systematically |
| CommonJS vs ES modules | Maintain same module format during conversion |
| Type inference from dynamic values | Use `as const` assertions or explicit types |
| Circular dependencies | Resolve before or during migration |
| Untyped third-party packages | Create `.d.ts` stubs or use `any` with comments |
| Test file configuration | Ensure Jest recognizes `.ts` test files |

### Rollback Plan

- Keep `.js` files in git history for quick rollback
- Tag repo before each phase
- Maintain parallel branch for safety
- Document any breaking changes

---

## 8. Success Metrics

1. **Completeness:**
   - ✅ 100% of target `.js` files converted to `.ts`
   - ✅ Zero `.js` files in `packages/shared/src`, `packages/server/src`, `packages/desktop/src` (except generated/bundled files)

2. **Quality:**
   - ✅ `pnpm type:check` passes with zero errors
   - ✅ `pnpm lint` passes with zero errors
   - ✅ All unit tests pass (100% of existing tests)
   - ✅ No `any` types without documented justification
   - ✅ Code coverage maintained or improved

3. **Functionality:**
   - ✅ No breaking changes to public APIs
   - ✅ Electron app runs without errors
   - ✅ All services operate normally
   - ✅ No performance degradation

4. **Developer Experience:**
   - ✅ IDE autocomplete working for all modules
   - ✅ Type errors caught at compile time
   - ✅ Clear error messages for type violations

5. **Documentation:**
   - ✅ MIGRATION.md created with type changes documented
   - ✅ All complex types documented with JSDoc comments
   - ✅ Public API types exported and documented

---

## 9. Decisions (Finalized)

1. TypeScript Configuration Strictness: C — Phased approach (moderate → strict over next 2 releases).
2. Type Definitions for 3rd‑party libs: C — Prefer DefinitelyTyped; fallback A — author `.d.ts` stubs; avoid `any` unless justified with comments.
3. Handling Breaking Findings: A — Fix the underlying bug, even if it introduces a breaking change.
4. Configuration Files: A — Migrate configs to TypeScript; keep `.js` only where TS is unsupported by tooling.
5. Testing Strategy: A — Add new unit tests in Phase 1 and convert existing tests.

---

## 10. Implementation Timeline

| Phase | Duration | Target Packages | Key Deliverable |
|-------|----------|-----------------|-----------------|
| **1** | Weeks 1-1.5 | shared | Foundation types, all tests pass |
| **2** | Weeks 1.5-2.5 | server | Backend typed, plugins migrated |
| **3** | Weeks 2.5-3.5 | desktop, launcher | Electron app typed, all tests pass |
| **4** | Weeks 3.5-4 | root + all configs | Configuration files converted |
| **Wrap-up** | ~1 week | All packages | Documentation, final testing, strict mode planning |

**Total Effort:** 4-5 weeks with thorough testing and documentation

---

## 11. Acceptance Criteria

- [ ] All Phase 1, 2, 3, 4 files converted to TypeScript
- [ ] `pnpm type:check` passes with zero errors
- [ ] `pnpm lint` passes with zero errors
- [ ] `pnpm test` passes with 100% of existing tests passing
- [ ] No `any` types without justification comments
- [ ] All public APIs have explicit type annotations
- [ ] Complex objects have TypeScript interfaces
- [ ] MIGRATION.md created documenting all breaking changes (if any)
- [ ] Build process works without modification
- [ ] Electron app runs and functions normally
- [ ] No performance regressions
- [ ] Team agrees on future strict mode timeline

---

## 12. Related Documents

- `/tasks/0001-prd-*.md` - Other PRDs for reference
- Project README - Development setup
- Type definitions - To be created during migration
- MIGRATION.md - To be created post-migration

