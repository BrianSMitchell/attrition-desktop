# Catalog Key Modernization Plan

## Current Issues

1. **Legacy `mappedType` field** - Maps modern buildings to outdated types:
   - `defense_station` → No longer exists in the game
   - `habitat` → Used as a catch-all for Urban Structures, Crystal Mines, Spaceports, etc.
   - `factory` → Generic type for Metal Refineries, Robotic Factories, etc.

2. **Corrupted data** - Buildings with undefined catalogKey (we just cleaned 5 of these)

3. **Dual system confusion** - Both `type` (legacy) and `catalogKey` (modern) exist in the database

## Proposed Solution

### Phase 1: Remove mappedType dependency
1. Stop using `mappedType` entirely - it's just mapping to legacy values
2. Use `catalogKey` as the single source of truth
3. Keep `type` field for now but deprecate it

### Phase 2: Update database
1. Ensure all buildings have valid catalogKey
2. Set `type` = `catalogKey` for consistency
3. Eventually remove `type` field entirely

### Phase 3: Clean up the catalog
1. Remove `mappedType` from BuildingSpec interface
2. Update all code that references building.type to use building.catalogKey
3. Add validation to prevent undefined catalogKey

## Benefits
- Single source of truth (catalogKey)
- No more "defense_station" or "habitat" confusion
- Cleaner, more maintainable code
- Prevents future data corruption

## Implementation Steps

### Step 1: Create migration script
```typescript
// Migrate all buildings to use catalogKey as type
await Building.updateMany(
  { catalogKey: { $exists: true, $ne: null } },
  [{ $set: { type: "$catalogKey" } }]
);
```

### Step 2: Update BuildingSpec interface
```typescript
export interface BuildingSpec {
  key: BuildingKey;
  name: string;
  creditsCost: number;
  energyDelta: number;
  economy: number;
  populationRequired: number;
  areaRequired?: number;
  advanced?: boolean;
  techPrereqs: BuildingTechPrereq[];
  // Remove mappedType entirely
}
```

### Step 3: Update code references
- Change all `building.type` references to `building.catalogKey`
- Remove mappedType from structure creation logic
- Add validation to ensure catalogKey is always set

Would you like me to start implementing this modernization?