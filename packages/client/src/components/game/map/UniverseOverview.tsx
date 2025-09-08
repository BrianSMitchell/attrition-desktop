import * as React from 'react';
import { Empire } from '@game/shared';
import { MapViewport } from '../../../stores/universeMapStore';
import { UNIVERSE_LAYOUT, calculateGridLayout, getClickedIndex } from './mapConstants';
import { buildCachedLayer, createOffscreenLayer, drawToLayer, composeLayers, clearLayerCache, LayerCache } from './helpers/offscreenLayers';
import { computeEmpireTerritoryHash } from './helpers/hashing';

interface UniverseOverviewProps {
  canvas: HTMLCanvasElement;
  viewport: MapViewport;
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
        if (typeof console !== 'undefined' && typeof console.debug === 'function') {
          console.debug(`[UniverseOverview] ${this.fps} fps`);
        }
        if (this.fps < this.threshold) {
          this.belowThresholdCount++;
          if (this.belowThresholdCount >= this.warnStreakSeconds) {
            if (typeof console !== 'undefined' && typeof console.warn === 'function') {
              console.warn(
                `[UniverseOverview] Sustained low FPS (${this.fps} < ${this.threshold}) for ${this.warnStreakSeconds}s`
              );
            }
            this.belowThresholdCount = 0;
          }
        } else {
          this.belowThresholdCount = 0;
        }
      }
    }
    return this.fps;
  }
}

const UniverseOverview: React.FC<UniverseOverviewProps> = ({
  canvas,
  empire,
  showGrid,
  showTerritories
}) => {
  const layoutRef = React.useRef<ReturnType<typeof calculateGridLayout> | null>(null);
  const layerCacheRef = React.useRef<LayerCache>(new Map());
  const animationRef = React.useRef<number | null>(null);
  const enableFpsMonitor =
    (typeof window !== 'undefined') &&
    !!window.localStorage &&
    window.localStorage.getItem('enableFpsMonitor') === '1';
  const perfMonitorRef = React.useRef<PerformanceMonitor | null>(null);

  React.useEffect(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let running = true;

    // Init performance monitor (dev-guarded via localStorage flag)
    perfMonitorRef.current = new PerformanceMonitor(enableFpsMonitor);

    // Compute and cache fitted layout for this run
    const { galaxySize, padding, cols, rows } = UNIVERSE_LAYOUT;
    const fitted = calculateGridLayout(canvas.width, canvas.height, galaxySize, padding, cols, rows);
    layoutRef.current = fitted;

    const draw = () => {
      if (!running) return;

      // Clear and draw animated star field (dynamic, not cached)
      ctx.fillStyle = '#000011';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      drawStarField(ctx, canvas.width, canvas.height);

      // Ensure layout
      const layout =
        layoutRef.current ??
        calculateGridLayout(canvas.width, canvas.height, galaxySize, padding, cols, rows);
      layoutRef.current = layout;

      // Background/grid (static-most)
      const gridDeps = {
        width: canvas.width,
        height: canvas.height,
        showGrid,
        cols,
        rows
      };
      const gridLayer = buildCachedLayer('universe:background', gridDeps, layerCacheRef.current, () => {
        const off = createOffscreenLayer(canvas.width, canvas.height);
        drawToLayer(off, (gctx) => {
          if (showGrid) {
            drawUniverseGridLines(gctx, layout, cols, rows, galaxySize, padding);
          }
        });
        return off;
      });

      // Galaxies + labels (semi-static based on territories)
      const galaxiesDeps = {
        width: canvas.width,
        height: canvas.height,
        showTerritories,
        empireHash: computeEmpireTerritoryHash(empire)
      };
      const galaxiesLayer = buildCachedLayer('universe:galaxies', galaxiesDeps, layerCacheRef.current, () => {
        const off = createOffscreenLayer(canvas.width, canvas.height);
        drawToLayer(off, (gctx) => {
          drawGalaxies(gctx, layout, showTerritories, empire);
        });
        return off;
      });

      // Compose cached layers on top of star field
      composeLayers(ctx, [gridLayer, galaxiesLayer]);

      // FPS tracking (dev-guarded logging/overlay)
      {
        const now = (typeof performance !== 'undefined' ? performance.now() : Date.now());
        const fps = perfMonitorRef.current ? perfMonitorRef.current.update(now) : 0;

        if (enableFpsMonitor) {
          ctx.fillStyle = 'rgba(0,255,0,0.85)';
          ctx.font = '10px monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`${fps} fps`, 8, 16);
        }
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      running = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [canvas, empire, showGrid, showTerritories, enableFpsMonitor]);

  // Cache hygiene: clear when dimensions or flags change
  React.useEffect(() => {
    clearLayerCache(layerCacheRef.current, (k) =>
      k.startsWith('universe:background') || k.startsWith('universe:galaxies')
    );
  }, [canvas.width, canvas.height, showGrid, showTerritories]);

  return null; // This component only renders to canvas
};

const drawStarField = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const time = Date.now() * 0.0001;

  // Draw twinkling stars
  for (let i = 0; i < 300; i++) {
    const x = (i * 37) % width;
    const y = (i * 73) % height;
    const brightness = 0.2 + 0.8 * Math.sin(time + i * 0.1);
    const size = 0.5 + 0.5 * Math.sin(time * 2 + i * 0.05);

    ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.6})`;
    ctx.fillRect(x, y, size, size);
  }

  // Draw nebula effects
  for (let i = 0; i < 5; i++) {
    const x = (i * 157) % width;
    const y = (i * 211) % height;
    const radius = 50 + 30 * Math.sin(time + i);

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(100, 50, 200, ${0.1 * Math.sin(time + i)})`);
    gradient.addColorStop(1, 'rgba(100, 50, 200, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
};

/**
 * Draw only the grid lines using a fitted layout (used for off-screen caching).
 */
const drawUniverseGridLines = (
  ctx: CanvasRenderingContext2D,
  layout: ReturnType<typeof calculateGridLayout>,
  cols: number,
  rows: number,
  galaxySize: number,
  padding: number
) => {
  const { totalWidth, totalHeight, startX, startY } = layout;

  ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
  ctx.lineWidth = 1;

  // Vertical lines
  for (let col = 0; col <= cols; col++) {
    const x = startX + col * (galaxySize + padding) - padding / 2;
    ctx.beginPath();
    ctx.moveTo(x, startY - padding / 2);
    ctx.lineTo(x, startY + totalHeight + padding / 2);
    ctx.stroke();
  }

  // Horizontal lines
  for (let row = 0; row <= rows; row++) {
    const y = startY + row * (galaxySize + padding) - padding / 2;
    ctx.beginPath();
    ctx.moveTo(startX - padding / 2, y);
    ctx.lineTo(startX + totalWidth + padding / 2, y);
    ctx.stroke();
  }
};

/**
 * Draw galaxies (spirals + labels) using a fitted layout (offscreen cached).
 */
const drawGalaxies = (
  ctx: CanvasRenderingContext2D,
  layout: ReturnType<typeof calculateGridLayout>,
  showTerritories: boolean,
  empire: Empire
) => {
  const { galaxySize, padding, cols } = UNIVERSE_LAYOUT;
  const { startX, startY } = layout;

  // Galaxies
  for (let galaxyId = 0; galaxyId < 40; galaxyId++) {
    const row = Math.floor(galaxyId / cols);
    const col = galaxyId % cols;

    const x = startX + col * (galaxySize + padding);
    const y = startY + row * (galaxySize + padding);

    drawGalaxy(ctx, x, y, galaxySize, galaxyId, empire, showTerritories);
  }

  // Labels
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '12px monospace';
  ctx.textAlign = 'center';

  for (let galaxyId = 0; galaxyId < 40; galaxyId++) {
    const row = Math.floor(galaxyId / cols);
    const col = galaxyId % cols;

    const x = startX + col * (galaxySize + padding) + galaxySize / 2;
    const y = startY + row * (galaxySize + padding) + galaxySize + 15;

    ctx.fillText(`Galaxy ${galaxyId}`, x, y);
  }
};

const drawGalaxy = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  galaxyId: number,
  empire: Empire,
  showTerritories: boolean
) => {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const radius = size / 2 - 5;

  // Draw galaxy spiral
  ctx.strokeStyle = 'rgba(200, 200, 255, 0.6)';
  ctx.lineWidth = 2;

  for (let arm = 0; arm < 3; arm++) {
    ctx.beginPath();
    for (let t = 0; t < Math.PI * 4; t += 0.1) {
      const spiralRadius = (t / (Math.PI * 4)) * radius;
      const angle = t + (arm * Math.PI * 2 / 3);
      const spiralX = centerX + Math.cos(angle) * spiralRadius;
      const spiralY = centerY + Math.sin(angle) * spiralRadius;

      if (t === 0) {
        ctx.moveTo(spiralX, spiralY);
      } else {
        ctx.lineTo(spiralX, spiralY);
      }
    }
    ctx.stroke();
  }

  // Draw galaxy core
  const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 15);
  coreGradient.addColorStop(0, 'rgba(255, 255, 200, 0.8)');
  coreGradient.addColorStop(1, 'rgba(255, 255, 200, 0)');
  ctx.fillStyle = coreGradient;
  ctx.fillRect(centerX - 15, centerY - 15, 30, 30);

  // Show territory indicators if enabled
  if (showTerritories) {
    // Check if this galaxy contains empire territories
    const hasTerritory = empire.territories.some(coord => {
      try {
        const galaxyFromCoord = parseInt(coord.substring(1, 3), 10);
        return galaxyFromCoord === galaxyId;
      } catch {
        return false;
      }
    });

    if (hasTerritory) {
      // Draw territory indicator
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius + 2, 0, Math.PI * 2);
      ctx.stroke();

      // Add empire flag
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(x + size - 12, y + 2, 10, 8);
    }
  }

  // Draw galaxy border
  ctx.strokeStyle = 'rgba(100, 150, 255, 0.4)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Add hover effect (placeholder)
  const isHovered = false;
  if (isHovered) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
};

// Click handling function for universe view
export const handleUniverseViewClick = (
  clickX: number,
  clickY: number,
  canvasWidth: number,
  canvasHeight: number
): number | null => {
  const { galaxySize, padding, cols, rows } = UNIVERSE_LAYOUT;
  const layout = calculateGridLayout(canvasWidth, canvasHeight, galaxySize, padding, cols, rows);
  const { totalWidth, totalHeight, startX, startY } = layout;

  return getClickedIndex(
    clickX,
    clickY,
    startX,
    startY,
    galaxySize,
    padding,
    cols,
    rows,
    totalWidth,
    totalHeight
  );
};

export default UniverseOverview;
