---
description: Consolidated interactive canvas architecture, debugging, and performance guide for UniverseMap/Galaxy/Region/System views. Defines animation loop, event pipeline, click parity, performance, fullscreen, state management, checklists, and success metrics.
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["canvas", "visualization", "debugging", "performance", "react", "interactive-graphics", "zoom-interface"]
globs: ["packages/client/src/components/game/**/map/**/*", "**/*Canvas*", "**/*.tsx", "**/*.ts"]
---

# Interactive Canvas Architecture, Debugging & Performance

## Overview

This rule consolidates the complete methodology for implementing and maintaining interactive canvas-based visualizations used by UniverseMap and its subviews (UniverseOverview, GalaxyView, RegionView, SystemView):

- Architecture patterns for animation, layering, and state separation
- Event pipeline (screen → canvas → game coordinates) with strict click detection parity
- Performance strategies (FPS budgeting, selective redraws, caching)
- Fullscreen container sizing and z-index hygiene
- Zustand store guidelines and persistence boundaries
- Error prevention checklist and success metrics

It supersedes and consolidates previous guidance in `canvas-visualization-debugging.md` and `interactive-canvas-visualization.md`.

## Critical Architecture Rules

### Do NOT mix React components with canvas drawing

Forbidden:
```ts
// ❌ React JSX returned from a "draw" function breaks the canvas model
const drawGalaxy = () => {
  return <GalaxyComponent />;
};
useEffect(() => {
  const animate = () => {
    const el = drawGalaxy(); // JSX, not canvas ops
    requestAnimationFrame(animate);
  };
  animate();
}, []);
```

Correct:
```ts
// ✅ Canvas-only drawing
const drawGalaxy = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.fillStyle = "rgba(255, 255, 150, 1.0)";
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fill();
};
useEffect(() => {
  let id: number;
  const animate = () => {
    renderCurrentView(); // only canvas ops inside
    id = requestAnimationFrame(animate);
  };
  animate();
  return () => id && cancelAnimationFrame(id);
}, []);
```

## Core Animation Loop

Use a guarded requestAnimationFrame loop with proper cleanup to prevent multiple concurrent loops and memory leaks.

```ts
class CanvasAnimationManager {
  private animationId: number | null = null;
  private isAnimating = false;

  start = () => {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.tick();
  };

  private tick = () => {
    if (!this.isAnimating) return;
    this.clear();
    this.renderLayers(); // background → content → overlays
    this.animationId = requestAnimationFrame(this.tick);
  };

  stop = () => {
    this.isAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  };

  private clear() {/* impl */}
  private renderLayers() {/* impl */}
}
```

### Layering Guidelines

- Background (solid dark background, subtle starfield)
- Content (galaxies/regions/systems/planets)
- UI overlays (selection indicators, tooltips, legends)

Ensure high contrast for dark themes:
- Background: `#0a0a1a`
- Primary elements alpha: 0.8–1.0
- Secondary elements alpha: 0.4–0.6
- Use luminous gradients for cores/glows

```ts
const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
g.addColorStop(0, "rgba(255,255,150,1.0)");
g.addColorStop(1, "rgba(255,150,50,0.2)");
ctx.fillStyle = g;
ctx.beginPath();
ctx.arc(cx, cy, 20, 0, Math.PI * 2);
ctx.fill();
```

## Event Pipeline and Click Detection Parity

Always transform events through the exact same parameters used in drawing functions.

```ts
const handleCanvasClick = (e: React.MouseEvent) => {
  const rect = canvasRef.current!.getBoundingClientRect();
  const screenX = e.clientX - rect.left;
  const screenY = e.clientY - rect.top;

  // Screen → Canvas
  const canvasX = (screenX - viewport.position.x) / viewport.scale;
  const canvasY = (screenY - viewport.position.y) / viewport.scale;

  // Canvas → Game (depends on zoom level)
  const gameCoords = canvasToGame({ x: canvasX, y: canvasY }, zoomLevel);

  // Match drawing grid parameters exactly:
  const entitySize = 80;
  const padding = 20;
  const cols = 8;

  const totalCell = entitySize + padding;
  const startX = (canvasSize.width - cols * totalCell + padding) / 2;

  const relX = canvasX - startX;
  const col = Math.floor(relX / totalCell);

  const localX = relX % totalCell;
  const inside = localX < entitySize;

  if (col >= 0 && col < cols && inside) {
    const id = computeEntityId(col, gameCoords);
    // process click
  }
};
```

### Drag/Pan and Zoom

```ts
let dragging = false;
let last = { x: 0, y: 0 };

const onMouseDown = (e: MouseEvent) => { dragging = true; last = { x: e.clientX, y: e.clientY }; };
const onMouseMove = (e: MouseEvent) => {
  if (!dragging) return;
  const dx = e.clientX - last.x;
  const dy = e.clientY - last.y;
  updateViewport({ position: { x: viewport.position.x + dx, y: viewport.position.y + dy }});
  last = { x: e.clientX, y: e.clientY };
};
const onMouseUp = () => { dragging = false; };
```

## Performance Optimization

### Selective Redraws and Caching

- Track regions that changed; redraw only those.
- Cache expensive transforms and hit areas.
- Use off-screen canvases for static layers.

```ts
interface RenderState {
  needsRedraw: boolean;
  changedRegions: Set<string>;
}
const optimizedRender = (state: RenderState) => {
  if (!state.needsRedraw) return;
  state.changedRegions.forEach(renderRegion);
  state.needsRedraw = false;
  state.changedRegions.clear();
};
```

### FPS Monitoring and Adaptive Quality

```ts
class PerformanceMonitor {
  private frames = 0;
  private last = 0;
  private fps = 0;

  update(now: number) {
    this.frames++;
    if (now - this.last >= 1000) {
      this.fps = this.frames;
      this.frames = 0;
      this.last = now;
      if (this.fps < 30) this.reduceVisualComplexity();
    }
  }
  private reduceVisualComplexity() {/* reduce particle count, simplify paths */}
}
```

## Fullscreen Implementation

- Minimal padding and correct z-index to fully utilize the screen.
- Keep overlays (close button) above canvas.

```tsx
// Container
<div className="fixed inset-0 z-50 bg-gray-900">
  <div className="absolute top-4 right-4 z-60">
    <button onClick={closeFullscreen}>✕ Close</button>
  </div>
  <div ref={containerRef} className="relative w-full h-full bg-gray-900 overflow-hidden">
    <canvas width={size.width} height={size.height} />
  </div>
</div>

// Resize
const handleResize = useCallback(() => {
  const rect = containerRef.current!.getBoundingClientRect();
  setSize({
    width: Math.max(800, rect.width - 16),
    height: Math.max(600, rect.height - 80),
  });
}, []);
```

## Multi-Level Zoom Interface

```ts
enum ZoomLevel { UNIVERSE=0, GALAXY=1, REGION=2, SYSTEM=3 }
interface ViewportState { position: { x: number; y: number }; scale: number; }

const handleZoomTransition = (from: ZoomLevel, to: ZoomLevel, coord: string) => {
  const parsed = parseCoordinate(coord);
  const nextViewport = calculateViewportForLevel(to, parsed);
  animateViewportTransition(viewport, nextViewport);
  setZoomLevel(to);
  loadDataForLevel(to, parsed);
};
```

## State Management (Zustand)

- Keep visualization state separate from app state.
- Persist only user preferences; do not persist viewport/navigation to avoid stale positions across sessions.

```ts
interface VisualizationState {
  zoomLevel: ZoomLevel;
  viewport: ViewportState;
  showGrid: boolean;
  showTerritories: boolean;
  selectedCoordinate: string | null;
  navigateToCoordinate: (coord: string) => void;
  setViewport: (vp: Partial<ViewportState>) => void;
}

const useVisualizationStore = create<VisualizationState>()(
  persist(
    (set, get) => ({
      zoomLevel: ZoomLevel.UNIVERSE,
      viewport: { position: { x: 0, y: 0 }, scale: 1 },
      showGrid: true,
      showTerritories: true,
      selectedCoordinate: null,
      navigateToCoordinate: (coord) => {/* ... */},
      setViewport: (vp) => set((s) => ({ viewport: { ...s.viewport, ...vp } })),
    }),
    {
      name: "visualization-storage",
      partialize: (s) => ({
        showGrid: s.showGrid,
        showTerritories: s.showTerritories,
      }),
    }
  )
);
```

## Integration Patterns

- Render loop lives in container components (e.g., `UniverseMap.tsx`), while per-zoom-level modules expose pure draw functions.
- Data fetching is batched and cached; view rendering reuses cached color/position data.
- Tooltips and legends are standard React UI layered above the canvas.

## Error Prevention Checklist

Before implementation:
- [ ] Define component hierarchy: Container → Canvas → Drawing functions
- [ ] Define coordinate transforms and click detection that exactly match draw params
- [ ] Choose visibility colors and alpha for dark theme
- [ ] Separate state (Zustand), plan persistence partialization

During development:
- [ ] Guard animation loop; ensure cleanup
- [ ] Validate click hit tests against layout
- [ ] Monitor FPS; reduce complexity under 30fps
- [ ] Profile heavy paths and cache results

Before deployment:
- [ ] 60fps under expected load
- [ ] Interactions accurate across zoom levels
- [ ] No memory leaks (RAF/event listeners cleaned)
- [ ] Legible visuals with proper contrast

## Success Metrics

- ✅ Smooth 60fps animations without drops under typical load
- ✅ Accurate hit detection matching draw layout
- ✅ High-contrast visuals on dark backgrounds
- ✅ Efficient memory usage with proper cleanup
- ✅ Scalable design supporting new layers/zoom levels
- ✅ Seamless integration with UI overlays and controls

## Common Pitfalls

1. Mixing React JSX with canvas drawing
2. Divergent draw vs hit-test parameters
3. Unbounded animation loops (no cleanup/guards)
4. Overdraw without selective redraw strategies
5. Persisting viewport leading to confusing restores
6. Poor contrast on dark backgrounds
7. Z-index or padding preventing true fullscreen

## Testing Hints

- Manual checks:
  - Visual clarity at all zooms, tooltips readable
  - Clicks select the element you drew (parity)
  - Resize to fullscreen behaves correctly
- Automated:
  - Unit test coordinate parsing/mapping
  - Integration tests for store actions (navigate, toggle layers)
  - Performance harness (optional) to ensure no regressions

## Notes

- This document consolidates previous canvas rules; leave legacy files in place until adoption is complete, then optionally remove with explicit approval.
- Reference implementations can be found in:
  - `packages/client/src/components/game/UniverseMap.tsx`
  - `packages/client/src/components/game/map/UniverseOverview.tsx`
  - `packages/client/src/components/game/map/GalaxyView.tsx`
  - `packages/client/src/components/game/map/RegionView.tsx`
  - `packages/client/src/components/game/map/SystemView.tsx`
