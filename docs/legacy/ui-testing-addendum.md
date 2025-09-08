---
description: Add UI testing addendum for visual parity of build/research tables and level badge behavior across tabs
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["testing", "ui", "consistency", "browser-automation", "checklist"]
globs: ["packages/client/src/components/game/**/*", ".clinerules/end-to-end-testing-protocol.md"]
---

# UI Testing Addendum — Table Parity & Level Badge Checks

> DEPRECATION NOTICE: This addendum has been superseded by `.clinerules/tabular-build-ui-standard-and-test-plan.md`. Keep this document for historical context; new UI table testing changes MUST be made in the consolidated rule.

This addendum extends the End-to-End Testing Protocol with concrete checks to ensure visual/behavioral parity across tabular build/research views (Structures, Research, Defenses, Units) and to verify level badge rendering.

## Scope

- Applies to compact tables standardized by `ui-table-consistency.md`
- Focus areas:
  - Sticky header, compact row styling
  - Column presence/order and alignment
  - Eligibility reasons display and button tooltip
  - Right-aligned action column
  - Default sorting (credits ascending)
  - Level badge convention: show “(Level X)” only if X > 0

## Manual Verification Checklist

For each relevant tab (Structures, Research, Defenses, Units):

- [ ] Container uses `game-card !bg-gray-900 border border-gray-700`
- [ ] Header shows title (left), summary (e.g., credits/labs), and a small Refresh button (right)
- [ ] Table header is sticky (`thead.sticky.top-0.bg-gray-800`) with `text-gray-300 border-b border-gray-700`
- [ ] Rows use `border-b border-gray-800` with hover `bg-gray-800/60`
- [ ] First column:
  - [ ] Name in white
  - [ ] Gray description line beneath when available
  - [ ] Red eligibility reasons line when ineligible: `text-xs text-red-300 mt-1` joined with `; `
  - [ ] Level badge renders “(Level X)” appended to the name only if X > 0; nothing if X == 0
- [ ] Requires column uses em dash (‘—’) when empty, `text-red-400` otherwise
- [ ] Action column is right-aligned with:
  - [ ] Enabled: `bg-blue-600 hover:bg-blue-700 text-white`
  - [ ] Disabled: `bg-gray-600 text-gray-400 cursor-not-allowed`
  - [ ] Tooltip on disabled button lists reasons via `title={reasons.join('; ')}`
- [ ] Default sort by credits ascending (primary cost)
- [ ] No ambiguous phase terminology appears in UI or developer-facing strings (e.g., "Phase …")

### Defenses-specific checks
- [ ] No level badge is shown for Defenses
- [ ] Columns present and in order: Defense | Credits | Energy | Area | Requires | Start
- [ ] Area column: blank when 0, “-X” for positive area, and “-1” default if unspecified

## Browser Automation Steps (build on End-to-End Protocol)

Repeat per tab:

1. Navigate to the base detail page and select the target tab.
2. Wait for table render; assert presence of sticky header and expected column headers.
3. Read first N rows’ credit values; assert ascending order.
4. For a row that is ineligible:
   - Assert red reasons line is visible under the name.
   - Hover the disabled button and assert its `title` attribute contains the reasons text.
5. For a row with known level > 0:
   - Assert the name text contains `(Level X)` with the expected X.
6. For a row with level 0:
   - Assert the name text does not contain `(Level` (badge absent).
7. Click Refresh and verify:
   - Credits/labs summary remains in header
   - Table re-renders and ordering persists (or updates appropriately)

## Suggested Minimal Test Hooks

- Data attributes (optional; do not affect visuals):
  - `data-testid="build-table"` on table wrapper
  - `data-testid="row-${key}"` on row
  - `data-testid="name-${key}"` for the first column name block
  - `data-testid="action-${key}"` for the action button

These facilitate non-brittle assertions without relying on exact text positions.

## Pass/Fail Criteria

- All tabs adhere to the standardized styling and behaviors.
- Eligibility reasons appear both in-line (red) and in disabled button tooltip.
- Level badge appears only when level > 0 and matches current level.
- Default sort by credits ascending verified.

## Metric Column Header Checks (Ion & Disruptor)

When metrics exist for these technologies, assert the header uses the correct label:
- Ion: header should be “Ion Weapons Attack”
- Disruptor: header should be “Disruptor Weapons Attack”

Suggested assertions (manual or automation):
- Navigate to Research Levels for Ion; verify the metric header equals “Ion Weapons Attack”
- Navigate to Research Levels for Disruptor; verify the metric header equals “Disruptor Weapons Attack”

## Credits-only Tables Checks

For credits-only tables (no metric and no labs/requires/effect columns):
- [ ] Assert only two columns render: Level and Credits
- [ ] Assert Labs, Requires, and Effect columns are not present
- [ ] If an empty-state row renders, its td colSpan is 2
- [ ] Sticky header, hover styles, and default sorting behavior still apply

## Notes

- When a Time column is present in Research, it may display '—' until research-per-hour is wired; do not assert non-empty values.
- When resource or eligibility data is dynamic, allow a small wait for API responses before assertions.
