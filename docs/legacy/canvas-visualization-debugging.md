---
description: Systematic debugging methodology for canvas-based visualization issues, particularly for React applications with interactive graphics
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["canvas", "debugging", "visualization", "react", "performance", "interactive-graphics"]
globs: ["**/*.tsx", "**/*.ts", "src/components/**/map/**/*", "src/components/**/*Canvas*"]
---

> Deprecated — Do not modify. This guidance has been consolidated into interactive-canvas-architecture.md (canonical). Keep for historical context only.

# Canvas Visualization Debugging Methodology

## Overview

This rule provides a systematic approach to diagnosing and fixing canvas-based visualization issues, particularly when dealing with dark/invisible interfaces, broken interactions, and performance problems in React applications.

## Critical Architecture Anti-Patterns

### ❌ NEVER Mix React Components with Canvas Drawing

**Forbidden Pattern:**
```typescript
// ❌ BREAKS CANVAS RENDERING
const drawGalaxy = () => {
  return <GalaxyComponent />; // React component in canvas context
};

useEffect(() => {
  const animate = () => {
    const galaxyElement = drawGalaxy(); // Returns JSX, not canvas operations
    animationId = requestAnimationFrame(animate);
  };
}, []);
```

**✅ Correct Pattern:**
```typescript
// ✅ DIRECT CANVAS OPERATIONS
const drawGalaxy = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
  ctx.fillStyle = 'rgba(255, 255, 150, 1.0)';
  ctx.beginPath();
  ctx.arc(x, y, 20, 0, Math.PI * 2);
  ctx.fill();
};

useEffect(() => {
  const animate = () => {
    renderCurrentView(); // Direct canvas drawing functions only
    animationId = requestAnimationFrame(animate);
  };
}, []);
```

## Systematic Debugging Protocol

### Phase 1: Architecture Diagnosis

**Step 1: Identify Rendering Approach**
- Check if animation loops call React components vs. direct canvas functions
- Verify that drawing functions perform canvas operations, not return JSX
- Look for mixing of React virtual DOM with canvas contexts

**Step 2: Trace Data Flow**
- Component hierarchy: Container → Canvas → Drawing Functions
- State management: Store → Component → Canvas Operations
- Event handling: User Input → Coordinate Transform → Canvas Update

**Step 3: Verify Animation Loop Structure**
```typescript
// ✅ Correct Animation Loop Pattern
useEffect(() => {
  let animationId: number;
  const animate = () => {
    renderCurrentView(); // Must be direct canvas operations
    animationId = requestAnimationFrame(animate);
  };
  animate();
  return () => {
    if (animationId) cancelAnimationFrame(animationId);
  };
}, [dependencies]);
```

### Phase 2: Visual Enhancement Diagnosis

**Visibility Issues Checklist:**
- [ ] Background color provides sufficient contrast (`#0a0a1a` for space themes)
- [ ] Primary elements use high alpha values (0.8-1.0)
- [ ] Secondary elements use medium alpha values (0.4-0.6)
- [ ] Color choices provide contrast against background
- [ ] Animation timing is smooth (`Date.now() * 0.0001`)

**Brightness Enhancement Pattern:**
```typescript
// ✅ High-Visibility Element Rendering
ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'; // Bright stars
ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)'; // Bright galaxy arms
ctx.lineWidth = 3; // Thick lines for visibility

// Luminous gradient cores
const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 20);
gradient.addColorStop(0, 'rgba(255, 255, 150, 1.0)');
gradient.addColorStop(1, 'rgba(255, 150, 50, 0.2)');
```

### Phase 3: Interaction Debugging

**Click Detection Issues:**
- Verify click coordinates use same layout parameters as drawing functions
- Check coordinate transformation: Screen → Canvas → Grid → Entity ID
- Ensure boundary checking distinguishes entity clicks from padding areas

**Precise Click Detection Pattern:**
```typescript
// ✅ Accurate Click Detection
const handleCanvasClick = (e: React.MouseEvent) => {
  // Use EXACT same parameters as drawing function
  const entitySize = 80;
  const padding = 20;
  const cols = 8;
  
  const rect = canvasRef.current?.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  
  // Calculate grid position
  const startX = (canvasSize.width - totalWidth) / 2;
  const relativeX = x - startX;
  const col = Math.floor(relativeX / (entitySize + padding));
  
  // Verify click is within entity bounds, not padding
  const entityLocalX = relativeX % (entitySize + padding);
  if (entityLocalX < entitySize) {
    const entityId = row * cols + col;
    // Process click
  }
};
```

### Phase 4: Performance Optimization

**60fps Animation Checklist:**
- [ ] Use requestAnimationFrame for animation loops
- [ ] Implement proper cleanup to prevent memory leaks
- [ ] Cache expensive calculations (coordinate transformations)
- [ ] Use selective redraws when possible
- [ ] Monitor frame rates and adjust complexity accordingly

**Performance Monitoring Pattern:**
```typescript
class PerformanceMonitor {
  private frameCount = 0;
  private lastTime = 0;
  private fps = 0;
  
  update(currentTime: number) {
    this.frameCount++;
    if (currentTime - this.lastTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastTime = currentTime;
      
      if (this.fps < 30) {
        this.reduceVisualComplexity();
      }
    }
  }
}
```

## Fullscreen Implementation Debugging

### Container Sizing Issues

**Common Problems:**
- Excessive padding reducing usable canvas area
- Rounded corners preventing full screen utilization
- Incorrect z-index management for overlay controls

**✅ Optimal Fullscreen Pattern:**
```typescript
// Modal container
<div className="fixed inset-0 z-50 bg-gray-900">
  <div className="absolute top-4 right-4 z-60">
    <button onClick={closeFullscreen}>✕ Close</button>
  </div>
  <CanvasComponent />
</div>

// Canvas container
<div className="relative w-full h-full bg-gray-900 overflow-hidden">
  <canvas
    width={canvasSize.width}
    height={canvasSize.height}
    // ... event handlers
  />
</div>

// Resize handling
const handleResize = useCallback(() => {
  if (containerRef.current) {
    const rect = containerRef.current.getBoundingClientRect();
    setCanvasSize({
      width: Math.max(800, rect.width - 16), // Minimal padding
      height: Math.max(600, rect.height - 80) // Account for controls
    });
  }
}, []);
```

## State Management Integration

### Zustand Store Pattern for Visualizations

```typescript
interface VisualizationState {
  // Viewport state
  zoomLevel: ZoomLevel;
  viewport: { centerX: number; centerY: number; zoom: number };
  
  // UI state
  showGrid: boolean;
  showTerritories: boolean;
  
  // Navigation
  selectedCoordinate: CoordinateComponents | null;
  
  // Actions
  navigateToCoordinate: (coord: CoordinateComponents) => void;
  setViewport: (viewport: ViewportState) => void;
}

// Persistence for user preferences only
const useVisualizationStore = create<VisualizationState>()(
  persist(
    (set, get) => ({
      // ... implementation
    }),
    {
      name: 'visualization-storage',
      partialize: (state) => ({
        showGrid: state.showGrid,
        showTerritories: state.showTerritories,
        // Don't persist viewport or navigation state
      })
    }
  )
);
```

## Error Prevention Checklist

### Before Implementation
- [ ] Plan component hierarchy: Container → Canvas → Drawing Functions
- [ ] Design coordinate system and transformation logic
- [ ] Define state management approach (Zustand recommended)
- [ ] Choose appropriate visual enhancement strategy

### During Development
- [ ] Test each drawing function individually
- [ ] Verify click detection matches drawing layout exactly
- [ ] Monitor performance during development
- [ ] Test fullscreen behavior on target screen sizes

### Before Deployment
- [ ] Verify 60fps performance under load
- [ ] Test all interaction patterns (click, drag, zoom)
- [ ] Validate state persistence and restoration
- [ ] Confirm visual elements are clearly visible

## Success Metrics

A successful canvas visualization implementation should achieve:
- ✅ Smooth 60fps animations without frame drops
- ✅ Responsive interactions with accurate hit detection
- ✅ Clear visual elements with proper contrast and brightness
- ✅ Efficient memory usage with proper cleanup
- ✅ Scalable architecture supporting feature expansion
- ✅ Seamless integration with existing UI systems

## Common Pitfalls to Avoid

1. **Architecture Mixing**: Never mix React components with canvas drawing operations
2. **Coordinate Mismatches**: Always use identical parameters for drawing and interaction
3. **Performance Neglect**: Monitor frame rates and optimize for smooth animations
4. **Visual Invisibility**: Ensure sufficient contrast and brightness for dark themes
5. **Memory Leaks**: Implement proper cleanup for animation loops and event listeners
6. **State Complexity**: Keep visualization state separate from application state
7. **Fullscreen Issues**: Use minimal padding and proper z-index management

This debugging methodology ensures systematic resolution of canvas visualization issues and prevents common architectural mistakes that lead to broken or invisible interfaces.
