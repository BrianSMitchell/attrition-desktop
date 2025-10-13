---
description: Standards for research level tables, dynamic column mapping, and UI rendering
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["ui", "research", "tables", "consistency", "react", "typescript"]
globs: ["packages/client/src/components/game/levelTables/research/**/*.ts", "packages/client/src/components/game/ResearchLevelsModal.tsx"]
---

# Research Level Tables — Data & UI Standards

## Objective
Provide a single, reliable pattern for:
- Defining research level rows (data naming).
- Selecting and labeling the single visible metric column.
- Computing table structure (credits-only vs metric vs labs/requires/effect).
- Ensuring consistent UI labels and formatting.

## Canonical Code Location (single source of truth)
Do NOT duplicate metric constants in multiple files. Import these from the canonical module:
- Code: packages/client/src/components/game/levelTables/research/metrics.ts
  - Exports:
    - METRIC_PRIORITY
    - METRIC_LABELS
    - METRIC_KIND
    - selectVisibleMetricKey(rows)
    - computeHasCreditsOnly(rows, visibleMetricKey)

Example (ResearchLevelsModal.tsx):
```ts
import {
  METRIC_LABELS,
  METRIC_KIND,
  selectVisibleMetricKey,
  computeHasCreditsOnly
} from "./levelTables/research/metrics";
```

## Metric Property Names (canonical)
Use these exact keys in level row objects:

- Output Bonuses (percent):
  - `baseEnergyOutputPct`
  - `baseResearchOutputPct`
  - `baseConstructionProductionOutputPct`
  - `unitsArmourPct`
  - `unitsShieldStrengthPct`
  - `laserWeaponsAttackPct`
  - `photonWeaponsAttackPct`
  - `missilesWeaponsAttackPct`
  - `stellarUnitsSpeedPct`
  - `warpUnitsSpeedPct`
  - `plasmaWeaponsAttackPct`
  - `ionWeaponsAttackPct`
  - `disruptorWeaponsAttackPct`

- Counts (integer):
  - `campaignFleets`

Other optional fields:
- `labs?: number`
- `requires?: string`
- `effect?: string`

## Label Map (single source of truth)
These labels MUST be used for UI headers:

```ts
export const RESEARCH_METRIC_LABELS: Record<string, string> = {
  baseEnergyOutputPct: "Base Energy Output",
  baseResearchOutputPct: "Base Research Output",
  baseConstructionProductionOutputPct: "Construction & Production Output",
  campaignFleets: "Campaign Fleets",
  unitsArmourPct: "Units Armour",
  unitsShieldStrengthPct: "Shield Strength",
  laserWeaponsAttackPct: "Laser Weapons Attack",
  photonWeaponsAttackPct: "Photon Weapons Attack",
  missilesWeaponsAttackPct: "Missiles Weapons Attack",
  stellarUnitsSpeedPct: "Stellar Units Speed",
  warpUnitsSpeedPct: "Warp Units Speed",
  plasmaWeaponsAttackPct: "Plasma Weapons Attack",
  ionWeaponsAttackPct: "Ion Weapons Attack",
  disruptorWeaponsAttackPct: "Disruptor Weapons Attack",
};
```

## Priority & Detection
Only one metric column is shown. Pick the first present metric across rows using this ordered list:

```ts
export const METRIC_PRIORITY = [
  "baseEnergyOutputPct",
  "baseResearchOutputPct",
  "baseConstructionProductionOutputPct",
  "campaignFleets",
  "unitsArmourPct",
  "unitsShieldStrengthPct",
  "laserWeaponsAttackPct",
  "photonWeaponsAttackPct",
  "missilesWeaponsAttackPct",
  "stellarUnitsSpeedPct",
  "warpUnitsSpeedPct",
  "plasmaWeaponsAttackPct",
  "ionWeaponsAttackPct",
  "disruptorWeaponsAttackPct",
] as const;
```

Selector pattern:
```ts
type MetricKey = (typeof METRIC_PRIORITY)[number];

const visibleMetricKey: MetricKey | undefined = METRIC_PRIORITY.find(
  (k) => rows.some((r) => typeof (r as any)[k] === "number"),
);
```

## Column Derivation
- Credits-only when:
  ```ts
  const hasCreditsOnly =
    rows.length > 0 &&
    !visibleMetricKey &&
    rows.every((r) => typeof r.labs !== "number" && !r.requires && !r.effect);
  ```
- Empty-state colSpan:
  - 2 when credits-only
  - 3 when a metric column is visible
  - 5 when labs/requires/effect is used (no metric)

## Cell Formatting
- Percent metrics: render as `${value}%`
- Count metrics (`campaignFleets`): `value.toLocaleString()`

Recommendation:
```ts
const METRIC_KIND: Record<MetricKey, "percent" | "count"> = {
  baseEnergyOutputPct: "percent",
  baseResearchOutputPct: "percent",
  baseConstructionProductionOutputPct: "percent",
  campaignFleets: "count",
  unitsArmourPct: "percent",
  unitsShieldStrengthPct: "percent",
  laserWeaponsAttackPct: "percent",
  photonWeaponsAttackPct: "percent",
  missilesWeaponsAttackPct: "percent",
  stellarUnitsSpeedPct: "percent",
  warpUnitsSpeedPct: "percent",
  plasmaWeaponsAttackPct: "percent",
  ionWeaponsAttackPct: "percent",
  disruptorWeaponsAttackPct: "percent",
};
```

## Credits-only Tables

Credits-only tables are those where rows only include `level` and `credits` (no metric column and no `labs`/`requires`/`effect`). They render in a compact 2-column layout (Level, Credits) as determined by `hasCreditsOnly` in the modal:

```ts
const hasCreditsOnly =
  rows.length > 0 &&
  !visibleMetricKey &&
  rows.every((r) => typeof r.labs !== "number" && !r.requires && !r.effect);
```

Examples:
- Stealth, Tachyon Communications, Anti-Gravity (naturally credits-only)
- Ion, Disruptor (may remain credits-only until metrics are formally supported)

Behavior:
- Empty-state colSpan is 2
- No Labs/Requires/Effect columns are shown
- Sorting and styling follow `.clinerules/ui-table-consistency.md`

## Geometric Growth Guideline

Unless canonical screenshots/data specify exact sequences, derive credits per level using a geometric growth anchored at Level 1 credits from the shared catalog (`packages/shared/src/tech.ts`):

- Start at L1 credits from `tech.ts`
- Multiply by ~1.5x per level
- Apply integer rounding at each step
- Keep sequences consistent with existing research tables (e.g., Laser/Photon/Missiles/Plasma patterns)

Helper:
- Use the small utility to generate sequences:
  - packages/client/src/components/game/levelTables/utils/geo.ts
  - `geoSeries({ start, ratio, levels })` returns an array of rounded values

## UI Implementation Checklist
- [ ] Use `METRIC_PRIORITY` to determine `visibleMetricKey`.
- [ ] Header label from `RESEARCH_METRIC_LABELS[visibleMetricKey]`.
- [ ] Format value by `METRIC_KIND`.
- [ ] Compute `hasCreditsOnly` and `colSpan` from derived state (no boolean OR chains).
- [ ] Keep table styling consistent with `.clinerules/ui-table-consistency.md`.

## Mechanics Cross-Reference (required)
When adding or modifying research metric semantics, cross-check:
- docs/Game Mechanics and Rules.md (authoritative mechanics)
- packages/shared/src/tech.ts (L1 cost, labs, and prereqs)
- Ensure balance/semantics adhere to these references

## Enforcement Notes
- MUST NOT redeclare metric constants (METRIC_PRIORITY, METRIC_LABELS, METRIC_KIND) outside packages/client/src/components/game/levelTables/research/metrics.ts. Always import from that module.
- Ion and Disruptor metric header strings MUST exactly equal:
  - Ion: "Ion Weapons Attack"
  - Disruptor: "Disruptor Weapons Attack"

## Testing
- [ ] Correct header label for visible metric.
- [ ] `toLocaleString()` for counts; percent render includes `%`.
- [ ] Empty-state colSpan matches derived structure.
- [ ] Data exactly matches reference sources (images/specs).
