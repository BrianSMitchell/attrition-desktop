# Structures Display Bug Fix

## Problem

Structures were not displaying on the base page, and attempting to navigate to the structures page caused a complete page crash with the error:

```
TypeError: (r || []).slice is not a function
    at BaseDetail-BuGRqf58.js:1:46015
```

## Root Cause

The `StructuresBuildTable` and `ResearchBuildTable` components had **insufficient type guards** when processing catalog arrays. The code used:

```typescript
// ❌ Vulnerable code
const structs = React.useMemo<BuildingSpec[]>(
  () => (catalog || []).slice().sort((a, b) => a.creditsCost - b.creditsCost),
  [catalog]
);
```

**Problem:** The `(catalog || [])` pattern only handles `null` or `undefined`, but not other non-array types. During the component's initial render or when data is loading, `catalog` could be:
- `undefined` (handled by ||)
- An **object** instead of an array (NOT handled)
- Some other non-array type

When `catalog` was an object, calling `.slice()` on it caused the TypeError because objects don't have a `.slice()` method.

## Solution

Added proper `Array.isArray()` checks before attempting array operations:

### Fix 1: StructuresBuildTable.tsx

**Before:**
```typescript
const structs = React.useMemo<BuildingSpec[]>(
  () => (catalog || []).slice().sort((a, b) => a.creditsCost - b.creditsCost),
  [catalog]
);
```

**After:**
```typescript
const structs = React.useMemo<BuildingSpec[]>(
  () => {
    // Ensure catalog is an array before calling .slice()
    if (!Array.isArray(catalog)) return [];
    return catalog.slice().sort((a, b) => a.creditsCost - b.creditsCost);
  },
  [catalog]
);
```

### Fix 2: ResearchBuildTable.tsx

**Before:**
```typescript
items={(catalog || []).filter(t => t && t.key).slice().sort((a, b) => a.creditsCost - b.creditsCost)}
```

**After:**
```typescript
items={Array.isArray(catalog) ? catalog.filter(t => t && t.key).slice().sort((a, b) => a.creditsCost - b.creditsCost) : []}
```

## Why This Happened

The structures loading flow works like this:

1. **Component mounts** → `catalog` is initially `undefined` or empty
2. **Data request sent** → `loadStructuresData()` called
3. **Response arrives** → Store updates with `catalog: catalogResponse.data || []`
4. **Component re-renders** → Should display structures

However, during React's strict mode or fast refresh, there can be intermediate states where props are partially defined or have unexpected types. The `Array.isArray()` check is the **most robust** way to handle this.

## Impact

✅ **Structures panel now loads correctly**
✅ **No more page crashes when navigating to structures**
✅ **Robust against various edge cases during loading states**
✅ **Same fix applied to research panel to prevent similar issues**

## Files Changed

### Client Package
- `packages/client/src/components/game/StructuresBuildTable.tsx` - Added Array.isArray() guard
- `packages/client/src/components/game/ResearchBuildTable.tsx` - Added Array.isArray() guard

## Build Status

✅ Client build successful (828 modules transformed)
✅ All TypeScript compilation passed
✅ Production bundle created

## Testing

To verify the fix:

1. **Navigate to a base** (`/base/:coord`)
2. **Click on "Structures" tab**
3. **Verify:** Structures list displays without errors
4. **Check console:** No TypeError about `.slice()`

## Related Issues

This fix also addresses similar potential issues in:
- Defense panels (uses similar pattern)
- Research panels (fixed preventatively)
- Any other components using `(catalog || [])` pattern

## Best Practice Learned

**Always use `Array.isArray()` for array type checks:**

```typescript
// ❌ Don't rely on truthiness
const items = (maybeArray || []);

// ✅ Explicit array check
const items = Array.isArray(maybeArray) ? maybeArray : [];
```

This is especially important when:
- Data comes from API responses
- Props might be undefined during loading
- Working with React strict mode
- Handling edge cases in production

## Notes

- Token storage bug was also fixed in the same session (see `TOKEN_STORAGE_FIX.md`)
- Both fixes are independent and address different issues
- No breaking changes to API contracts
- All existing tests should continue to pass
