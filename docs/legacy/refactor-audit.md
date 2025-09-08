# Codebase Refactor Audit and Recommendations

## Overview

This document identifies 10 high-impact files for refactoring based on an analysis of the codebase structure, complexity patterns, and alignment with existing `.clinerules` guidelines. The selection prioritizes files that are central to system functionality, show signs of technical debt, or would benefit from regularization with established patterns.

### Selection Criteria

1. **Functional Centrality**: Files handling core business logic or user interactions
2. **Technical Debt Indicators**: Complex methods, duplication, or known anti-patterns
3. **Rule Alignment Opportunities**: Files that could benefit from applying established `.clinerules`
4. **Risk Impact**: Changes that would improve maintainability, performance, or reliability
5. **Complexity Score**: Files with high cyclomatic complexity or multiple responsibilities

### Audit Scope

This audit focuses on server-side services, client-side components, and cross-cutting concerns. Files were evaluated using static analysis and cross-referenced with existing `.clinerules` to ensure recommendations align with established best practices.

## Summary Table

| # | File | Priority | Category | Related Rules |
|---|------|----------|----------|---------------|
| 1 | `packages/client/src/components/game/UniverseMap.tsx` | High | Canvas Performance | interactive-canvas-architecture.md, interactive-canvas-visualization.md |
| 2 | `packages/client/src/components/game/map/GalaxyView.tsx` | Medium | Canvas Architecture | interactive-canvas-architecture.md |
| 3 | `packages/server/src/services/structuresService.ts` | Critical | Service Reliability | dto-error-schema-and-logging.md, energy-budget-consistency.md, catalog-key-source-of-truth.md |
| 4 | `packages/server/src/services/techService.ts` | High | Service Consistency | dto-error-schema-and-logging.md, queue-idempotency.md |
| 5 | `packages/server/src/services/unitsService.ts` | High | Service Reliability | dto-error-schema-and-logging.md, queue-idempotency.md |
| 6 | `packages/server/src/services/gameLoopService.ts` | Critical | System Reliability | real-time-game-development.md |
| 7 | `packages/server/src/services/baseStatsService.ts` | Medium | Data Integrity | catalog-key-source-of-truth.md |
| 8 | `packages/client/src/components/game/StructuresBuildTable.tsx` | Medium | UI Consistency | tabular-build-ui-standard-and-test-plan.md, ui-table-consistency.md |
| 9 | `packages/client/src/components/game/ResearchLevelsModal.tsx` | Medium | UI Standardization | research-level-tables.md |
| 10 | `packages/server/src/services/capacityService.ts` | High | Calculation Parity | capacity-parity.md, energy-budget-helper.md |

## Detailed Recommendations

### 1. `packages/client/src/components/game/UniverseMap.tsx` - Canvas Performance Refactor

**Why:** This file manages complex interactive canvas rendering with animation loops, coordinate transformations, and multi-level zoom. Current implementation risks performance bottlenecks and maintenance issues.

**Current Issues:**
- Animation loop management may not be utilizing proper cleanup
- Coordinate transformation logic mixed with rendering
- Potential for memory leaks in event handlers

**Recommended Changes:**
- Extract a dedicated `CanvasAnimationManager` class to handle animation lifecycle
- Implement selective redraw optimization with change detection
- Create typed coordinate transformation utilities shared across zoom levels
- Add FPS monitoring and adaptive quality controls

**Expected Impact:**
- 60fps performance sustained under load
- Reduced memory usage and fewer leaks
- Improved maintainability with separation of concerns

**Risks:** High complexity change requiring careful testing across different zoom levels and interaction patterns.

**Related Rules:** `interactive-canvas-architecture.md`, `interactive-canvas-visualization.md`

### 2. `packages/client/src/components/game/map/GalaxyView.tsx` - Canvas Architecture Refactor

**Why:** This subview shares canvas rendering patterns with similar files, creating opportunities for code deduplication and consistent behavior.

**Current Issues:**
- Overlap with other map views in coordinate handling
- Potential for inconsistent hit detection across zoom levels
- Code duplication in rendering utilities

**Recommended Changes:**
- Centralize coordinate transformation logic into shared utilities
- Extract common rendering patterns into reusable modules
- Standardize zoom transition logic with proper state management
- Implement consistent error handling for coordinate validation

**Expected Impact:**
- Reduced code duplication by ~30%
- Consistent behavior across all zoom levels
- Improved testability of coordinate transformations

**Risks:** Medium risk due to potential cascading effects on related map components.

**Related Rules:** `interactive-canvas-architecture.md`

### 3. `packages/server/src/services/structuresService.ts` - Service Reliability Refactor

**Why:** This service handles structure building logic and is critical to game functionality. Current implementation needs alignment with multiple established patterns.

**Current Issues:**
- Start flow lacks consistent DTO/error response schemas
- Energy feasibility may not use centralized helpers
- Potential for identity conflicts in queue management

**Recommended Changes:**
- Implement canonical DTO/error schema with proper HTTP codes
- Require `catalogKey` on all requests, reject `INVALID_REQUEST` without it
- Use shared `energyBudget` helper for feasibility calculations
- Add logging with canonical fields (produced, consumed, balance, etc.)
- Implement idempotent start operations with DB-level uniqueness

**Expected Impact:**
- Consistent error handling across API endpoints
- Improved debugging with standardized logs
- Prevention of duplicate builds and resource corruption

**Risks:** Critical service - requires comprehensive testing and staged rollout.

**Related Rules:** `dto-error-schema-and-logging.md`, `energy-budget-consistency.md`, `catalog-key-source-of-truth.md`, `queue-idempotency.md`

### 4. `packages/server/src/services/techService.ts` - Service Consistency Refactor

**Why:** Research service mirrors structure building patterns and should maintain consistency in error handling and queue management.

**Current Issues:**
- Inconsistent response schemas with structures service
- Missing idempotency protections for concurrent research starts
- Time/capacity calculations may not align with UI expectations

**Recommended Changes:**
- Apply same DTO/error schema as structures with canonical codes
- Implement research-specific identity keys (`empireId + ":" + techCatalogKey`)
- Add idempotent start operations with 409 Conflict responses
- Standardize logging with research-specific fields
- Ensure labs capacity and time calculations are documented and testable

**Expected Impact:**
- Consistent API behavior across building/research/units
- Prevention of duplicate research queues
- Improved observability and debugging

**Risks:** High impact on research mechanics - needs careful validation.

**Related Rules:** `dto-error-schema-and-logging.md`, `queue-idempotency.md`

### 5. `packages/server/src/services/unitsService.ts` - Service Reliability Refactor

**Why:** Unit service contains queue-based start logic similar to structures/tech services and needs the same reliability patterns.

**Current Issues:**
- Error handling inconsistent with other queue services
- Missing idempotency guards and identity key enforcement
- Capacity constraints (hangar space, energy) not consistently validated

**Recommended Changes:**
- Implement canonical DTO/error schema with proper HTTP responses
- Add unit-specific identity keys adhering to pattern standards
- Ensure idempotent start operations with conflict detection
- Validate capacity constraints consistently with other services
- Standardize logging format with unit-specific context

**Expected Impact:**
- Uniform behavior across all queue-based services
- Prevention of duplicate unit construction
- Improved capacity constraint enforcement

**Risks:** Medium risk - affects unit production mechanics.

**Related Rules:** `dto-error-schema-and-logging.md`, `queue-idempotency.md`

### 6. `packages/server/src/services/gameLoopService.ts` - System Reliability Refactor

**Why:** Game loop is responsible for background processing and must be highly reliable with proper error recovery and resource management.

**Current Issues:**
- Background service may not implement singleton pattern properly
- Error handling in iteration loops could cause service failures
- Resource cleanup and graceful shutdowns may be incomplete

**Recommended Changes:**
- Confirm singleton implementation with proper instance management
- Wrap processing iterations in safe error boundaries that continue on failures
- Implement graceful shutdown with complete resource cleanup
- Add structured logging around processing steps and transitions
- Ensure atomic operations for state transitions (queued → active)

**Expected Impact:**
- Improved system resilience and availability
- Better error isolation and recovery
- Consistent resource processing without service interruptions

**Risks:** Critical system component - requires extensive testing and monitoring.

**Related Rules:** `real-time-game-development.md`

### 7. `packages/server/src/services/baseStatsService.ts` - Data Integrity Refactor

**Why:** Base stats service handles aggregation logic that likely encounters legacy data and needs proper handling of missing `catalogKey` fields.

**Current Issues:**
- May still contain legacy building type inference logic
- Diagnostics flows need consistent skip-with-log behavior
- Aggregation accuracy depends on complete catalog key migration

**Recommended Changes:**
- Remove all legacy type→key mapping logic completely
- Implement skip-with-diagnostic pattern for missing catalogKey
- Use only canonical shared catalog helpers for spec resolution
- Add comprehensive tests for skip behavior and diagnostic logging

**Expected Impact:**
- Elimination of legacy data handling inconsistencies
- Improved diagnostic clarity until data migration complete
- Better aggregation accuracy and maintainability

**Risks:** Low risk - primarily affects diagnostics and reporting.

**Related Rules:** `catalog-key-source-of-truth.md`

### 8. `packages/client/src/components/game/StructuresBuildTable.tsx` - UI Consistency Refactor

**Why:** Build tables across the application share structural patterns and styling that should be consolidated for maintainability and consistency.

**Current Issues:**
- Repeated table structures across Structures, Research, Defenses, Units
- Inconsistent disabled button tooltips and column alignments
- Sorting and eligibility rendering duplicated

**Recommended Changes:**
- Extract reusable `BuildTable` base component with typed column definitions
- Implement consistent eligibility rendering with reason tooltips
- Standardize column alignment (right-aligned actions) and sorting (credits ascending)
- Create shared column renderer utilities for numbers and status indicators

**Expected Impact:**
- ~50% reduction in table component code duplication
- Consistent user experience across build interfaces
- Improved maintainability for future table additions

**Risks:** Medium risk - requires coordinated changes across multiple components.

**Related Rules:** `tabular-build-ui-standard-and-test-plan.md`, `ui-table-consistency.md`

### 9. `packages/client/src/components/game/ResearchLevelsModal.tsx` - UI Standardization Refactor

**Why:** Research levels modal handles metric selection and formatting that must conform to established standards and source-of-truth modules.

**Current Issues:**
- Metric logic may not be using canonical constants exclusively
- Credits-only table detection may be inconsistent
- Header labels and formatting may vary from standards

**Recommended Changes:**
- Import required constants exclusively from `levelTables/research/metrics.ts`
- Implement credits-only detection and rendering (2-column layout)
- Enforce exact header labels for specialized metrics (Ion, Disruptor)
- Add unit tests for metric selection logic and formatting

**Expected Impact:**
- Elimination of metric logic duplication and inconsistencies
- Proper credits-only table behavior with consistent styling
- Improved test coverage for edge cases

**Risks:** Low risk - primarily affects research display logic.

**Related Rules:** `research-level-tables.md`

### 10. `packages/server/src/services/capacityService.ts` - Calculation Parity Refactor

**Why:** Capacity calculations drive construction time and ETA display, requiring perfect parity between server computation and client presentation.

**Current Issues:**
- May not be using centralized shared capacity data
- Time calculations may not match client expectations
- Missing parity validation tests

**Recommended Changes:**
- Ensure capacity service sources all data from `@game/shared/capacities`
- Implement exact ETA formula: `minutes = max(1, ceil((creditsCost / constructionPerHour) * 60))`
- Add client-side integration tests for ETA parity
- Create small shared formatter utility if needed for consistency

**Expected Impact:**
- Perfect parity between server time calculations and UI estimates
- Elimination of timing discrepancies and user confusion
- Improved testing coverage for boundary conditions

**Risks:** Medium risk - affects game timing accuracy.

**Related Rules:** `capacity-parity.md`, `energy-budget-helper.md`

## Phased Execution Plan

### Phase 1: Critical Services (Risk Mitigation Focus)
1. `structuresService.ts` - Highest priority due to core game mechanics
2. `gameLoopService.ts` - Critical for system reliability
3. `capacityService.ts` - Important for calculation accuracy

### Phase 2: Consistency Services
4. `techService.ts` - Align with structures patterns
5. `unitsService.ts` - Complete service consistency
6. `baseStatsService.ts` - Clean up legacy data handling

### Phase 3: UI Refactors (User-Facing Impact)
7. `UniverseMap.tsx` - Performance improvements
8. `GalaxyView.tsx` - Architecture cleanup
9. `StructuresBuildTable.tsx` - Table consolidation
10. `ResearchLevelsModal.tsx` - UI standards compliance

### Testing Strategy
- **Unit Tests**: Add tests for each major refactor target
- **Integration Tests**: Validate cross-system interactions
- **End-to-End Tests**: Use existing protocol for user journey validation
- **Performance Tests**: Monitor impact of optimization changes
- **Staged Rollout**: Implement changes incrementally with feature flags

### Success Metrics
- ✅ Code duplication reduced by >40%
- ✅ Consistent error handling across services
- ✅ Perfect server-client parity in calculations
- ✅ Improved test coverage (>80% for touched files)
- ✅ Zero regression in user journeys
- ✅ Performance improvements in canvas rendering

## E2E Idempotency Follow-ups (Low-risk, focused) — Completed 2025-08-30

Status: Completed. Structures and Research stabilized using deterministic seeding/polling and direct API POST pair; Units remains skipped until a start path exists.

Implemented strategy:
- Test-only seeding routes (NODE_ENV=test):
  - POST /api/game/test/seed-structures
  - POST /api/game/test/seed-research
- Optional cleanup for blockers:
  - DELETE /api/game/test/buildings/queued/:catalogKey (e.g., robotic_factories)
- Server-authoritative eligibility polling:
  - GET /api/game/bases/:coord/structures → items[i].canStart === true
  - GET /api/game/tech/status?base=:coord → tech canStart === true
- Deterministic selection:
  - Base: coord returned by seeding
  - Target: first eligible from priority list
- Idempotency assertion via direct API POST pair (avoids UI timing flake):
  - Structures: POST /api/game/structures/start twice with identical payload
  - Research: POST /api/game/tech/start twice with identical payload
- Acceptance: exactly one 200 and one 409 OR canonical JSON with code ALREADY_IN_PROGRESS
- Observed logs (for diagnosis only):
  - [StructuresService.start] idempotent identityKey=… state=queued|active itemId=…
  - [TechService.start] idempotent identityKey=… state=pending|queued itemId=…

Note: This supersedes the earlier browser double-click approach for idempotency. UI flows remain validated elsewhere; the idempotency race is asserted deterministically at the API layer per .clinerules/dto-error-schema-and-logging.md and .clinerules/queue-idempotency.md.

To convert the updated Structures/Research specs from “skipped due to no enabled Start” into deterministic PASS, apply these test-harness refinements:

1) Strengthen seeding for UI parity
   - After calling test-only seeds, poll GET /api/game/bases/:coord/structures for a short timeout until at least one item shows data.items[i].canStart === true.
   - Optionally, clean queued blockers: DELETE /api/game/test/buildings/queued/:catalogKey for a couple of high-probability keys to remove queued entries before scanning the table.

2) Select base deterministically
   - In specs, use the same baseCoord returned/used by the seeding step and ensure the BaseDetail UI has that coord selected (if supported by the UI, e.g., via test id or deterministic index).

3) Add a short wait for UI refresh after seeding
   - e.g., await page.waitForTimeout(250–500ms) before re-querying for enabled Start buttons to allow client state/UI to reflect server changes.

Rationale:
- Keeps the browser-based double-click pattern (validating front-end behavior) while reducing flake from server–UI synchronization.
- Mirrors the already passing Defenses E2E acceptance (one 200 + one 409 or canonical ALREADY_IN_PROGRESS payload) by ensuring eligibility exists at scan time.

## Status Update — 2025-08-30

- Refactored files progress: 4/10 complete
  - packages/client/src/components/game/UniverseMap.tsx — performance/architecture refactor per interactive-canvas rules
  - packages/server/src/services/structuresService.ts — DTO/error schema, idempotency, energy feasibility, ETA parity
  - packages/server/src/services/techService.ts — DTO/error schema and idempotency stabilization
  - packages/server/src/services/baseStatsService.ts — catalogKey-only aggregation; added standardized skip diagnostic:
    [BaseStatsService] skip: missing catalogKey _id=<id>

- Proposed next target: packages/server/src/services/capacityService.ts (Capacity Parity)
  - Goal: Lock in server–client ETA parity with explicit unit tests per .clinerules/capacity-parity.md
  - Scope (small, atomic):
    - Add tests that, given constructionPerHour and creditsCost, assert:
      minutes = max(1, ceil((creditsCost / constructionPerHour) * 60))
    - Include boundary cases: near-0 capacity (blocked path), exact hour boundary, and 1-minute floor
    - Confirm service is sourcing capacities from @game/shared and returning constructionCapacityCredPerHour consumed by StructuresService
  - Acceptance:
    - Tests pass and guard against regressions in ETA formula and rounding
    - No change to existing runtime behavior beyond added tests

## Status Update — 2025-08-30 (Capacity Parity Verified)

- Implemented server unit tests to lock capacity parity:
  - File: `packages/server/src/__tests__/capacityService.eta-parity.test.ts`
- Coverage:
  - Verifies ETA: `minutes = max(1, ceil((creditsCost / constructionPerHour) * 60))`
  - Boundary cases:
    - 1-minute floor when derived minutes < 1
    - Exact 60 minutes at the hour boundary
    - 60.1 minutes rounds up to 61
  - Confirms `StructuresService.start` returns `etaMinutes` consistent with `constructionCapacityCredPerHour`
  - Confirms `CapacityService.getBaseCapacities` passes through `construction.value` from `@game/shared.computeAllCapacities`
- Result:
  - All server tests pass (17/17 suites, 49/49 tests), including the new capacity parity suite
  - No production/runtime code changes were required; parity is verified and guarded by tests
- Refactor progress note:
  - Capacity parity for `capacityService` is now verified by tests and protected against regressions
  - Refactored files progress remains 4/10; capacity parity marked as “verified via tests” for `capacityService`

Status Update — 2025-08-30 (UnitsService Parity Verified)

- Implemented and verified UnitsService — Idempotency + DTO Parity:
  - Canonical DTO/error schema observed in start path:
    - success false errors include code/message/error mirror and details
    - NOT_OWNER, INVALID_REQUEST, TECH_REQUIREMENTS, INSUFFICIENT_RESOURCES, NO_CAPACITY
    - ALREADY_IN_PROGRESS returned via centralized formatter with details { queueType, identityKey, catalogKey, existing }
  - Idempotency behaviors:
    - Pre-check: UnitQueue.findOne({ identityKey, status: 'pending' }) returns ALREADY_IN_PROGRESS with existing metadata
    - Duplicate key race (11000) mapped to ALREADY_IN_PROGRESS
    - Router-level mapping returns HTTP 409 for ALREADY_IN_PROGRESS
  - Success payload includes:
    - queueId, unitKey, completesAt, etaMinutes, productionCapacityCredPerHour
  - ETA computation:
    - minutes = max(1, ceil((creditsCost / production.value) * 60)) using CapacityService.getBaseCapacities().production.value

- Tests confirming parity:
  - packages/server/src/__tests__/unitsService.start.test.ts
  - packages/server/src/__tests__/unitsService.idempotency.test.ts
  - packages/server/src/__tests__/services.dto-format.test.ts
  - packages/server/src/__tests__/routes.idempotency.test.ts

- Result:
  - All server tests pass (17/17 suites, 49/49 tests) with UnitsService parity verified
  - No production code changes needed

Next proposed baby step (small, atomic):
- Target: `packages/server/src/services/defensesService.ts` (Parity audit + log tag consistency)
  - Objective: Reconfirm DTO/error schema and idempotency details mirror canonical shapes; ensure any idempotency log tags are consistent with `[DefensesService.start]`
  - Scope:
    - Review existing tests; add focused assertions only if a gap is found
    - Apply minimal changes if tests reveal drift
  - Acceptance:
    - Tests remain green; no regressions; canonical DTOs preserved

## Status Update — 2025-08-31 (DefensesService Parity Verified)

- Implemented and verified DefensesService — Idempotency + DTO Parity:
  - Canonical DTO/error schema observed in start path:
    - success false errors include code/message/error mirror and details
    - NOT_FOUND, INVALID_REQUEST, TECH_REQUIREMENTS applicable; ALREADY_IN_PROGRESS forwarded from StructuresService
  - Idempotency behaviors:
    - Delegates to StructuresService.start('jump_gate'); returns canonical ALREADY_IN_PROGRESS payload with details { queueType, identityKey, catalogKey, existing } when present
    - Router-level mapping returns HTTP 409 for ALREADY_IN_PROGRESS on /api/game/defenses/start
  - Logging:
    - On failure passthrough, emits diagnostic line with [DefensesService.start] mapped start failed { code, message, details, reasons }
  - Capacity/ETA passthrough:
    - Where present, etaMinutes and constructionCapacityCredPerHour are forwarded from StructuresService result

- Tests confirming parity:
  - packages/server/src/__tests__/defensesService.idempotency.test.ts
  - packages/server/src/__tests__/services.dto-format.test.ts
  - packages/server/src/__tests__/routes.idempotency.test.ts

- Result:
  - All server tests pass (17/17 suites, 49/49 tests)
  - No production code changes required

- Acceptance:
  - Canonical DTOs preserved; ALREADY_IN_PROGRESS includes details.identityKey and details.existing when provided
  - HTTP 409 mapping verified at router level; log tag consistency maintained

## Status Update — 2025-08-31 (Phase 3 UI Consolidation Complete)

- Completed: BuildTable consolidation and Research Levels modal standardization
  - New base component:
    - packages/client/src/components/game/BuildTable.tsx
      - Implements standardized table container/header, sticky thead, compact rows, first-column name/description/reasons line, right‑aligned action column with disabled tooltip, and default credits‑ascending sorting hook
      - Supports custom headers (first column and action column)
  - Migrated tables (now using BuildTable):
    - packages/client/src/components/game/DefensesBuildTable.tsx
      - Columns: Defense | Credits | Energy | Area | Requires | Start
    - packages/client/src/components/game/UnitsBuildTable.tsx
      - Columns: Unit | Credits | Energy | Hangar | Requires | Start
    - packages/client/src/components/game/StructuresBuildTable.tsx
      - Columns: Structure | Credits | Energy | Economy | Population | Area | Advanced | Requires | Time | Build
      - Preserves active construction countdown label and global disable semantics
    - packages/client/src/components/game/ResearchBuildTable.tsx
      - Columns: Technology | Credits | Labs | Requires | Effect | Time | Start
      - Header summary now shows Credits and Labs (consistent with spec)
  - Standardized modal:
    - packages/client/src/components/game/ResearchLevelsModal.tsx
      - Uses only canonical selectors/labels from levelTables/research/metrics.ts:
        - METRIC_LABELS, METRIC_KIND, selectVisibleMetricKey, computeHasCreditsOnly
      - Implements credits‑only detection with strict two‑column layout and empty‑state colSpan=2
      - Enforces exact metric headers, including:
        - Ion: "Ion Weapons Attack"
        - Disruptor: "Disruptor Weapons Attack"

- Tests added (client)
  - Jest config updated to discover .tsx tests:
    - packages/client/jest.config.cjs → testMatch: ['**/__tests__/**/*.test.ts?(x)']
  - ResearchLevelsModal tests:
    - packages/client/src/components/game/__tests__/ResearchLevelsModal.test.tsx
      - Verifies exact metric header labels for Ion/Disruptor
      - Verifies credits‑only tables omit Labs/Requires/Effect and show only Level/Credits
  - Table parity tests (headers/order/sorting/tooltip/reasons):
    - packages/client/src/components/game/__tests__/BuildTables.parity.test.tsx
      - Defenses/Units/Structures/Research:
        - Asserts column headers and order match the standard
        - Asserts right‑aligned action column text (Start/Build)
        - Asserts ineligible reasons rendered under the name and present in disabled button tooltip
        - Asserts default sort by credits ascending

- Results
  - Client build: succeeded (pnpm --filter @game/client build)
  - Client tests: all pass (pnpm --filter @game/client test)
    - Test Suites: 2 passed, 2 total; Tests: 15 passed, 15 total

- Refactored files progress: 6/10 complete
  - Newly completed from Phase 3 UI:
    - packages/client/src/components/game/StructuresBuildTable.tsx — table consolidation
    - packages/client/src/components/game/ResearchLevelsModal.tsx — metrics standardization
  - Previously completed (see 2025‑08‑30 updates):
    - UniverseMap.tsx, structuresService.ts, techService.ts, baseStatsService.ts

- Acceptance (per .clinerules/tabular-build-ui-standard-and-test-plan.md and research-level-tables.md)
  - Sticky header, compact rows, reasons line, disabled tooltip, right‑aligned action, default credits sort: Implemented and asserted
  - ResearchLevelsModal exclusively uses metrics.ts; credits‑only detection and exact header labels: Implemented and asserted

## Status Update — 2025-08-31 (SSR/Jest interop fix for BuildTables)

- Context: After completing Phase 3 UI consolidation, SSR tests that render tables via react-dom/server failed under ts-jest.
- Failure signature:
  - “TypeError: Cannot read properties of undefined (reading 'useReducer')” while rendering StructuresBuildTable and ResearchBuildTable in SSR.
- Root cause: ESM/CJS interop under ts-jest SSR when using default import + named hooks. In this mode, the React default can be undefined at runtime, so bare useX calls resolve off an undefined binding.
- Exact fix: Switch to namespace import and reference hooks via the React namespace.
  - Before:
    ```ts
    import React, { useMemo, useState } from "react";
    const structs = useMemo(/* ... */);
    ```
  - After:
    ```ts
    import * as React from "react";
    const structs = React.useMemo(/* ... */);
    const [, forceTick] = React.useReducer((x: number) => x + 1, 0);
    ```
- Files updated:
  - packages/client/src/components/game/StructuresBuildTable.tsx
    - import changed to `import * as React from "react";`
    - hooks referenced as `React.useMemo`, `React.useState`
  - packages/client/src/components/game/ResearchBuildTable.tsx
    - import changed to `import * as React from "react";`
    - hooks referenced as `React.useReducer` (and any others via `React.useX`)
- Build and test evidence:
  - Build: `pnpm --filter @game/client build` → succeeded
  - Tests: `pnpm --filter @game/client test` → Test Suites: 3 passed, 3 total; Tests: 19 passed, 19 total
- Notes/WARNINGS (non-blocking):
  - ts-jest deprecation: move config from globals to transform in jest.config.cjs (future tidy-up).
  - TS151001 hint: consider `esModuleInterop: true` — optional; not required after the namespace-import fix.
- Standards alignment:
  - Retains compliance with `.clinerules/tabular-build-ui-standard-and-test-plan.md`.
  - ResearchLevelsModal continues to use canonical metrics per `.clinerules/research-level-tables.md`.

## Status Update — 2025-08-31 (Phase 4 Finalization)

- GalaxyView performance and caching (client)
  - Single-source fitted layout via layoutRef; strict click parity shared by draw and hit-test.
  - Offscreen layer caching:
    - Grid layer rendered once to gridCanvasRef
    - Dynamic regions/stars/labels rendered to regionCanvasRef and rebuilt only on dependency changes (selected galaxy, showTerritories, empire, regionStarsByRegion)
  - FPS-adaptive rendering complexity using lowDetailRef fed by fpsRef; drawStarField/drawSpiralGalaxy scale particle counts if FPS < 30.
  - File: packages/client/src/components/game/map/GalaxyView.tsx

- Click mapping tests stabilized (client)
  - Extracted pure helper without Vite import.meta dependency: packages/client/src/components/game/map/clickMapping.ts
  - Extended test coverage (corners, last row/col, padding boundaries, alt canvas sizes): packages/client/src/components/game/__tests__/GalaxyView.clickMapping.test.ts
  - Result: all click mapping tests passing.

- GameLoopService hardening (server)
  - Structured tick summary logs with per-phase counters:
    - researchCompleted
    - techCompleted/techCancelled/techErrors
    - unitCompleted/unitCancelled/unitErrors
    - activatedBuildings
    - resourcesUpdated/resourceErrors
  - Consistent tags for events and warnings, e.g.:
    - [GameLoop] tech completed key=… empire=… location=… level=…
    - [GameLoop] tech cancel missingEmpire techKey=… location=…
    - [GameLoop] unit completed key=… empire=… location=…
    - [GameLoop] unit cancel missingEmpire unitKey=… location=…
  - File: packages/server/src/services/gameLoopService.ts

- Atomic/no-double-activation test suite (server)
  - Building activation race safety:
    - packages/server/src/__tests__/buildingService.atomicActivation.test.ts
    - Simulates duplicate document reference in Building.find(); ensures level increments exactly once, pendingUpgrade cleared, activation idempotent.
  - Tech queue duplicate safety:
    - packages/server/src/__tests__/gameLoop.techQueue.atomic.test.ts
    - Simulates duplicate due items for same tech; ensures empire.techLevels promoted to target level once (max semantics), not double-applied.
  - Unit queue duplicate safety:
    - packages/server/src/__tests__/gameLoop.unitQueue.atomic.test.ts
    - Simulates duplicate due items; verifies idempotent completion or cancel when empire missing.

- Evidence
  - pnpm --filter @game/server test → 19/19 test suites passed (52/52 tests), confirming Phase 4 hardening.
  - Structured logs visible during test run, suitable for future E2E parsing if needed.

- Rules alignment
  - .clinerules/real-time-game-development.md (game loop resilience, counters, logs)
  - .clinerules/queue-idempotency.md (idempotent processing)
  - .clinerules/dto-error-schema-and-logging.md (structured, parseable logs)
  - .clinerules/interactive-canvas-architecture.md (render loop, caching, click parity)

## Conclusion

This refactor audit provides a strategic roadmap for improving code quality, maintainability, and performance across the most impactful parts of the codebase. Prioritization focuses on reliability-critical services first, followed by consistency improvements and UI enhancements. Each recommendation aligns with existing `.clinerules` guidelines to ensure long-term architectural coherence.

The recommended changes would result in approximately 40-50% reduction in code duplication, significant improvements in system reliability, and enhanced user experience consistency while maintaining backward compatibility and minimizing regression risk.

## Status Update — 2025-08-31 (Phase 5B — Parity + Tooling Polish)

- Client Jest config modernization:
  - Switched to jsdom environment and moved ts-jest settings to transform per modernization plan.
  - Installed jest-environment-jsdom and enabled esModuleInterop/allowSyntheticDefaultImports to silence ts-jest interop hints.
  - Results: 4/4 client suites, 27/27 tests passing; no deprecation blockers.

- Defenses/Units parity + logging audit:
  - Reviewed services/defensesService.ts, services/unitsService.ts, and services/utils/idempotency.ts.
  - Canonical DTO/error schema confirmed; ALREADY_IN_PROGRESS payloads include details.identityKey and existing metadata; log tags consistent.
  - No production code changes required.

- Capacity parity tests expanded:
  - Added extreme-boundary cases to packages/server/src/__tests__/capacityService.eta-parity.test.ts:
    - Extremely large creditsCost (with sufficient credits seeded) → finite etaMinutes (expected 30,000,000).
    - Very low but non-zero construction capacity → very large etaMinutes (expected 600,000).
  - Results: Server tests PASS — 20/20 suites, 56/56 tests.

- Optional offscreen helper extraction:
  - Deferred for this phase; GalaxyView already implements offscreen caching and strict draw vs hit-test parity. RegionView extraction is a candidate for a subsequent small step.

- Acceptance:
  - Phase 5B acceptance criteria satisfied: client tests run warning-free, Defenses/Units parity reconfirmed, capacity parity tests expanded and passing, docs updated with deliverables and evidence.

## Status Update — 2025-08-31 (Phase 5C — Offscreen Caching Parity and Cache Hygiene Seed)

- Accomplishments (smallest meaningful change):
  - Shared offscreen layer helper in client:
    - Path: `packages/client/src/components/game/map/helpers/offscreenLayers.ts`
    - API: `createOffscreenLayer(width, height)`, `drawToLayer(layer, fn)`, `composeLayers(ctx, layers)`, `getCacheKeyFromDeps(deps)`, `buildCachedLayer(prefix, deps, cache, builder)`, `clearLayerCache(cache, predicate?)`
    - Stable dependency fingerprinting via sorted-keys serialization with circular guards.
  - GalaxyView now uses the shared helper for the dynamic regions layer:
    - File: `packages/client/src/components/game/map/GalaxyView.tsx`
    - Introduced `layerCacheRef: React.useRef<LayerCache>(new Map())`
    - Cached layer built with:
      - Prefix: `galaxy:regions`
      - Minimal deps: `{ width, height, galaxyId, showTerritories, empireHash, starsHash }`
        - `empireHash`: rolling checksum of sorted `empire.territories`
        - `starsHash`: lightweight checksum over per‑region system counts (0..99)
      - Builder uses `createOffscreenLayer` + `drawToLayer` to render `drawRegionsLayer(...)`
    - Preserved:
      - Fitted layout single‑source (`layoutRef`) and strict draw/hit‑test parity
      - FPS adaptation (`fpsRef` → `lowDetailRef`)
    - Hygiene:
      - Removed unused `rows` binding in `drawRegionsLayer`
      - Deleted unused legacy `drawRegionGrid`
    - Build evidence:
      - Client production build succeeded (`pnpm -C packages/client build`)
- Notes:
  - RegionView already caches the dynamic systems layer using the shared helper (seed pattern established previously).

- Next steps (planned, small and incremental):
  1) GalaxyView — grid layer parity and composition
     - Replace ad hoc grid offscreen with `buildCachedLayer('galaxy:grid', deps, cache, builder)`
     - Deps: `{ width, height, showGrid, cols: 10, rows: 10 }` (+ theme/line-style if applicable)
     - Compose: `composeLayers(ctx, [gridLayer, regionsLayer])`
  2) RegionView — static grid/background caching (optional, profile‑driven)
     - Prefix: `region:grid`
     - Deps: `{ width, height }` (+ theme/background palette if applicable)
     - Compose static grid/background before existing dynamic systems layer
  3) Cache hygiene triggers
     - Add targeted cache clears on dimension/theme changes:
       - `clearLayerCache(cacheRef.current, k => k.startsWith('galaxy:grid') || k.startsWith('galaxy:regions'))`
       - `clearLayerCache(cacheRef.current, k => k.startsWith('region:grid') || k.startsWith('region:systems'))`
  4) Tests (optional)
     - Expand helper tests to cover nested arrays/objects and circular cases for `getCacheKeyFromDeps`
     - Add simple unit tests for `computeStarsHash`/`empireHash` if standardized as utilities

- Acceptance for Phase 5C seed:
  - GalaxyView dynamic regions layer uses shared helper with stable deps and compiles cleanly
  - Runtime parity preserved (no JSX in draw loops, RAF guard intact)
  - Clear, minimal next steps queued for grid parity, RegionView static caching, and cache hygiene

## Status Update — 2025-08-31 (Phase 5C — Offscreen Caching Parity & Hygiene Finalized + Helper Tests)

- Accomplishments (smallest meaningful change):
  - GalaxyView grid layer now cached and composed before dynamic regions:
    - `buildCachedLayer('galaxy:grid', { width, height, showGrid, cols, rows }, cache, builder)`
    - Composition order enforced: `composeLayers(ctx, [gridLayer, regionsLayer])`
    - Hygiene: `clearLayerCache(layerCacheRef.current, k => k.startsWith('galaxy:grid') || k.startsWith('galaxy:regions'))` keyed on canvas dimensions/flags.
  - RegionView static grid/background cached and composed before systems:
    - `buildCachedLayer('region:grid', { width, height }, cache, builder)`
    - Composition order: `composeLayers(ctx, [gridLayer, systemsLayer])`
    - Hygiene: `clearLayerCache(layerCacheRef.current, k => k.startsWith('region:grid') || k.startsWith('region:systems'))` on dimension changes.
  - Helper tests expanded for cache key stability and cache reuse:
    - File: `packages/client/src/components/game/map/helpers/__tests__/offscreenLayers.test.ts`
    - Added cases:
      - Nested deps ordering stability (deep object + arrays)
      - Circular reference guard (`"__circular__"` token present; no throw)
      - Visual deps change detection (width/height)
      - Cached layer reuse with identical deps + prefix; new instance after targeted clear

- Evidence
  - Client tests: PASS (pnpm --filter @game/client test)
    - Test Suites: 5 passed, 5 total; Tests: 34 passed, 34 total
  - Build already verified earlier (Vite/TS) and unaffected by test additions.

- Notes
  - Stable/minimal deps policy maintained: ids/flags/dimensions/hashes only.
  - Draw/hit-test parity preserved by continuing to use single-source layout functions in both GalaxyView and RegionView.
  - No JSX in draw loops; RAF loop guards remain intact per canvas rules.

- Acceptance
  - Offscreen grid/background layers are deterministically reused when deps are unchanged.
  - Cache hygiene clears the expected prefixes on dimension/flag changes.
  - Composition order consistently draws static-most first.
- All client unit tests pass, guarding future regressions in key generation and cache reuse semantics.

## Status Update — 2025-09-02 (Smart Queue — Credits Gating Shifted to Schedule-Time)

- Accomplishments (smallest meaningful change):
  - Removed all queue-time credits feasibility checks from `StructuresService.start`; credits no longer block adding to the queue.
  - Moved credits gating and deduction to `BuildingService.scheduleNextQueuedForBase` (top-of-queue only):
    - If available credits < required, scheduler leaves the item unscheduled and retries later.
    - When sufficient, scheduler deducts credits then sets `constructionStarted`/`constructionCompleted` using capacity parity:
      - `minutes = max(1, ceil((creditsCost / constructionPerHour) * 60))`.
  - Aligned cancellation/refund semantics:
    - `DELETE /api/game/structures/queue/:id` now refunds credits only if the item had actually started (`constructionStarted` …)

## Status Update — 2025-09-03 (Fleet UI Wiring + FleetPage)

- Accomplishments (smallest meaningful change):
  - Base Overview fleets list now consumes server fleets endpoint:
    - File: `packages/client/src/components/game/BaseDetail.tsx`
    - Replaced MVP “Garrison” row (getBaseUnits total) with real fleets list via `fleetsService.getFleets(base.locationCoord)`.
    - Renders one row per fleet with columns: Fleet (link), Player (ownerName), Arrival (—), Size (sizeCredits.toLocaleString()).
    - Fleet name links to the new Fleet detail route (`/fleets/:id`) using `Link`.
    - Loading/error/empty states preserved and styled per the tabular UI standard.
  - Added Fleet detail page:
    - New file: `packages/client/src/components/game/FleetPage.tsx`
    - On mount, fetches `fleetsService.getFleet(id)` and displays:
      - Header: name, base coord, ownerName, sizeCredits (credits formatting).
      - Composition table: unit name, unitKey, count (toLocaleString).
      - Stubbed action buttons (Move, Attack, Build Base, Rename, Disband) — disabled by design.
      - “View Base” link to `/base/:coord`.
    - Styling matches “game-card” conventions and typography.
  - Added protected route:
    - File: `packages/client/src/App.tsx`
    - Route: `/fleets/:id` guarded by auth, wrapped in `Layout` → `FleetPage`.
- Evidence:
  - Shared build: `pnpm --filter @game/shared build` → succeeded.
  - Client build: `pnpm --filter @game/client build` → succeeded (Vite produced artifacts; chunk size warning only).
  - Client dev server (PowerShell-safe) is running at: http://localhost:5174/ (Vite auto-switched from 5173).
  - Server dev (`pnpm --filter @game/server dev`) reported `EADDRINUSE: 3001`, indicating an existing server instance is already serving API routes; no additional port changes required for the UI wiring.
- Standards alignment:
  - `.clinerules/tabular-build-ui-standard-and-test-plan.md`: compact table layout, right-aligned size column, consistent header styling.
  - `.clinerules/complex-react-component-architecture.md`: link behavior from Overview → Detail; route-synced navigation via `Link` and route layer in `App.tsx`.
  - `.clinerules/dev-cors-strategy.md`: UI at 5174 is within allowed dev origins (5173/5174).
- Next steps (deferred by request — E2E skipped for now):
  1) Perform live E2E flow (when credentials available):
     - Login with test@test.com, queue 1 Fighter, wait for game loop completion.
     - Verify Base Overview Fleets shows “Fleet 1” with size equal to Fighter credits.
     - Click the Fleet link and verify composition table shows Fighter: 1 and sizeCredits sum matches.
  2) Optional: Add Jest component tests for FleetPage composition rendering and BaseDetail fleet linking.
  3) Optional: Sort fleets strictly by creation time if API returns createdAt; otherwise preserve server order.
- Acceptance for this step:
  - Base Overview fleets now list real fleets from the server and link to a working Fleet detail page.
  - Client builds clean; dev server available at http://localhost:5174/.
  - Server already running on 3001 (as detected).
