---
description: Companion standard for rendering planet-derived inline hints in Structures tables and a helper signature to centralize mapping logic.
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["ui", "tables", "planet-context", "hints", "react", "testing"]
globs: ["packages/client/src/components/game/**/*.tsx", "packages/client/src/components/game/**/*.ts"]
---

# Planet-Derived Inline Hints — Companion Standard

Companion to `.clinerules/tabular-build-ui-standard-and-test-plan.md` (see "Inline Planet-Derived Hints"). This document provides a small helper API contract and behavioral rules for all per-base, planet-derived hints rendered in the Structures tab.

## Objective

- Standardize how Structures rows render a compact, planet-derived "next level gain" hint in the name block.
- Centralize mapping logic from building keys to labels/values so future structures can be added consistently.
- Preserve the compact table layout and keep hints strictly presentational.

## UI Placement & Style

- Location: in the first-column name block, after the optional “(Level N)” badge.
- Styling: `ml-2 text-xs text-gray-400`
- Format: `(+{value.toLocaleString()} {label} here)`
- Render only when `value` is a finite number.
- Render exactly one hint (chosen by building key).

Initial canonical label map:
- `solar_plants` → `energy`
- `gas_plants` → `energy`
- `metal_refineries` → `metal`
- `urban_structures` → `fertility`
- `crystal_mines` → `crystals`

## Helper API (Client)

Recommended helper to avoid duplicating mapping logic:

File: `packages/client/src/components/game/planetHints.ts`
```ts
import type { BuildingSpec } from "@game/shared";

/** Planet context fetched from universeService.getLocationByCoord(coord) */
export interface PlanetContext {
  solarEnergy?: number;     // result.solarEnergy
  gasYield?: number;        // result.yields.gas
  metalYield?: number;      // result.yields.metal
  crystalsYield?: number;   // result.yields.crystals
  fertility?: number;       // result.fertility
}

/**
 * Returns {label, value} for a given structure key using planet context,
 * or null if no hint should be rendered.
 */
export function getPlanetHintForStructure(
  s: BuildingSpec,
  ctx: PlanetContext
): { label: string; value: number } | null {
  switch (s.key) {
    case "solar_plants":
      return Number.isFinite(ctx.solarEnergy) ? { label: "energy", value: ctx.solarEnergy as number } : null;
    case "gas_plants":
      return Number.isFinite(ctx.gasYield) ? { label: "energy", value: ctx.gasYield as number } : null;
    case "metal_refineries":
      return Number.isFinite(ctx.metalYield) ? { label: "metal", value: ctx.metalYield as number } : null;
    case "urban_structures":
      return Number.isFinite(ctx.fertility) ? { label: "fertility", value: ctx.fertility as number } : null;
    case "crystal_mines":
      return Number.isFinite(ctx.crystalsYield) ? { label: "crystals", value: ctx.crystalsYield as number } : null;
    default:
      return null;
  }
}
```

Usage (StructuresBuildTable excerpt):
```tsx
const hint = getPlanetHintForStructure(s, {
  solarEnergy: planetSolarEnergy,
  gasYield: planetGasYield,
  metalYield: planetMetalYield,
  crystalsYield: planetCrystalsYield,
  fertility: planetFertility,
});

{hint && (
  <span className="ml-2 text-xs text-gray-400">
    (+{hint.value.toLocaleString()} {hint.label} here)
  </span>
)}
```

Notes:
- Keep values sourced from `universeService.getLocationByCoord(coord)` (single source of truth).
- Only show a hint when the contextual value is numeric.
- If additional structures receive planet-based gains in the future, extend the switch/case (or a map) in this helper.

## Testing Guidance

- Component tests should assert the hint substring in the Structures name cell when the corresponding context prop is provided.
- Use `data-testid="name-${key}"` to query the name cell in tests.
- Example assertions:
  - Given `planetSolarEnergy=7` and row `solar_plants` → `(+7 energy here)`
  - Given `planetGasYield=5` and row `gas_plants` → `(+5 energy here)`
  - Given `planetMetalYield=12` and row `metal_refineries` → `(+12 metal here)`
  - Given `planetFertility=3` and row `urban_structures` → `(+3 fertility here)`
  - Given `planetCrystalsYield=9` and row `crystal_mines` → `(+9 crystals here)`

## Cross-References

- Canonical UI standard and layout: `.clinerules/tabular-build-ui-standard-and-test-plan.md` (Inline Planet-Derived Hints)
- Planet data source and mechanics: `.clinerules/game-mechanics-consultation.md` + `packages/client/src/services/universeService.ts`
- End-to-End visual checks: `.clinerules/end-to-end-testing-protocol.md` (add UI validation step for hints)
- Complex component architecture patterns: `.clinerules/complex-react-component-architecture.md`

## Success Criteria

- A single helper determines hint label/value per building key.
- Hint rendering does not alter table structure, sorting, or action alignment.
- Tests document and verify the exact strings in all representative cases.
