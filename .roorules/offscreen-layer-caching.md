---
description: Canonical offscreen canvas layer caching standard (helper usage, keys, hygiene, testing) for all map views
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["canvas", "performance", "caching", "helper", "parity", "testing", "react"]
globs: ["packages/client/src/components/game/map/**/*", "**/*Canvas*", "**/*.tsx", "**/*.ts"]
---

# Offscreen Layer Caching — Canonical Standard

Companion to interactive-canvas-architecture.md (canonical architecture). This file standardizes the canonical offscreen layer helper, cache keys, and hygiene.

This rule formalizes how all interactive canvas views implement offscreen layer caching to ensure visual parity, performance, and maintainability. It augments and specializes guidance from:
- interactive-canvas-architecture.md
- canvas-visualization-debugging.md

## Objective

- Eliminate redundant redraws by caching static/semi-static layers offscreen.
- Standardize cache key generation and hygiene so caches are reused deterministically and cleared predictably.
- Maintain strict parity between draw and hit-test layout logic.

## Canonical Helper (single source of truth)

Path:
- `packages/client/src/components/game/map/helpers/offscreenLayers.ts`

API:
- `createOffscreenLayer(width, height): HTMLCanvasElement`
- `drawToLayer(layer, (ctx) => void): void`
- `composeLayers(targetCtx, layers: HTMLCanvasElement[]): void`
- `getCacheKeyFromDeps(deps: Record<string, unknown>): string` (stable, sorted-keys, circular guards)
- `buildCachedLayer(prefix: string, deps, cache: LayerCache, builder: () => HTMLCanvasElement): HTMLCanvasElement`
- `clearLayerCache(cache: LayerCache, predicate?: (key: string) => boolean): void`

Cache type:
- `export type LayerCache = Map<string, HTMLCanvasElement>`

## Key Prefix Conventions

Use the following prefixes to make cache hygiene targeted and legible:

- GalaxyView
  - `galaxy:grid`
  - `galaxy:regions`
- RegionView
  - `region:grid`
  - `region:systems`
- SystemView
  - `system:background`
  - `system:bodies`
- UniverseOverview (if applicable)
  - `universe:background`
  - `universe:galaxies`

Do not invent ad-hoc prefixes. Extend the list here when adding new views/layers.

## Dependency Fingerprinting (deps) — Minimal, Stable, Visual

Rules:
- Include only minimal, visual-affecting deps:
  - Dimensions: `width`, `height`
  - IDs/flags: `galaxyId`, `regionId`, `showGrid`, `showTerritories`, etc.
  - Theme/style tokens if visuals depend on them: `theme`, `lineStyle`, `paletteKey`
    - Only include theme/lowDetail flags in deps when they materially change the cached layer's visual output (e.g., reduced stroke weight, fewer elements). If they only affect overlays or runtime complexity without altering pixels of the cached layer, do not include them.
  - Stable hashes in place of large arrays/objects: `starsHash`, `empireHash`, etc.
- Do not include raw arrays or large objects directly in deps.
- When visuals depend on collections, compute lightweight, deterministic hashes:
  - Example (counts rolling checksum): `count` + `accum = (accum * 31 + len + index) >>> 0`
  - Example for string lists (e.g., territories): ROLLING DJB2-like: `accum = (accum * 33 + charCode) >>> 0` over sorted strings

Examples:
- Galaxy regions layer:
  ```
  prefix: "galaxy:regions"
  deps: { width, height, galaxyId, showTerritories, empireHash, starsHash }
  ```
- Galaxy grid layer:
  ```
  prefix: "galaxy:grid"
  deps: { width, height, showGrid, cols: 10, rows: 10, theme?: "dark" }
  ```

## Composition Order

- This is a MUST: always draw static-most layers first:
  1) Static background/grid (rarely changes)
  2) Dynamic data-driven layer (changes with server/flags)
  3) UI overlays/labels/selection indicators
- Prefer `composeLayers(ctx, [gridLayer, regionsLayer])` for clarity and reuse.

## Lifecycle and Hygiene

- Create a component-level cache ref once:
  ```
  const layerCacheRef = React.useRef<LayerCache>(new Map());
  ```
- On resize and theme changes, clear affected caches by prefix:
  ```
  clearLayerCache(layerCacheRef.current, k =>
    k.startsWith("galaxy:grid") || k.startsWith("galaxy:regions")
  );
  ```
- Also consider clearing when toggling feature flags that affect visuals (e.g., showGrid, showTerritories) if those flags are not included in deps.
- On unmount, optional: clear the entire cache if memory is a concern for very large layers.

## Draw/Hit-Test Parity

- Fitted layout is single-source-of-truth via a cached calculation (e.g., `layoutRef` with `calculateFittedGridLayout`).
- The same parameters must be used by both draw functions and hit-test/click mapping helpers.
- Never return JSX from draw functions. Draw directly on canvas contexts.

## Performance Guidance

- Keep builders pure and deterministic for a given deps set.
- Avoid repeatedly creating offscreen canvases for unchanged deps.
- Maintain `fpsRef`-driven adaptive complexity as an independent concern; it should not break cache keys unless the visual output materially changes (then include a lowDetail flag in deps to make it explicit).

## Testing Requirements

- Unit tests (helper-level):
  - Ensure `getCacheKeyFromDeps` produces identical strings for key-equivalent objects with different key orders.
  - Circular reference presence does not crash and is handled deterministically.
- Unit tests (hash utilities if standardized):
  - `starsHash` is stable for the same inputs and changes when counts change.
  - `empireHash` is stable for sorted lists and changes when territories change.
- Integration tests (view-level):
  - Render once and record the layer reference; render again with the same deps and assert the same cached layer instance is reused.
  - Change `width`/`height` or `theme` and assert the cache is cleared and a new layer is created.
- E2E tests (optional, per end-to-end-testing-protocol.md):
  - FPS remains ≥ 30 under standard loads with caching on (baseline expectation, not a strict failure if temporarily below).

## Migration Checklist

- [ ] Replace ad-hoc offscreen canvases with `buildCachedLayer(prefix, deps, cache, builder)`.
- [ ] Standardize prefixes per this rule.
- [ ] Ensure deps are minimal and stable; add theme/style tokens when visuals change with theme.
- [ ] Introduce cache hygiene on resize/theme changes:
  ```
  clearLayerCache(cacheRef.current, (k) => k.startsWith("galaxy:grid") || k.startsWith("galaxy:regions"))
  ```
- [ ] Use `composeLayers` for multi-layer scenes.
- [ ] Verify draw/hit-test parity (same fitted layout inputs).
- [ ] Add/extend tests where practical (unit for deps/keys; integration for reuse/clear).

## Example Snippets

- Building a cached regions layer (GalaxyView):
```ts
const deps = {
  width: canvas.width,
  height: canvas.height,
  galaxyId: selectedCoordinate.galaxy,
  showTerritories,
  empireHash: computeEmpireTerritoryHash(empire),
  starsHash: computeStarsHash(regionStarsByRegion),
};

const layer = buildCachedLayer("galaxy:regions", deps, layerCacheRef.current, () => {
  const off = createOffscreenLayer(canvas.width, canvas.height);
  drawToLayer(off, (rctx) => {
    drawRegionsLayer(rctx, fittedLayout, selectedCoordinate.galaxy, showTerritories, empire, regionStarsByRegion);
  });
  return off;
});

ctx.drawImage(layer, 0, 0);
```

- Clearing caches on dimension/theme changes:
```ts
React.useEffect(() => {
  const cache = layerCacheRef.current;
  clearLayerCache(cache, (k) => k.startsWith("galaxy:grid") || k.startsWith("galaxy:regions"));
}, [canvas.width, canvas.height, themeKey]);
```

## View-specific examples

- UniverseOverview
  - Prefixes:
    - `universe:background`
    - `universe:galaxies`
  - Example deps for galaxies layer (minimal, visual-affecting):
    - `{ width, height, showGrid?, galaxiesHash }`
      - `galaxiesHash` should be a lightweight, deterministic hash (e.g., count-based checksum over galaxy summaries).
  - Cache hygiene example:
    ```ts
    clearLayerCache(layerCacheRef.current, (k) =>
      k.startsWith("universe:background") || k.startsWith("universe:galaxies")
    );
    ```
  - Reminder: Do not include `lowDetail` in deps unless it materially changes the pixels of the cached layer (e.g., fewer elements or different stroke weights for galaxies). If `lowDetail` only affects overlays or runtime complexity, omit it from deps.

- SystemView
  - Prefix:
    - `system:background`
  - Example deps (minimal, visual-affecting):
    - `{ width, height, systemId }`
  - Cache hygiene example:
    ```ts
    clearLayerCache(layerCacheRef.current, (k) =>
      k.startsWith("system:background")
    );
    ```
  - Keep dynamic bodies/labels in separate layers when appropriate; compose with `composeLayers` using static-most-first order.

## Success Criteria

- Cached layers are reused across frames when deps are unchanged.
- Caches are cleared predictably on dimension/theme/flag changes.
- Click detection aligns with the exact same layout used for drawing.
- 60fps target is achievable on typical hardware; lowDetail fallback engages only as needed.
- No JSX in draw functions; canvas-only operations inside the animation loop.

## Notes

- This document governs caching patterns for GalaxyView/RegionView/SystemView/UniverseOverview. When adding new views, extend prefixes and hash utilities here.
- This standard should be referenced by any code review that touches canvas rendering or offscreen caching logic.
