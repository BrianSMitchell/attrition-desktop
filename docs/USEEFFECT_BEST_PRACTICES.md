# useEffect Dependencies with Zustand Actions

## Issue: Infinite Loop with Action Objects

When using Zustand action hooks that return objects (like `useGameActions()`), **never include the entire actions object in useEffect dependencies**. This causes infinite loops because the object reference changes on every render.

## ❌ Wrong - Causes Infinite Loop

```javascript
const gameActions = useGameActions();

useEffect(() => {
  gameActions.loadBaseStats(baseCoord);
}, [baseCoord, gameActions]); // ❌ gameActions changes every render!
```

## ✅ Correct - Stable Dependencies

```javascript
const gameActions = useGameActions();

useEffect(() => {
  gameActions.loadBaseStats(baseCoord);
}, [baseCoord]); // ✅ Zustand actions are stable, no need to include them
```

## Why This Happens

Zustand action hooks like `useGameActions()` return a new object on every render:

```javascript
export const useGameActions = () => useEnhancedAppStore((state) => ({
  loadBaseStats: state.loadBaseStats,  // New object reference each time
  loadResearchData: state.loadResearchData,
  // ...
}));
```

The individual action functions ARE stable (from Zustand store), but the wrapping object is not.

## Solution

Only include the actual dependencies (like `baseCoord`) in the dependency array. The Zustand actions themselves are stable and don't need to be included.

## Fixed in BaseDetail Component

The infinite loop in BaseDetail was caused by this exact issue. Fixed by removing `gameActions` from useEffect dependencies.

## ESLint Rule Exception

If ESLint warns about missing dependencies for action objects, you can disable the rule for that line:

```javascript
useEffect(() => {
  gameActions.loadBaseStats(baseCoord);
}, [baseCoord]); // eslint-disable-line react-hooks/exhaustive-deps
```