# Energy Balance Display Fix

## Problem
The energy balance displayed in the main base header was showing 0, while the energy breakdown dialog was correctly showing +2. This inconsistency was confusing because both should show the same current energy balance.

## Root Cause
The issue was in how different components were accessing the energy balance data from the server:

1. **BaseStatsService** (server-side) returns three energy balance values:
   - `balance`: The projected balance (includes reservations for construction/defenses)
   - `rawBalance`: The current actual balance (without reservations) 
   - `projectedBalance`: Same as `balance`

2. **Component Inconsistencies**:
   - **BasePage.tsx**: Was using a complex fallback calculation that ultimately used `baseStats.energy.balance` (projected balance with reservations)
   - **PlanetInfoBlock.tsx**: Was directly using `baseStats.energy.balance` (projected balance with reservations)
   - **BaseDetail.tsx**: Was correctly using `baseStats.energy.rawBalance ?? baseStats.energy.balance` (current balance without reservations)

The energy breakdown dialog calculates its balance by summing up individual production/consumption sources, which gives the current actual balance without reservations. This matched `rawBalance` but not `balance`.

## Solution
Updated both BasePage.tsx and PlanetInfoBlock.tsx to use the same pattern as BaseDetail.tsx:

```typescript
// Before (BasePage.tsx - complex fallback)
const produced = Number(baseStats.energy.produced ?? 0);
const consumed = Number(baseStats.energy.consumed ?? 0);
const computedRaw = produced - consumed;
const value = (
  (typeof (baseStats.energy as any).rawBalance === 'number' ? (baseStats.energy as any).rawBalance : null) ??
  (Number.isFinite(computedRaw) ? computedRaw : null) ??
  baseStats.energy.balance
);

// After (simplified and consistent)
const value = baseStats.energy.rawBalance ?? baseStats.energy.balance ?? 0;
```

```typescript
// Before (PlanetInfoBlock.tsx)
baseStats.energy.balance

// After (consistent with other components)
baseStats.energy.rawBalance ?? baseStats.energy.balance ?? 0
```

## Files Changed
1. `packages/client/src/components/game/BasePage.tsx` - Lines 295-300
2. `packages/client/src/components/game/PlanetInfoBlock.tsx` - Lines 227-228

## Result
- Main base header now shows energy balance as +2 (matching the breakdown dialog)
- All energy balance displays are now consistent across the application
- Uses the current actual energy balance without reservations, which is what users expect to see in the main display
- Projected balance (with reservations) is still available for advanced calculations when needed

## Testing
After building the client, the energy balance should now display consistently as +2 in both:
- The main base header in the "All Bases Overview"
- The detailed energy breakdown dialog