# .clinerules Governance, Precedence, and Index

Date: 2025-08-31

This document defines how our rule set is organized and maintained. It establishes a clear precedence and deprecation policy, and provides a canonical index by domain so contributors know which documents to follow.

## Precedence Policy

- Consolidated (canonical) rules override any prior rules in the same domain.
- Companion rules provide focused standards that extend a canonical rule (e.g., a specific helper or testing standard) and should be read together with their canonical rule.
- When in doubt, prefer the canonical rule listed in the Index section below.

## Deprecation Policy

- When a consolidation ships, predecessors are immediately marked “Deprecated — Do not modify.”
- Within two weeks, deprecated files should be archived to `docs/legacy/` (optional to leave a one‑line stub in `.clinerules/` pointing to the canonical rule).
- New work must not modify deprecated files. Any material still useful should be folded into the canonical rule (for example, a “Legacy notes and pitfalls” appendix).

## Cross-Referencing Conventions

- Companion rules should include a one‑line link at the top referencing their canonical rule (e.g., “Companion to interactive-canvas-architecture.md”).
- When a rule relies on platform/process idioms (e.g., PowerShell one‑liners, test credentials), include “See also” references to the relevant rules.

## Change Control

- Any change to a canonical rule that affects code behavior must:
  - Update associated code and tests for parity (client, server, shared libs as applicable).
  - Update any E2E or unit tests that assert canonical behaviors (response shapes, logs, computations).
  - Note the change in the affected rule(s) with a brief “Change log” line including date and rationale.

---

## Canonical Index by Domain

Below is the single source of truth for each domain, plus any companion rules. Deprecated documents remain available for historical context but must not be modified.

### UI Tables

- Canonical:
  - `.clinerules/tabular-build-ui-standard-and-test-plan.md`
- Companion:
  - `.clinerules/research-level-tables.md` (research metrics priority/labels, credits-only rules)
- Deprecated (historical context only):
  - `.clinerules/ui-table-consistency.md`
  - `.clinerules/ui-testing-addendum.md`

### Canvas / Interactive Visualization

- Canonical:
  - `.clinerules/interactive-canvas-architecture.md` (supersedes older visualization docs)
- Companion:
  - `.clinerules/offscreen-layer-caching.md` (canonical helper, keys, cache hygiene)
- Deprecated (historical context only):
  - `.clinerules/canvas-visualization-debugging.md`
  - `.clinerules/interactive-canvas-visualization.md`

### Energy and Capacity Parity

- Energy:
  - `.clinerules/energy-budget-consistency.md` (model, logging schema, projection rules)
  - `.clinerules/energy-budget-helper.md` (shared API for server/client parity)
- Capacity/ETA:
  - `.clinerules/capacity-parity.md` (authoritative ETA computation + UI formatting parity)

### API / DTO / Idempotency / E2E

- DTO and Logging:
  - `.clinerules/dto-error-schema-and-logging.md` (canonical payloads and logs)
- Queue Idempotency:
  - `.clinerules/queue-idempotency.md` (409 conflicts, identityKey, uniqueness)
- End-to-End Testing:
  - `.clinerules/end-to-end-testing-protocol.md` (browser automation, energy-gating checks, API double‑POST idempotency)
  - See also:
    - `.clinerules/powershell-command-syntax.md` (Windows-safe command patterns)
    - `.clinerules/login-credentials-usage.md` (test accounts, credentials handling)

### Base Events / Summaries

- Canonical:
  - `.clinerules/base-events-summary.md`
- Companion:
  - `.clinerules/end-to-end-testing-protocol.md` (Base Events Summary Checks)

### Data Integrity and Source of Truth

- `.clinerules/catalog-key-source-of-truth.md` (catalogKey required; legacy type mapping forbidden)

### Development Environment / Process

- Platform and shell:
  - `.clinerules/powershell-command-syntax.md`
  - `.clinerules/dual-esm-cjs-build.md`
  - `.clinerules/monorepo-fullstack-development.md`
- Desktop/Electron:
  - `.clinerules/electron-security-strategy.md` (CSP, IPC security, file handling)
  - `.clinerules/electron-build-and-packaging.md` (build, signing, distribution)
  - `.clinerules/launcher-integration-patterns.md` (launcher ↔ app communication)
- Process discipline:
  - `.clinerules/refactor-audit-workflow.md` (Baby Steps refactor tracking)
  - `.clinerules/typescript-interface-management.md` (atomic interface changes)
  - `.clinerules/complex-react-component-architecture.md`
  - `.clinerules/react-ssr-jest-interop.md`
  - `.clinerules/continuous-improvement-and-rule-refinement.md`
- Game mechanics (project-specific):
  - `.clinerules/game-mechanics-consultation.md` (always consult docs/Game Mechanics and Rules.md)
  - `.clinerules/real-time-game-development.md` (game loop/services patterns)
- Deprecated (historical context only):
  - `.clinerules/dev-cors-strategy.md` (replaced by electron-security-strategy.md)

### Knowledge/Nuggets & MCP

- Canonical:
  - `.clinerules/supermemory-nuggets-and-automation.md`
- Companion:
  - `.clinerules/powershell-command-syntax.md` (pass-through flags, env var one-liners)
- Notes:
  - Supermemory acts as an external memory index/cache. The sources of truth remain `.clinerules/` and `memory-bank/`.

---

## How To Use This Index

- Start with the canonical rule for your domain.
- If a companion exists, read it next.
- If you discover contradictions, open an issue and reference both files; the canonical rule prevails until the contradiction is resolved.
- If you need to deprecate an older document, apply the Deprecation Policy above and update this index if necessary.

## Quick Checklist for Authors

- [ ] Is the rule canonical or a companion? If canonical, add a “Canonical” note in the intro.
- [ ] Does the rule link to related companions or prerequisite rules?
- [ ] Does a change require test/code updates? If yes, reflect the changes immediately and note it in the rule.
- [ ] Are any older rules now redundant? If yes, mark them deprecated and plan archival.
