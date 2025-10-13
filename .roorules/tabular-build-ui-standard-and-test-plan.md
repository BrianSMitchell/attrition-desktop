---
description: Consolidated standard for compact tabular Build/Research/Defenses/Units UI plus a concrete test plan. Replaces ui-table-consistency.md and ui-testing-addendum.md. References end-to-end-testing-protocol.md.
author: Cline Self-Improvement Protocol
version: 1.1
tags: ["ui", "tables", "consistency", "testing", "react"]
globs: ["packages/client/src/components/game/**/*"]
---

# Tabular Build/Research UI Standard + Test Plan

This rule consolidates and supersedes:
- `ui-table-consistency.md`
- `ui-testing-addendum.md`

It defines the canonical compact table design used across Structures, Research, Defenses, and Units tabs and specifies a focused test plan. For full user-journey and cross-system checks, see `.clinerules/end-to-end-testing-protocol.md`.

## Design Standard

### 1) Container and Header
- Wrap tables in `game-card !bg-gray-900 border border-gray-700`.
- Card header:
  - Title left-aligned: `text-lg font-semibold text-empire-gold`.
  - Right side: summary values (e.g., Credits/Labs) and a small Refresh button.
  - Refresh button classes: `text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700`.

### 2) Table Basics
- Use `table min-w-full text-sm`.
- Sticky header: `thead sticky top-0 bg-gray-800`.
- Header row: `text-gray-300 border-b border-gray-700`.
- Data rows: `border-b border-gray-800 hover:bg-gray-800/60`.
- Default text alignment: left. Action column aligned right.

### 3) First Column (Title Block)
- Render the entity name in white. Append level badge “(Level X)” only when `X > 0` (render nothing for 0).
- Render a gray description line (`text-xs text-gray-400`) when available.
- If start/build is ineligible, show a red reasons line beneath: `text-xs text-red-300 mt-1`, text is `reasons.join('; ')`.

### 4) Columns by Tab
- Structures: `Structure | Credits | Energy | Economy | Population | Area | Advanced | Requires | Time | Build`
- Research: `Technology | Credits | Labs | Requires | Effect | Time | Start`
- Defenses: `Defense | Credits | Energy | Area | Requires | Start`
- Units: `Unit | Credits | Energy | Hangar | Requires | Start`
- Requires column:
  - Show em dash (`—`) when none.
  - Show in `text-red-400` when non-empty to draw attention.
- Numeric formatting uses `toLocaleString()`.

### 5) Start/Build Action Button
- Right-aligned in the last column.
- Enabled: `bg-blue-600 hover:bg-blue-700 text-white`.
- Disabled: `bg-gray-600 text-gray-400 cursor-not-allowed`.
- Tooltip on disabled button must include reasons via `title={reasons.join('; ')}`.
- Label: “Start” (or “Build” when applicable). Use “Unavailable” text only if action is disabled and there are reasons.

### 6) Sorting
- Default sort order: ascending by primary cost (credits).

### 7) Credits-only Tables (Research Levels)
- “Credits-only” means rows have `level` and `credits` only—no metric and no `labs`/`requires`/`effect`.
- Render a compact 2-column layout (Level, Credits).
- Empty-state `td` uses `colSpan=2`.
- Continue to use sticky header and compact row styling.

### 8) Defenses-specific
- No level badge for Defenses.
- `Area` column behavior:
  - Blank when 0.
  - Show “-X” for positive area usage.
  - Default to “-1” if unspecified (to match current UI behavior).

## Implementation Notes

- The Research “Time” column may display `—` until a research-per-hour capacity exists in UI; this is acceptable.
- The header-level Refresh button refreshes the entire table’s data; avoid placing refresh controls inside the table body.
- Keep the table styling centralized and consistent; extract a reusable base Table component when two or more tabs share the same rendering pattern.

### Idempotency UX
- Idempotent conflicts should use a soft-path (toast and/or inline reasons under the name); do NOT display a global notice banner.
- After idempotent retries, refresh should show a single queued/active entry; no duplicate rows.

### Suggested Base Component Props
```ts
interface Eligibility {
  canStart: boolean;
  reasons: string[];
}

interface Column<T> {
  key: string;
  header: string;
  align?: "left" | "right";
  className?: string;
  render: (item: T) => React.ReactNode;
}

interface BuildTableProps<T> {
  title: string;
  summary?: React.ReactNode;    // credits/labs display
  loading?: boolean;
  onRefresh?: () => void;
  items: T[];
  columns: Column<T>[];
  getEligibility: (item: T) => Eligibility;
  onStart: (item: T) => void | Promise<void>;
}
```

## Research Metrics Integration

- All metric selection logic and labels MUST be imported from the canonical module:
  `packages/client/src/components/game/levelTables/research/metrics.ts`
- Do not redeclare priority, labels, or kinds outside that file.
- When Ion/Disruptor metrics are present, headers must exactly equal:
  - “Ion Weapons Attack”
  - “Disruptor Weapons Attack”

See `.clinerules/research-level-tables.md` for details.

## Inline Planet-Derived Hints

- Placement: Inside the first-column name block, after the optional “(Level N)” badge.
- Styling: `ml-2 text-xs text-gray-400`
- Format: `(+{value.toLocaleString()} {label} here)`
- Label map (initial canonical set):
  - `solar_plants` → `energy`
  - `gas_plants` → `energy`
  - `metal_refineries` → `metal`
  - `urban_structures` → `fertility`
  - `crystal_mines` → `crystals`
- Behavior:
  - Render exactly one hint chosen by the building key.
  - Render only when the relevant planet-derived value is numeric.
  - Do not change columns, sorting, or action alignment.

Testing guidance:
- With `StructuresBuildTable` receiving props for planet context, assert hint string presence in the name cell:
  - Given `planetSolarEnergy=7` and row `solar_plants` → expect `(+7 energy here)`
  - Given `planetGasYield=5` and row `gas_plants` → expect `(+5 energy here)`
  - Given `planetMetalYield=12` and row `metal_refineries` → expect `(+12 metal here)`
  - Given `planetFertility=3` and row `urban_structures` → expect `(+3 fertility here)`
  - Given `planetCrystalsYield=9` and row `crystal_mines` → expect `(+9 crystals here)`
- Use `data-testid="name-${key}"` to select the name cell.

## Header Stat Cards (Base Detail)

- Scope: Base detail header metrics cards for Area Usage, Energy Balance, and Population.
- Rule: When a “View breakdown” link is present, do NOT render inline “(free …)” or other derived stats in the sub line. Keep the sub line clean and let the modal convey totals/breakdowns.
- Reuse the shared StatLink component to prevent copy/style drift:
  - Location: `packages/client/src/components/ui/StatLink.tsx`
  - Default copy: `View breakdown ⟶`
  - Provide stable test ids where applicable:
    - `area-breakdown-link`
    - `energy-breakdown-link`
    - `population-breakdown-link`

Example usage:
```tsx
// Inside a StatItem sub block
<StatLink
  onClick={handleViewAreaBreakdown}
  dataTestId="area-breakdown-link"
  title="View breakdown ⟶"
/>
```

Testing guidance:
- Add a focused unit test (e.g., `packages/client/src/components/game/__tests__/HeaderStatLinks.test.tsx`) that renders a minimal header fragment with StatLink and asserts:
  - The link text equals “View breakdown ⟶”
  - The rendered markup contains no parentheses near the link (guards against “(free …)” regressions)
  - The expected `data-testid` attributes are present
- Prefer `ReactDOMServer.renderToStaticMarkup` (node environment) to keep tests fast and deterministic, consistent with other table parity tests.

## Test Plan (Focused UI Checks)

These checks are intended for component/integration tests. For end-to-end journeys (including energy gating), see `.clinerules/end-to-end-testing-protocol.md`.

For each tab (Structures, Research, Defenses, Units):
1) Layout and Styling
- Assert container class usage and sticky header presence.
- Assert row classes and hover effect.

2) Columns
- Assert expected headers present in the defined order for the tab.
- For Research credits-only tables: assert only Level and Credits columns render; Labs/Requires/Effect are absent. Empty-state colSpan must be 2.

3) First Column Semantics
- For an ineligible row: assert red reasons line exists, text equals `reasons.join('; ')`.
- For an entity with known level > 0: assert name shows “(Level X)”.
- For an entity with level 0: assert no “(Level” substring is present.

4) Action Button
- Ensure the last column is right-aligned.
- Disabled state shows a tooltip containing `reasons.join('; ')`.
- Enabled/disabled styles follow the standard classes.
- Optional: assert that an idempotent retry surfaces a toast/inline reason (no global banner).

5) Sorting
- Assert ascending order by credits (read first N rows and compare values).

6) Metrics Headers (Research)
- When metrics exist, ensure header matches the canonical string from metrics.ts (e.g., Ion and Disruptor exact labels).

## Cross-References

- End-to-end flow and energy gating validation:
  - `.clinerules/end-to-end-testing-protocol.md`:
    - Energy Gating Checks section includes Positive and Negative projection scenarios.
    - Logging requirements for server-side feasibility checks.

## Success Criteria

- All four tabs conform to the standardized container, sticky header, column order, and action column alignment.
- Reasons appear both as a red inline line and in the disabled button tooltip.
- Research levels tables correctly render as credits-only when applicable.
- Default sorting by credits ascending is verified in tests.
- Metrics headers come solely from the canonical metrics module.

## Notes

- This standard is descriptive of the current implemented style (it matches existing Structures/Research/Defenses/Units tables).
- If additional tabs adopt the same pattern, prefer extracting or extending the shared base Table to preserve visual and behavioral parity.
