---
description: Standardize compact build/research tables across game tabs (Structures, Research, Defenses, Units). Ensures visual/behavioral parity and reduces divergence.
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["ui", "consistency", "react", "tables", "design-system"]
globs: ["packages/client/src/components/game/**/*"]
---

# UI Table Consistency Rule (Build/Research/Defenses Tabs)

> DEPRECATION NOTICE: This rule has been superseded by `.clinerules/tabular-build-ui-standard-and-test-plan.md`. Keep this document for historical context; new changes MUST be made in the consolidated rule.

## Objective
Create a consistent, compact table pattern for all build/research tabs (e.g., Structures, Research, Defenses, Units) to match the current Structures tab style and the new Research table.

Spec version: Baseline v1 (no “Phase” terminology; changes should increment this version explicitly)

## Required Visual/Behavioral Patterns

1. Container and Header
- Wrap tables in `game-card !bg-gray-900 border border-gray-700`
- Card header: 
  - Title left-aligned in `text-lg font-semibold text-empire-gold`
  - Right side: small summary values (e.g., Credits), then a small `Refresh` button
  - Example refresh button classes: `text-xs px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700`

2. Table Basics
- Use `table.min-w-full.text-sm`
- Sticky thead: `thead.sticky.top-0.bg-gray-800`
- Header row classes: `text-gray-300 border-b border-gray-700`
- Data rows: `border-b border-gray-800 hover:bg-gray-800/60`
- Left-aligned text by default, action column right-aligned

3. First Column (Entity Title Block)
- Show the entity name in white
- Under it, a gray description line (`text-xs text-gray-400`), when available
- If action is ineligible, show red reasons under name as a single joined line:
  - `text-xs text-red-300 mt-1` with `reasons.join('; ')`
- Level badge convention:
  - Show “(Level X)” appended to the name when `X > 0`
  - Render nothing when level is 0

4. Columns and Content
- Structures (example): Structure | Credits | Energy | Economy | Population | Area | Advanced | Requires | Time | Build
- Research: Technology | Credits | Labs | Requires | Effect | Time | Start
- Defenses: Defense | Credits | Energy | Area | Requires | Start
- Requires column:
  - Empty/none uses em dash (‘—’)
  - When non-empty, render in `text-red-400` to draw attention
- Use compact numeric formatting (`toLocaleString()`)

5. Start/Build Action Button
- Right-aligned in the last column
- Enabled: `bg-blue-600 hover:bg-blue-700 text-white`
- Disabled: `bg-gray-600 text-gray-400 cursor-not-allowed`
- Tooltip: when disabled & reasons exist, `title={reasons.join('; ')}`
- Label: “Start” or “Unavailable” (Structures matches this pattern)

6. Sorting
- Default sort by primary cost (`creditsCost`) ascending
- Keep UX consistent across tabs

7. Error & Refresh UX
- Render an error banner above the table when needed:
  - `p-3 bg-red-900/50 border border-red-700 rounded-md text-red-200`
- Provide a `Refresh` button in the card header, not inside the table

## Reusable Component Guidance

When two or more tabs share the same pattern:
- Prefer extracting a generic `BuildTable` base with render props:
  - name/description renderer
  - columns model (keys, header labels, cell renderers)
  - eligibility model `{ canStart: boolean; reasons: string[] }`
  - start handler
- Keep table styling in the base to guarantee visual parity

### Suggested Props Shape (example)
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
  summary?: React.ReactNode;    // e.g., credits / labs display
  loading?: boolean;
  onRefresh?: () => void;
  items: T[];
  columns: Column<T>[];
  getEligibility: (item: T) => Eligibility;
  onStart: (item: T) => void | Promise<void>;
}
```

## Implementation Checklist

- [ ] Match container, sticky header, row classes shown above
- [ ] Render reasons under the name in red, one line with `; ` joining
- [ ] Right-align Start button in the last column
- [ ] Disabled button has tooltip with reasons
- [ ] Default sort by credits ascending
- [ ] Level badge follows “(Level X)” when X > 0, else blank
- [ ] Use the error banner block above the table when needed
- [ ] Place Refresh in header, not inside the table
- [ ] Prefer a shared base table when multiple tabs share the pattern

## Notes
- Research Time column may be included and display '—' until a research-per-hour capacity exists.
- Defenses do not display level badges; no “(Level X)” suffix is shown.
- Defenses Area column: show blank when 0, show -X for positive area, and default to -1 if unspecified (to match current UI).
- Keep colors and tailwind classes consistent with Structures to maintain visual cohesion.
