# Energy Display Fix

## Root Cause
The energy balance discrepancy is happening because:
1. The server correctly calculates energy as: Produced 28 - Consumed 30 = Balance -2
2. The modal incorrectly shows consumed as 28 instead of 30 (missing 2 energy consumption)
3. This makes the modal show Balance: 0 when it should show Balance: -2

## The Missing 2 Energy
Based on the database analysis:
- You have 3 Metal Refineries (L12 + L1 + L1 = -14 energy)
- But the modal might only be counting 2 of them (L12 + 0 = -12 energy)
- This creates the 2-point discrepancy

## Quick Fix

Since the server (BaseStatsService) is calculating correctly and returning the right values, the simplest fix is to make sure the header always uses the server's calculated balance.

In BaseDetail.tsx, the energy balance display is already correct:
```tsx
const value = baseStats.energy.rawBalance ?? baseStats.energy.balance ?? 0;
```

The issue is that `basesService.getBaseStructures()` might be filtering out one of the metal refineries when building the breakdown, causing the modal to show incorrect totals.

## Solution Options

1. **Immediate Fix**: Trust the server's calculation
   - The header is already showing the correct value from the server
   - The modal calculation has a bug where it's not counting all buildings correctly

2. **Investigation Needed**: 
   - Check why `basesService.getBaseStructures()` is returning only 2 metal refineries instead of 3
   - Might be a duplicate key issue or a filtering problem

3. **Data Cleanup**:
   - You have 5 buildings with undefined catalogKey that should be removed
   - You might have duplicate metal refineries that need to be consolidated

Would you like me to:
1. Create a script to clean up the duplicate/undefined buildings?
2. Investigate why the modal is missing one metal refinery?
3. Simply accept that the server calculation is correct and the modal has a display bug?