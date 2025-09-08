# ClineRules Audit Report

Date: 2025-08-31  
Scope: Audit all project `.clinerules` for conflicts, redundancy, and clarity; recommend updates and a baby-steps plan.

## 1) Methodology

- Enumerated rules under `.clinerules/`
- Grouped by domain (UI, Canvas, Energy/Capacity, API/DTO/Idempotency/E2E, Data Integrity, Dev Environment/Process)
- Reviewed each rule’s intent and whether a consolidated/canonical rule supersedes it
- Cross-checked against existing code/tests to confirm alignment where applicable

Rules audited (from `.clinerules`):
- canvas-visualization-debugging.md
- capacity-parity.md
- catalog-key-source-of-truth.md
- complex-react-component-architecture.md
- dev-cors-strategy.md
- dto-error-schema-and-logging.md
- dual-esm-cjs-build.md
- end-to-end-testing-protocol.md
- energy-budget-consistency.md
- energy-budget-helper.md
- game-mechanics-consultation.md
- interactive-canvas-architecture.md
- interactive-canvas-visualization.md
- login-credentials-usage.md
- monorepo-fullstack-development.md
- offscreen-layer-caching.md
- powershell-command-syntax.md
- queue-idempotency.md
- react-ssr-jest-interop.md
- real-time-game-development.md
- refactor-audit-workflow.md
- research-level-tables.md
- tabular-build-ui-standard-and-test-plan.md
- typescript-interface-management.md
- ui-table-consistency.md
- ui-testing-addendum.md

## 2) Inventory Snapshot by Topic

- UI Tables
  - Canonical: `tabular-build-ui-standard-and-test-plan.md` (consolidates style, behavior, and focused test plan)
  - Deprecated predecessors: `ui-table-consistency.md`, `ui-testing-addendum.md` (already marked deprecated in-file)

- Canvas / Visualization
  - Canonical: `interactive-canvas-architecture.md` (explicitly supersedes older guidance)
  - Specialized companion: `offscreen-layer-caching.md` (canonical helper, cache keys, hygiene)
  - Older files still present: `canvas-visualization-debugging.md`, `interactive-canvas-visualization.md`

- Energy / Capacity / Parity
  - `energy-budget-consistency.md` (model, projection rules, logging schema)
  - `energy-budget-helper.md` (shared API to eliminate drift; enforced by `packages/shared/src/energyBudget.ts` + tests)
  - `capacity-parity.md` (ETA parity computation/formatting policy between server and client)

- API / DTO / Idempotency / E2E
  - `dto-error-schema-and-logging.md` (canonical success/error payloads, logging tags, idempotent mapping)
  - `queue-idempotency.md` (identityKey, 409 ALREADY_IN_PROGRESS, uniqueness/indexing)
  - `end-to-end-testing-protocol.md` (browser automation, energy-gating checks, idempotency checks)

- Data Integrity
  - `catalog-key-source-of-truth.md` (catalogKey is authoritative; INVALID_REQUEST on missing catalogKey)

- Dev Environment / Process
  - `powershell-command-syntax.md` (Windows-safe chaining, env vars for Playwright)
  - `monorepo-fullstack-development.md` (workspace, build order, Windows command notes)
  - `refactor-audit-workflow.md` (Baby Steps discipline for refactors)
  - `typescript-interface-management.md` (atomic interface change protocol)
  - `complex-react-component-architecture.md` (multi-component patterns, Zustand)
  - `react-ssr-jest-interop.md` (namespace import pattern, jsdom)
  - `login-credentials-usage.md` (stable test accounts policy)
  - `game-mechanics-consultation.md` (pre-implementation mechanics review)
  - `real-time-game-development.md` (game loop, resource updates)
  - `dev-cors-strategy.md` (multi-origin dev CORS)
  - `dual-esm-cjs-build.md` (dual build pattern)
  - `research-level-tables.md` (canonical metrics selection/labels for research UI)
  - `continuous-improvement-and-rule-refinement.md` (ongoing rules improvement)

## 3) Findings

### 3.1 Redundancies and Deprecations

- UI Tables
  - Canonical is `tabular-build-ui-standard-and-test-plan.md`.
  - `ui-table-consistency.md` and `ui-testing-addendum.md` are retained for historical context and already include a deprecation notice. To prevent accidental edits or drift:
    - Option A (preferred): move both into `docs/legacy/` and leave a 1-line stub in `.clinerules/` pointing to the canonical file.
    - Option B: keep in place but add a bold “Deprecated — Do not modify. See tabular-build-ui-standard-and-test-plan.md” banner at the very top.

- Canvas
  - `interactive-canvas-architecture.md` is the canonical consolidation doc.
  - Older `canvas-visualization-debugging.md` and `interactive-canvas-visualization.md` remain present. To avoid split edits:
    - Mark both with a prominent “Deprecated — consolidated into interactive-canvas-architecture.md” banner, or move to `docs/legacy/` with a stub pointer.
  - `offscreen-layer-caching.md` is a focused companion (helper standardization, keys, hygiene) and should remain.

### 3.2 Conflicts and Inconsistencies

- None detected. Key domains show strong internal consistency:
  - Energy model: `energy-budget-consistency.md` and `energy-budget-helper.md` align with the shared implementation (`packages/shared/src/energyBudget.ts`) and have unit/E2E coverage for parity and log schema.
  - DTO/Idempotency: `dto-error-schema-and-logging.md` and `queue-idempotency.md` agree on payloads and codes; E2E/protocol and server tests match expectations.
  - Capacity parity: `capacity-parity.md` clearly defines UI/server parity; no conflicts with energy model scope.

### 3.3 Cross-Rule Alignment and Precedence

- Consolidated rules (UI tables, Canvas architecture) are clearly intended to take precedence over predecessors, but the precedence policy is implicit across files.
- Introducing a short `.clinerules/README.md` that states “Precedence & Deprecation Policy” will reduce ambiguity and prevent future divergence.

### 3.4 Clarity and Cross-Linking Opportunities

- Add a line at the top of `offscreen-layer-caching.md`: “Companion to interactive-canvas-architecture.md; defines the canonical offscreen layer helper and cache hygiene.”
- In `end-to-end-testing-protocol.md`, in the PowerShell/Playwright section, add explicit “See also” links to:
  - `powershell-command-syntax.md`
  - `login-credentials-usage.md`
  to make those couplings obvious for Windows users and credential handling.

## 4) Recommendations

1) Governance: Add `.clinerules/README.md`
- Precedence: Consolidated rules override earlier documents in the same domain.
- Deprecation policy: When a consolidation ships, predecessors are marked as Deprecated immediately and archived under `docs/legacy/` within 2 weeks; leave a stub pointer in `.clinerules` if useful.
- Index: List canonical rules by domain and their companion docs (e.g., Canvas architecture + offscreen-layer-caching companion).

2) Reduce redundancy noise
- Move deprecated files into `docs/legacy/` or add bold top banners:
  - UI: `ui-table-consistency.md`, `ui-testing-addendum.md`
  - Canvas: `canvas-visualization-debugging.md`, `interactive-canvas-visualization.md`

3) Improve cross-linking
- `offscreen-layer-caching.md`: add “Companion to ...” line at the top.
- `end-to-end-testing-protocol.md`: add “See also powershell-command-syntax.md and login-credentials-usage.md” in the Playwright/credentials section.

4) Optional consolidation
- If any still-useful sections remain in `canvas-visualization-debugging.md`, fold them into a “Legacy pitfalls” appendix in `interactive-canvas-architecture.md` while archiving the older file.

## 5) Baby Steps Plan

Step 1 — Documentation-only (no behavior change)
- Create `.clinerules/README.md` with:
  - Precedence & Deprecation Policy
  - Canonical-per-domain index and companion references
- Add “Deprecated — Do not modify; see <canonical file>” banners at the very top of:
  - `ui-table-consistency.md`
  - `ui-testing-addendum.md`
  - `canvas-visualization-debugging.md`
  - `interactive-canvas-visualization.md`
  OR move them to `docs/legacy/` with short stubs under `.clinerules/`.

Step 2 — Cross-linking (small clarifications)
- `offscreen-layer-caching.md`: add “Companion to interactive-canvas-architecture.md” line at top.
- `end-to-end-testing-protocol.md`: add “See also powershell-command-syntax.md and login-credentials-usage.md” in the Playwright/PowerShell section.

Step 3 — Optional consolidation (later)
- Fold any still-relevant content from `canvas-visualization-debugging.md` into a “Legacy notes and pitfalls” appendix in `interactive-canvas-architecture.md` and archive the older file.

### Acceptance Criteria
- A single canonical rule per domain is clearly discoverable:
  - UI: `tabular-build-ui-standard-and-test-plan.md`
  - Canvas: `interactive-canvas-architecture.md` (+ companion: `offscreen-layer-caching.md`)
  - Energy/Capacity, DTO/Idempotency/E2E remain as-is
- Deprecated documents are either archived or stamped at top with a clear banner
- Cross-links reduce ambiguity for PowerShell/Playwright usage and Canvas helper adoption
- `.clinerules/README.md` provides a clear, short governance policy and index

## 6) Conclusion

- The current ruleset is coherent with no direct conflicts; consolidated/canonical rules are in place for critical domains (UI tables, Canvas).
- The main improvements are governance clarity (README with precedence rules), visible deprecation handling of older documents, and a couple of light cross-links for usability. These are low-risk, incremental documentation changes that prevent future drift and make the ecosystem easier to navigate.

## 7) Appendix — Rules ↔ Code/Test Mapping (Non-exhaustive)

- Energy parity
  - Rules: `energy-budget-consistency.md`, `energy-budget-helper.md`
  - Code/Tests: `packages/shared/src/energyBudget.ts`, `packages/shared/src/__tests__/energyBudget.test.ts`, `e2e/energy.gating.spec.ts`, server logs `[StructuresService.start]` fields

- Capacity parity (ETA)
  - Rule: `capacity-parity.md`
  - Code/Tests: `packages/shared/src/capacities.ts`, client ETA display logic, `packages/server/src/__tests__/capacityService.eta-parity.test.ts`

- DTO / Idempotency / E2E
  - Rules: `dto-error-schema-and-logging.md`, `queue-idempotency.md`, `end-to-end-testing-protocol.md`
  - Code/Tests: `packages/server/src/__tests__/*idempotency*.test.ts`, `packages/server/src/__tests__/services.dto-format.test.ts`, `e2e/idempotency.*.spec.ts`

- Catalog key source of truth
  - Rule: `catalog-key-source-of-truth.md`
  - Code/Tests: `packages/server/src/services/baseStatsService.ts`, `packages/server/src/__tests__/baseStatsService.catalogKey.test.ts`, request validation for catalogKey

- Canvas visualization & caching
  - Rules: `interactive-canvas-architecture.md` (canonical), `offscreen-layer-caching.md` (companion), older deprecated canvas docs
  - Code/Tests: `packages/client/src/components/game/map/**/*`, helper: `helpers/offscreenLayers.ts`, related cache tests

- UI Tables
  - Rule: `tabular-build-ui-standard-and-test-plan.md` (canonical)
  - Code/Tests: `packages/client/src/components/game/*BuildTable*.tsx`, `packages/client/src/components/game/__tests__/BuildTables.parity.test.tsx`, research metrics mapping (`research-level-tables.md` companion)

- PowerShell/Testing/Dev
  - Rules: `powershell-command-syntax.md`, `login-credentials-usage.md`
  - Code/Tests: `e2e/*` (Playwright), environment variable patterns in test steps
