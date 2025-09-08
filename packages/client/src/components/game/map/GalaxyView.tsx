import * as React from 'react';
import { Empire, CoordinateComponents, pickStarKindFromCoord } from '@game/shared';
import { MapViewport } from '../../../stores/universeMapStore';
import { GALAXY_LAYOUT, calculateFittedGridLayout, getClickedIndex } from './mapConstants';
import universeService, { UniverseRegionSystemsData } from '../../../services/universeService';
import { buildCachedLayer, createOffscreenLayer, drawToLayer, composeLayers, clearLayerCache, LayerCache } from './helpers/offscreenLayers';
import { computeStarsHash, computeEmpireTerritoryHash } from './helpers/hashing';

interface GalaxyViewProps {
  canvas: HTMLCanvasElement;
  viewport: MapViewport;
  selectedCoordinate: CoordinateComponents | null;
  empire: Empire;
  showGrid: boolean;
  showTerritories: boolean;
}

// Dev-only performance monitor (logs FPS and warns on sustained low FPS)
// Enabled when localStorage.getItem('enableFpsMonitor') === '1'
class PerformanceMonitor {
  private frames = 0;
  private last = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  private fps = 0;
  private belowThresholdCount = 0;

  constructor(
    private enabled: boolean,
    private threshold = 30,
    private warnStreakSeconds = 3
  ) {}

  update(now: number): number {
    this.frames++;
    if (now - this.last >= 1000) {
      this.fps = this.frames;
      this.frames = 0;
      this.last = now;

      if (this.enabled) {
        // Log current fps
        if (typeof console !== 'undefined' && typeof console.debug === 'function') {
          console.debug(`[GalaxyView] ${this.fps} fps`);
        }

        // Track sustained low FPS and warn
        if (this.fps < this.threshold) {
          this.belowThresholdCount++;
          if (this.belowThresholdCount >= this.warnStreakSeconds) {
            if (typeof console !== 'undefined' && typeof console.warn === 'function') {
              console.warn(
                `[GalaxyView] Sustained low FPS (${this.fps} < ${this.threshold}) for ${this.warnStreakSeconds}s`
              );
            }
            this.belowThresholdCount = 0; // reset to avoid spamming
          }
        } else {
          this.belowThresholdCount = 0;
        }
      }
    }
    return this.fps;
  }
}

const GalaxyView: React.FC<GalaxyViewProps> = ({
  canvas,
  selectedCoordinate,
  empire,
  showGrid,
  showTerritories
}) => {
  // Per-region star data fetched from server: systems with star color/class
  const [regionStarsByRegion, setRegionStarsByRegion] = React.useState<Record<number, UniverseRegionSystemsData['systems']>>({});

  // Animation + FPS monitoring (guarded)
  const animationRef = React.useRef<number | null>(null);
  const enableFpsMonitor =
    (typeof window !== 'undefined') &&
    !!window.localStorage &&
    window.localStorage.getItem('enableFpsMonitor') === '1';
  const perfMonitorRef = React.useRef<PerformanceMonitor | null>(null);

  // Cached fitted layout and offscreen grid layer
  const layoutRef = React.useRef<ReturnType<typeof calculateFittedGridLayout> | null>(null);
  const regionCanvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const layerCacheRef = React.useRef<LayerCache>(new Map());
  const lowDetailRef = React.useRef<boolean>(false);

  // Fetch all region star data for the selected galaxy
  React.useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!selectedCoordinate) return;
      const server = selectedCoordinate.server;
      const galaxy = selectedCoordinate.galaxy;

      // Fetch all 100 regions in parallel (can be optimized with batching if needed)
      const promises = Array.from({ length: 100 }, async (_, region) => {
        try {
          const res = await universeService.getRegionSystems(server, galaxy, region);
          if ((res as any)?.success && (res as any)?.data) {
            return { region, systems: (res as any).data.systems as UniverseRegionSystemsData['systems'] };
          }
        } catch {
          // ignore failures; leave region empty
        }
        return { region, systems: [] as UniverseRegionSystemsData['systems'] };
      });

      const results = await Promise.all(promises);
      if (cancelled) return;

      const byRegion: Record<number, UniverseRegionSystemsData['systems']> = {};
      results.forEach(({ region, systems }) => {
        byRegion[region] = systems || [];
      });
      setRegionStarsByRegion(byRegion);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [selectedCoordinate?.server, selectedCoordinate?.galaxy]);

  React.useEffect(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    // Init performance monitor (dev-guarded via localStorage flag)
    perfMonitorRef.current = new PerformanceMonitor(enableFpsMonitor);

    // Compute fitted layout (once per effect run) and cache it
    const fitted = calculateFittedGridLayout(
      canvas.width,
      canvas.height,
      GALAXY_LAYOUT.regionSize,
      GALAXY_LAYOUT.padding,
      GALAXY_LAYOUT.cols,
      GALAXY_LAYOUT.rows
    );
    layoutRef.current = fitted;


    // Prepare offscreen regions canvas (static unless data/props change)
    if (selectedCoordinate) {
      const regionCanvas = document.createElement('canvas');
      regionCanvas.width = canvas.width;
      regionCanvas.height = canvas.height;
      const rctx = regionCanvas.getContext('2d');
      if (rctx) {
        drawRegionsLayer(
          rctx,
          fitted,
          selectedCoordinate.galaxy,
          showTerritories,
          empire,
          regionStarsByRegion
        );
      }
      regionCanvasRef.current = regionCanvas;
    } else {
      regionCanvasRef.current = null;
    }

    const draw = () => {
      if (!running) return;

      // Clear canvas
      ctx.fillStyle = '#000011';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw star field background (animated via time)
      drawStarField(ctx, canvas.width, canvas.height, lowDetailRef.current);

      // Draw region grid (10x10 layout for 100 regions)
      if (selectedCoordinate) {
        // Ensure fitted layout exists (fallback compute if needed)
        const fittedLayout =
          layoutRef.current ??
          calculateFittedGridLayout(
            canvas.width,
            canvas.height,
            GALAXY_LAYOUT.regionSize,
            GALAXY_LAYOUT.padding,
            GALAXY_LAYOUT.cols,
            GALAXY_LAYOUT.rows
          );
        layoutRef.current = fittedLayout;

        // Build cached grid and regions layers and compose them
        const gridDeps = {
          width: canvas.width,
          height: canvas.height,
          showGrid,
          cols: GALAXY_LAYOUT.cols,
          rows: GALAXY_LAYOUT.rows
        };
        const gridLayer = buildCachedLayer('galaxy:grid', gridDeps, layerCacheRef.current, () => {
          const off = createOffscreenLayer(canvas.width, canvas.height);
          drawToLayer(off, (gctx) => {
            if (showGrid) {
              drawGridLines(gctx, fittedLayout, GALAXY_LAYOUT.cols, GALAXY_LAYOUT.rows);
            }
          });
          return off;
        });

        const regionsDeps = {
          width: canvas.width,
          height: canvas.height,
          galaxyId: selectedCoordinate.galaxy,
          showTerritories,
          empireHash: computeEmpireTerritoryHash(empire),
          starsHash: computeStarsHash(regionStarsByRegion)
        };
        const regionsLayer = buildCachedLayer('galaxy:regions', regionsDeps, layerCacheRef.current, () => {
          const off = createOffscreenLayer(canvas.width, canvas.height);
          drawToLayer(off, (rctx) => {
            drawRegionsLayer(
              rctx,
              fittedLayout,
              selectedCoordinate.galaxy,
              showTerritories,
              empire,
              regionStarsByRegion
            );
          });
          return off;
        });

        composeLayers(ctx, [gridLayer, regionsLayer]);
      }

      // FPS tracking (dev-guarded logging/overlay)
      {
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        const fps = perfMonitorRef.current ? perfMonitorRef.current.update(now) : 0;

        // Adaptive complexity: degrade details when FPS drops
        if (fps > 0) {
          lowDetailRef.current = fps < 30;
        }

        // Optional on-canvas overlay when dev flag is enabled
        if (enableFpsMonitor) {
          ctx.fillStyle = 'rgba(0,255,0,0.85)';
          ctx.font = '10px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`${fps} fps`, 8, 16);
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    // Start RAF loop
    draw();

    // Cleanup on deps change/unmount
    return () => {
      running = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [canvas, selectedCoordinate, showGrid, showTerritories, empire, regionStarsByRegion, enableFpsMonitor]);

  // Rebuild regions offscreen layer when data/props change
  React.useEffect(() => {
    const fitted = layoutRef.current;
    if (!fitted || !selectedCoordinate) return;

    const regionCanvas = document.createElement('canvas');
    // We cannot access the canvas element here safely for width/height if not in scope; default to fitted totals + margins via current canvas
    // Prefer to mirror main canvas size if available
    const width = (typeof window !== 'undefined' ? (canvas?.width ?? Math.ceil(fitted.totalWidth + fitted.startX * 2)) : Math.ceil(fitted.totalWidth + fitted.startX * 2));
    const height = (typeof window !== 'undefined' ? (canvas?.height ?? Math.ceil(fitted.totalHeight + fitted.startY * 2)) : Math.ceil(fitted.totalHeight + fitted.startY * 2));
    regionCanvas.width = width;
    regionCanvas.height = height;

    const rctx = regionCanvas.getContext('2d');
    if (rctx) {
      drawRegionsLayer(
        rctx,
        fitted,
        selectedCoordinate.galaxy,
        showTerritories,
        empire,
        regionStarsByRegion
      );
    }
    regionCanvasRef.current = regionCanvas;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCoordinate?.galaxy, showTerritories, empire, regionStarsByRegion]);

  // Cache hygiene: clear cached galaxy layers on dimension/flag changes
  React.useEffect(() => {
    clearLayerCache(layerCacheRef.current, (k) =>
      k.startsWith('galaxy:grid') || k.startsWith('galaxy:regions')
    );
  }, [canvas.width, canvas.height, showGrid, showTerritories]);

  return null; // This component only renders to canvas
};


const drawStarField = (ctx: CanvasRenderingContext2D, width: number, height: number, lowDetail: boolean) => {
  const time = Date.now() * 0.0001;
  const centerX = width / 2;
  const centerY = height / 2;
  
  // Draw spiral galaxy background
  drawSpiralGalaxy(ctx, centerX, centerY, width, height, time, lowDetail);
  
  // Draw distant background stars
  const starCount = lowDetail ? 150 : 300;
  for (let i = 0; i < starCount; i++) {
    const x = (i * 41) % width;
    const y = (i * 67) % height;
    const brightness = 0.2 + 0.5 * Math.sin(time + i * 0.15);
    const size = 0.3 + 0.3 * Math.sin(time * 1.5 + i * 0.08);
    
    ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.4})`;
    ctx.fillRect(x, y, size, size);
  }
};

const drawSpiralGalaxy = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  time: number,
  lowDetail: boolean
) => {
  const maxRadius = Math.min(width, height) * 0.4;
  
  // Draw galactic core
  const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, maxRadius * 0.2);
  coreGradient.addColorStop(0, 'rgba(255, 255, 150, 0.8)');
  coreGradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.6)');
  coreGradient.addColorStop(0.7, 'rgba(255, 150, 50, 0.3)');
  coreGradient.addColorStop(1, 'rgba(255, 100, 0, 0.1)');
  
  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, maxRadius * 0.2, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw spiral arms
  for (let arm = 0; arm < 4; arm++) {
    drawSpiralArm(ctx, centerX, centerY, maxRadius, arm * Math.PI / 2, time);
  }
  
  // Draw star clusters along spiral arms
  const clusterCount = lowDetail ? 25 : 50;
  for (let cluster = 0; cluster < clusterCount; cluster++) {
    const angle = (cluster * 0.3 + time * 0.5) % (Math.PI * 2);
    const radius = (cluster * 8) % maxRadius;
    const spiralOffset = radius * 0.02; // Spiral effect
    
    const x = centerX + Math.cos(angle + spiralOffset) * radius;
    const y = centerY + Math.sin(angle + spiralOffset) * radius;
    
    if (x > 0 && x < width && y > 0 && y < height) {
      drawStarCluster(ctx, x, y, 3 + Math.random() * 4, time + cluster);
    }
  }
};

const drawSpiralArm = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  maxRadius: number,
  startAngle: number,
  time: number
) => {
  ctx.strokeStyle = 'rgba(100, 150, 255, 0.3)';
  ctx.lineWidth = 8;
  ctx.beginPath();
  
  for (let r = maxRadius * 0.2; r < maxRadius; r += 2) {
    const spiralTightness = 0.02;
    const angle = startAngle + r * spiralTightness + time * 0.1;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;
    
    if (r === maxRadius * 0.2) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }
  
  ctx.stroke();
  
  // Add nebula clouds along the arm
  for (let i = 0; i < 10; i++) {
    const r = maxRadius * 0.3 + (i * maxRadius * 0.07);
    const spiralTightness = 0.02;
    const angle = startAngle + r * spiralTightness + time * 0.1;
    const x = centerX + Math.cos(angle) * r;
    const y = centerY + Math.sin(angle) * r;
    
    const nebulaGradient = ctx.createRadialGradient(x, y, 0, x, y, 20);
    nebulaGradient.addColorStop(0, 'rgba(255, 100, 150, 0.4)');
    nebulaGradient.addColorStop(0.5, 'rgba(100, 150, 255, 0.2)');
    nebulaGradient.addColorStop(1, 'rgba(100, 150, 255, 0)');
    
    ctx.fillStyle = nebulaGradient;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
  }
};

const drawStarCluster = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  timeOffset: number
) => {
  const brightness = 0.6 + 0.4 * Math.sin(timeOffset * 0.5);
  
  // Main cluster glow
  const clusterGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
  clusterGradient.addColorStop(0, `rgba(255, 255, 200, ${brightness * 0.8})`);
  clusterGradient.addColorStop(0.5, `rgba(255, 200, 150, ${brightness * 0.4})`);
  clusterGradient.addColorStop(1, 'rgba(255, 200, 150, 0)');
  
  ctx.fillStyle = clusterGradient;
  ctx.beginPath();
  ctx.arc(x, y, size * 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Bright core
  ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
  ctx.beginPath();
  ctx.arc(x, y, size * 0.5, 0, Math.PI * 2);
  ctx.fill();
};

/**
 * Draw only the grid lines using a fitted layout (used for off-screen caching).
 */
const drawGridLines = (
  ctx: CanvasRenderingContext2D,
  fitted: ReturnType<typeof calculateFittedGridLayout>,
  cols: number,
  rows: number
) => {
  const { startX, startY, itemSize, padding, totalWidth, totalHeight } = fitted;

  ctx.strokeStyle = 'rgba(100, 100, 100, 0.4)';
  ctx.lineWidth = 1;

  // Vertical lines
  for (let col = 0; col <= cols; col++) {
    const x = startX + col * (itemSize + padding);
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, startY + totalHeight);
    ctx.stroke();
  }

  // Horizontal lines
  for (let row = 0; row <= rows; row++) {
    const y = startY + row * (itemSize + padding);
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(startX + totalWidth, y);
    ctx.stroke();
  }
};

/**
 * Draw dynamic regions + labels (no grid). Suitable for offscreen caching.
 */
const drawRegionsLayer = (
  ctx: CanvasRenderingContext2D,
  fitted: ReturnType<typeof calculateFittedGridLayout>,
  galaxyId: number,
  showTerritories: boolean,
  empire: Empire,
  regionStarsByRegion: Record<number, UniverseRegionSystemsData['systems']>
) => {
  const { startX, startY, itemSize, padding } = fitted;
  const { cols } = GALAXY_LAYOUT;

  // Clear before drawing
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Draw regions
  for (let regionId = 0; regionId < 100; regionId++) {
    const row = Math.floor(regionId / cols);
    const col = regionId % cols;

    const x = startX + col * (itemSize + padding);
    const y = startY + row * (itemSize + padding);

    drawRegion(
      ctx,
      x,
      y,
      itemSize,
      galaxyId,
      regionId,
      empire,
      showTerritories,
      regionStarsByRegion[regionId]
    );
  }

  // Draw galaxy title
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'bold 24px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`Galaxy ${galaxyId}`, ctx.canvas.width / 2, 40);

  // Draw region labels
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';

  for (let regionId = 0; regionId < 100; regionId++) {
    const row = Math.floor(regionId / cols);
    const col = regionId % cols;

    const x = startX + col * (itemSize + padding) + itemSize / 2;
    const y = startY + row * (itemSize + padding) + itemSize + 12;

    ctx.fillText(`R${regionId.toString().padStart(2, '0')}`, x, y);
  }
};


const drawRegion = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  galaxyId: number,
  regionId: number,
  empire: Empire,
  showTerritories: boolean,
  systems: UniverseRegionSystemsData['systems'] = []
) => {
  // Draw region background
  ctx.fillStyle = 'rgba(20, 20, 40, 0.3)';
  ctx.fillRect(x, y, size, size);

  // Draw star systems using actual DB data on a 10x10 mini-grid (aligned with RegionView)
  const cols = 10;
  const rows = 10;
  const cellW = size / cols;
  const cellH = size / rows;
  const dotR = Math.max(0.8, Math.min(1.8, Math.min(cellW, cellH) * 0.18));

  systems.forEach((sys) => {
    const col = sys.system % cols;
    const row = Math.floor(sys.system / cols);
    const cx = x + col * cellW + cellW / 2;
    const cy = y + row * cellH + cellH / 2;

    // Resolve star color using server color if available, otherwise deterministic Overhaul StarKind
    const star = (sys as any).star;
    const kindColorMap: Record<string, string> = {
      YELLOW: '#FFF4EA',
      ORANGE: '#FFD2A1',
      WHITE: '#CAD7FF',
      BLUE: '#9BB0FF',
      RED_GIANT: '#FF9E7B',
      SUPER_GIANT: '#FFE29A',
      WHITE_DWARF: '#E6F1FF',
      NEUTRON: '#AFBFFF'
    };
    const sysCoord = (sys as any).coord as string | undefined;
    // Ensure body component present for deterministic star (default to :00)
    const coordForStar = sysCoord && sysCoord.split(':').length === 2 ? `${sysCoord}:00` : sysCoord;
    const starKind = coordForStar ? pickStarKindFromCoord(coordForStar, 101) : undefined;
    const baseHex = star?.color || (starKind ? kindColorMap[starKind] : undefined);
    const color = baseHex ?? '#FFFFFF';

    // Tiny colored dot + faint glow
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, dotR * 3);
    glow.addColorStop(0, hexToRgba(color, 0.55));
    glow.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(cx, cy, dotR * 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(cx, cy, dotR, 0, Math.PI * 2);
    ctx.fill();
  });

  // Show territory indicators if enabled
  if (showTerritories) {
    // Check if this region contains empire territories
    const hasTerritory = empire.territories.some(coord => {
      try {
        const coordGalaxy = parseInt(coord.substring(1, 3), 10);
        const coordRegion = parseInt(coord.substring(4, 6), 10);
        return coordGalaxy === galaxyId && coordRegion === regionId;
      } catch {
        return false;
      }
    });

    if (hasTerritory) {
      // Draw territory indicator
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
      
      // Add empire flag
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(x + size - 8, y + 2, 6, 4);
    }
  }

  // Draw region border
  ctx.strokeStyle = 'rgba(100, 150, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, size, size);

  // Add hover effect (simplified - would need mouse position)
  const isHovered = false; // TODO: Implement hover detection
  if (isHovered) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 1, y - 1, size + 2, size + 2);
  }
};



// Local helper
const hexToRgba = (hex: string, alpha: number) => {
  try {
    const h = hex.replace('#', '');
    const normalized = h.length === 3 ? h.split('').map(ch => ch + ch).join('') : h;
    const bigint = parseInt(normalized, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return `rgba(255, 255, 255, ${alpha})`;
  }
};

// Click handling function for galaxy view
export const handleGalaxyViewClick = (
  clickX: number,
  clickY: number,
  canvasWidth: number,
  canvasHeight: number
): number | null => {
  const { regionSize, padding, cols, rows } = GALAXY_LAYOUT;
  const fitted = calculateFittedGridLayout(canvasWidth, canvasHeight, regionSize, padding, cols, rows);
  
  return getClickedIndex(
    clickX,
    clickY,
    fitted.startX,
    fitted.startY,
    fitted.itemSize,
    fitted.padding,
    cols,
    rows,
    fitted.totalWidth,
    fitted.totalHeight
  );
};

export default GalaxyView;
