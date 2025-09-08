---
description: Guidelines for implementing interactive canvas-based visualization systems with multi-level zoom, real-time animations, and complex user interactions
author: Cline Self-Improvement Protocol
version: 1.0
tags: ["canvas", "visualization", "animation", "interactive-graphics", "zoom-interface", "performance"]
globs: ["**/*.tsx", "**/*.ts", "src/components/**/map/**/*", "src/stores/**/*"]
---

> Deprecated — Do not modify. This guidance has been consolidated into interactive-canvas-architecture.md (canonical). Keep for historical context only.

# Interactive Canvas-Based Visualization Systems

## Overview

This rule provides comprehensive guidelines for implementing complex interactive canvas-based visualization systems, particularly for hierarchical data structures like universe maps, organizational charts, or network diagrams. Based on successful implementation of a multi-level universe map with real-time animations and smooth user interactions.

## Canvas Animation Architecture

### Core Animation Loop Pattern

**RequestAnimationFrame Implementation:**
```typescript
class CanvasAnimationManager {
  private animationId: number | null = null;
  private isAnimating: boolean = false;

  startAnimation = () => {
    if (this.isAnimating) return;
    this.isAnimating = true;
    this.animate();
  };

  private animate = () => {
    if (!this.isAnimating) return;
    
    // Clear and render
    this.clearCanvas();
    this.renderLayers();
    
    // Continue animation loop
    this.animationId = requestAnimationFrame(this.animate);
  };

  stopAnimation = () => {
    this.isAnimating = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  };
}
```

**Key Principles:**
- Use requestAnimationFrame for smooth 60fps animations
- Implement proper cleanup to prevent memory leaks
- Maintain animation state to avoid multiple concurrent loops
- Layer rendering for optimal performance: background → content → UI overlays

### Performance Optimization Strategies

**Selective Redraw Pattern:**
```typescript
interface RenderState {
  needsRedraw: boolean;
  changedRegions: Set<string>;
  lastFrameTime: number;
}

const optimizedRender = (state: RenderState) => {
  if (!state.needsRedraw) return;
  
  // Only redraw changed regions
  state.changedRegions.forEach(region => {
    renderRegion(region);
  });
  
  state.needsRedraw = false;
  state.changedRegions.clear();
};
```

**Caching Strategy:**
- Cache expensive coordinate transformations
- Pre-calculate hit detection areas
- Store rendered elements for reuse
- Use off-screen canvases for complex static elements

## Multi-Level Zoom Interface Design

### Hierarchical Navigation Pattern

**Zoom Level Architecture:**
```typescript
enum ZoomLevel {
  UNIVERSE = 0,  // 40 galaxies overview
  GALAXY = 1,    // 100 regions grid
  REGION = 2,    // Star systems view
  SYSTEM = 3     // Planetary detail
}

interface ViewportState {
  zoomLevel: ZoomLevel;
  position: { x: number; y: number };
  scale: number;
  targetCoordinate?: string;
}
```

**Coordinate System Integration:**
- Implement hierarchical coordinate parsing (A00:10:22:10 format)
- Maintain viewport state across zoom transitions
- Use proper scaling and translation transformations
- Preserve context when navigating between levels

### Smooth Zoom Transitions

**Transition Management:**
```typescript
const handleZoomTransition = (
  fromLevel: ZoomLevel,
  toLevel: ZoomLevel,
  targetCoordinate: string
) => {
  // Parse target coordinate
  const coords = parseCoordinate(targetCoordinate);
  
  // Calculate new viewport
  const newViewport = calculateViewportForLevel(toLevel, coords);
  
  // Animate transition
  animateViewportTransition(currentViewport, newViewport);
  
  // Update zoom level and data
  setZoomLevel(toLevel);
  loadDataForLevel(toLevel, coords);
};
```

## Interactive Canvas Event Handling

### Mouse Interaction System

**Event Handling Pattern:**
```typescript
const handleCanvasInteraction = (event: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;
  
  // Transform to canvas coordinates
  const canvasCoords = screenToCanvas(screenX, screenY, viewport);
  
  // Transform to game coordinates
  const gameCoords = canvasToGame(canvasCoords, zoomLevel);
  
  // Handle interaction based on event type
  switch (event.type) {
    case 'click':
      handleClick(gameCoords);
      break;
    case 'contextmenu':
      handleRightClick(gameCoords);
      break;
    case 'mousemove':
      handleHover(gameCoords);
      break;
  }
};
```

**Coordinate Transformation:**
```typescript
const screenToCanvas = (
  screenX: number,
  screenY: number,
  viewport: ViewportState
) => ({
  x: (screenX - viewport.position.x) / viewport.scale,
  y: (screenY - viewport.position.y) / viewport.scale
});

const canvasToGame = (
  canvasCoords: Point,
  zoomLevel: ZoomLevel
) => {
  // Convert canvas coordinates to game-specific coordinates
  // based on current zoom level and data structure
};
```

### Drag and Pan Implementation

**Pan Handling:**
```typescript
let isDragging = false;
let lastMousePos = { x: 0, y: 0 };

const handleMouseDown = (event: MouseEvent) => {
  isDragging = true;
  lastMousePos = { x: event.clientX, y: event.clientY };
};

const handleMouseMove = (event: MouseEvent) => {
  if (!isDragging) return;
  
  const deltaX = event.clientX - lastMousePos.x;
  const deltaY = event.clientY - lastMousePos.y;
  
  updateViewport({
    position: {
      x: viewport.position.x + deltaX,
      y: viewport.position.y + deltaY
    }
  });
  
  lastMousePos = { x: event.clientX, y: event.clientY };
};
```

## State Management for Visualizations

### Zustand Store Architecture

**Visualization Store Pattern:**
```typescript
interface UniverseMapState {
  // Viewport state
  zoomLevel: ZoomLevel;
  viewport: ViewportState;
  
  // UI state
  showGrid: boolean;
  showTerritories: boolean;
  showResources: boolean;
  
  // Data cache
  galaxyData: Map<string, GalaxyData>;
  systemData: Map<string, SystemData>;
  
  // Search and navigation
  searchQuery: string;
  selectedCoordinate: string | null;
  
  // Actions
  setZoomLevel: (level: ZoomLevel) => void;
  updateViewport: (viewport: Partial<ViewportState>) => void;
  toggleUIElement: (element: string) => void;
  navigateToCoordinate: (coordinate: string) => void;
}

const useUniverseMapStore = create<UniverseMapState>()(
  persist(
    (set, get) => ({
      // Initial state
      zoomLevel: ZoomLevel.UNIVERSE,
      viewport: { position: { x: 0, y: 0 }, scale: 1 },
      showGrid: true,
      showTerritories: true,
      showResources: false,
      
      // Cached data
      galaxyData: new Map(),
      systemData: new Map(),
      
      // Actions
      setZoomLevel: (level) => set({ zoomLevel: level }),
      updateViewport: (newViewport) => set(state => ({
        viewport: { ...state.viewport, ...newViewport }
      })),
      
      // Navigation
      navigateToCoordinate: (coordinate) => {
        const coords = parseCoordinate(coordinate);
        const targetLevel = determineZoomLevel(coordinate);
        const newViewport = calculateViewportForCoordinate(coords);
        
        set({
          selectedCoordinate: coordinate,
          zoomLevel: targetLevel,
          viewport: newViewport
        });
      }
    }),
    {
      name: 'universe-map-storage',
      partialize: (state) => ({
        zoomLevel: state.zoomLevel,
        viewport: state.viewport,
        showGrid: state.showGrid,
        showTerritories: state.showTerritories,
        showResources: state.showResources
      })
    }
  )
);
```

### Data Caching Strategy

**Efficient Data Management:**
```typescript
const loadDataForLevel = async (level: ZoomLevel, coordinate: string) => {
  const cacheKey = `${level}-${coordinate}`;
  
  // Check cache first
  if (dataCache.has(cacheKey)) {
    return dataCache.get(cacheKey);
  }
  
  // Load data based on zoom level
  let data;
  switch (level) {
    case ZoomLevel.GALAXY:
      data = await fetchGalaxyData(coordinate);
      break;
    case ZoomLevel.REGION:
      data = await fetchRegionData(coordinate);
      break;
    case ZoomLevel.SYSTEM:
      data = await fetchSystemData(coordinate);
      break;
  }
  
  // Cache the data
  dataCache.set(cacheKey, data);
  return data;
};
```

## Visual Effects Implementation

### Animated Elements

**Twinkling Stars Effect:**
```typescript
interface Star {
  x: number;
  y: number;
  brightness: number;
  twinkleSpeed: number;
  phase: number;
}

const renderTwinklingStars = (stars: Star[], time: number) => {
  stars.forEach(star => {
    const twinkle = Math.sin(time * star.twinkleSpeed + star.phase) * 0.3 + 0.7;
    const alpha = star.brightness * twinkle;
    
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(star.x, star.y, 1, 1);
  });
};
```

**Planetary Orbit Animation:**
```typescript
interface Planet {
  orbitRadius: number;
  orbitSpeed: number;
  angle: number;
  type: 'rocky' | 'gas';
  size: number;
}

const renderPlanetaryOrbits = (planets: Planet[], time: number, centerX: number, centerY: number) => {
  planets.forEach(planet => {
    // Update orbital position
    planet.angle += planet.orbitSpeed * time;
    
    const x = centerX + Math.cos(planet.angle) * planet.orbitRadius;
    const y = centerY + Math.sin(planet.angle) * planet.orbitRadius;
    
    // Render orbit path
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
    ctx.beginPath();
    ctx.arc(centerX, centerY, planet.orbitRadius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Render planet
    ctx.fillStyle = planet.type === 'rocky' ? '#8B4513' : '#4169E1';
    ctx.beginPath();
    ctx.arc(x, y, planet.size, 0, Math.PI * 2);
    ctx.fill();
  });
};
```

### Territory Visualization

**Empire Territory Rendering:**
```typescript
const renderTerritories = (territories: Territory[], zoomLevel: ZoomLevel) => {
  territories.forEach(territory => {
    const coords = parseCoordinate(territory.coordinate);
    const position = gameToCanvasCoords(coords, zoomLevel);
    
    // Territory color based on empire
    const color = getEmpireColor(territory.empireId);
    
    // Render territory indicator
    ctx.fillStyle = `${color}40`; // Semi-transparent
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    // Different shapes based on zoom level
    switch (zoomLevel) {
      case ZoomLevel.GALAXY:
        renderRegionTerritory(position, color);
        break;
      case ZoomLevel.REGION:
        renderSystemTerritory(position, color);
        break;
      case ZoomLevel.SYSTEM:
        renderPlanetTerritory(position, color);
        break;
    }
  });
};
```

## Component Architecture for Complex Visualizations

### Modular Component Design

**Component Hierarchy:**
```
UniverseMap (main container)
├── MapControls (search, toggles, navigation)
├── Canvas Rendering Components:
│   ├── UniverseOverview (galaxy grid)
│   ├── GalaxyView (region grid)
│   ├── RegionView (star systems)
│   └── SystemView (planetary detail)
├── MapLegend (context-aware help)
└── LocationTooltip (hover information)
```

**Main Container Pattern:**
```typescript
const UniverseMap: React.FC<UniverseMapProps> = ({ empire, onUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  const {
    zoomLevel,
    viewport,
    showGrid,
    showTerritories,
    navigateToCoordinate
  } = useUniverseMapStore();
  
  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (canvasRef.current) {
        renderCurrentView(canvasRef.current, zoomLevel, viewport);
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [zoomLevel, viewport]);
  
  return (
    <div className="relative w-full h-full">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onContextMenu={handleRightClick}
      />
      
      <MapControls />
      <MapLegend zoomLevel={zoomLevel} />
      <LocationTooltip />
    </div>
  );
};
```

### Context-Aware Components

**Adaptive Legend Component:**
```typescript
const MapLegend: React.FC<{ zoomLevel: ZoomLevel }> = ({ zoomLevel }) => {
  const getLegendContent = () => {
    switch (zoomLevel) {
      case ZoomLevel.UNIVERSE:
        return {
          title: "Universe Overview",
          items: [
            { color: "#FFD700", label: "Galaxy Core" },
            { color: "#4169E1", label: "Spiral Arms" },
            { color: "#FF6B6B", label: "Your Territory" }
          ],
          controls: [
            "Left Click: Zoom into galaxy",
            "Right Click: Return to universe view",
            "Drag: Pan around universe"
          ]
        };
      case ZoomLevel.GALAXY:
        return {
          title: "Galaxy View",
          items: [
            { color: "#FFFF00", label: "Star Systems" },
            { color: "#FF6B6B", label: "Controlled Regions" },
            { color: "#808080", label: "Empty Space" }
          ],
          controls: [
            "Left Click: Zoom into region",
            "Right Click: Return to universe",
            "Drag: Pan around galaxy"
          ]
        };
      // ... other zoom levels
    }
  };
  
  const content = getLegendContent();
  
  return (
    <div className="absolute top-4 right-4 bg-gray-800 p-4 rounded-lg">
      <h3 className="text-white font-bold mb-2">{content.title}</h3>
      {/* Render legend items and controls */}
    </div>
  );
};
```

## Integration with Existing UI Systems

### Modal System Integration

**Extending Existing Modals:**
```typescript
// Add to existing modal types
type ModalType = 'building' | 'research' | 'galaxy' | 'fleet';

// Integrate as default tab in Galaxy Modal
const GalaxyModal: React.FC<GalaxyModalProps> = ({ empire, onUpdate }) => {
  const [activeTab, setActiveTab] = useState<'map' | 'territories' | 'explore'>('map');
  
  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-700 p-1 rounded-lg">
        <button
          onClick={() => setActiveTab('map')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            activeTab === 'map' ? 'bg-blue-600 text-white' : 'text-gray-300 hover:text-white'
          }`}
        >
          🗺️ Universe Map
        </button>
        {/* Other tabs */}
      </div>
      
      {/* Tab Content */}
      {activeTab === 'map' && (
        <div className="h-96">
          <UniverseMap empire={empire} onUpdate={onUpdate} />
        </div>
      )}
      {/* Other tab content */}
    </div>
  );
};
```

### Consistent Styling Integration

**Game UI Theme Consistency:**
- Use existing Tailwind CSS classes and color schemes
- Maintain dark theme optimization for gaming experience
- Follow established button and control patterns
- Integrate with existing loading and error state components

## Multi-Component Creation Strategy

### Systematic Development Approach

**Component Creation Order:**
1. **Utility Functions**: Coordinate parsing, validation, transformation utilities
2. **Store Implementation**: Zustand store with state management and persistence
3. **View Components**: Individual zoom level rendering components (UniverseOverview, GalaxyView, etc.)
4. **Control Components**: MapControls, MapLegend, LocationTooltip
5. **Main Container**: UniverseMap component that orchestrates everything
6. **Integration**: Add to existing modal or routing system

**Dependency Management:**
```typescript
// 1. Create utilities first
export const parseCoordinate = (coord: string) => { /* ... */ };
export const validateCoordinate = (coord: string) => { /* ... */ };

// 2. Create store
export const useUniverseMapStore = create(/* ... */);

// 3. Create view components
export const UniverseOverview: React.FC = () => { /* ... */ };
export const GalaxyView: React.FC = () => { /* ... */ };

// 4. Create main component (imports all dependencies)
export const UniverseMap: React.FC = () => { /* ... */ };
```

**TypeScript Interface Strategy:**
- Define shared interfaces in separate files
- Use proper prop typing for all components
- Implement strict type checking for coordinate systems
- Create utility types for common patterns

## Performance Optimization for Real-Time Graphics

### Efficient Canvas Operations

**Canvas Context Management:**
```typescript
const optimizeCanvasRendering = (ctx: CanvasRenderingContext2D) => {
  // Use appropriate composite operations
  ctx.globalCompositeOperation = 'source-over';
  
  // Batch similar operations
  ctx.save();
  
  // Set common styles once
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#000000';
  
  // Render multiple similar elements
  renderBatchedElements();
  
  ctx.restore();
};
```

**Frame Rate Monitoring:**
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
      
      // Adjust quality based on performance
      if (this.fps < 30) {
        this.reduceVisualComplexity();
      }
    }
  }
  
  private reduceVisualComplexity() {
    // Reduce particle count, simplify animations, etc.
  }
}
```

### Memory Management

**Resource Cleanup:**
```typescript
useEffect(() => {
  // Setup canvas and animation
  const canvas = canvasRef.current;
  const ctx = canvas?.getContext('2d');
  
  return () => {
    // Cleanup animation frames
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    
    // Clear canvas context
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    
    // Clear cached data
    clearDataCache();
  };
}, []);
```

## Success Metrics

A successful interactive canvas visualization implementation should achieve:
- ✅ Smooth 60fps animations across all zoom levels
- ✅ Responsive mouse interactions with proper coordinate transformations
- ✅ Efficient memory usage with proper cleanup and caching
- ✅ Scalable architecture supporting additional zoom levels and features
- ✅ Seamless integration with existing UI systems and patterns
- ✅ Consistent visual design matching game theme and styling
- ✅ Proper state persistence across sessions and navigation
- ✅ Comprehensive error handling and loading states

## Common Pitfalls to Avoid

1. **Animation Memory Leaks**: Always cleanup requestAnimationFrame and event listeners
2. **Coordinate System Confusion**: Maintain clear separation between screen, canvas, and game coordinates
3. **Performance Degradation**: Monitor frame rates and implement adaptive quality controls
4. **State Synchronization Issues**: Keep visualization state in sync with game state
5. **Import Dependency Errors**: Create all dependent components before main container
6. **Canvas Context Loss**: Handle context loss and restoration properly
7. **Event Handler Conflicts**: Prevent event bubbling and handle multiple interaction types
8. **Zoom Level Data Mismatches**: Ensure data structures match expected zoom level requirements

This rule ensures interactive canvas visualizations are implemented with proper performance, maintainability, and integration with existing systems.
