import React, { useEffect, useRef, useState } from 'react';
import { CoordinateComponents, pickStarKindFromCoord } from '@game/shared';
import universeService from '../../../services/universeService';
import type { UniverseRegionSystemsData } from '../../../services/universeService';
import useUniverseMapStore from '../../../stores/universeMapStore';
import {
  buildCachedLayer,
  createOffscreenLayer,
  drawToLayer,
  composeLayers,
  clearLayerCache,
  type LayerCache
} from './helpers/offscreenLayers';

interface RegionViewProps {
  canvas: HTMLCanvasElement;
  selectedCoordinate: CoordinateComponents | null;
  showTerritories: boolean;
}

const RegionView: React.FC<RegionViewProps> = ({
  canvas,
  selectedCoordinate,
  showTerritories
}) => {
  const [regionSystems, setRegionSystems] = useState<UniverseRegionSystemsData['systems']>([]);
  const { setRegionData } = useUniverseMapStore();
  const layerCacheRef = useRef<LayerCache>(new Map());

  // Fetch region systems for selected region
  useEffect(() => {
    if (!selectedCoordinate) return;
    (async () => {
      try {
        const res = await universeService.getRegionSystems(
          selectedCoordinate.server,
          selectedCoordinate.galaxy,
          selectedCoordinate.region
        );
        if ((res as any)?.success && (res as any)?.data) {
          const systems = (res as any).data.systems || [];
          setRegionSystems(systems);

          // Cache summary for UniverseMap click gating (real stars only)
          const key = `${selectedCoordinate.server}${selectedCoordinate.galaxy}:${selectedCoordinate.region}`;
          const systemsWithStars = systems
            .filter((s: any) => !!s && s.star)
            .map((s: any) => s.system);
          setRegionData(key, { systemsWithStars });
        } else {
          setRegionSystems([]);
        }
      } catch {
        setRegionSystems([]);
      }
    })();
  }, [selectedCoordinate?.server, selectedCoordinate?.galaxy, selectedCoordinate?.region, setRegionData]);

  // Render
  useEffect(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !selectedCoordinate) return;

    // Clear canvas with space background
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Animated starfield (kept separate from cached static layers)
    drawStarField(ctx, canvas.width, canvas.height);

    // Cached static grid/background layer
    const gridDeps = { width: canvas.width, height: canvas.height };
    const gridLayer = buildCachedLayer('region:grid', gridDeps, layerCacheRef.current, () => {
      const off = createOffscreenLayer(canvas.width, canvas.height);
      drawToLayer(off, (gctx) => {
        drawRegionGridLayer(gctx, canvas.width, canvas.height);
      });
      return off;
    });

    // Dynamic systems + labels (depends on server/galaxy/region and data)
    const systemsKeyDeps = {
      server: selectedCoordinate.server,
      galaxy: selectedCoordinate.galaxy,
      region: selectedCoordinate.region,
      systems: computeSystemsHash(regionSystems),
      showTerritories
    };

    const systemsLayer = buildCachedLayer(
      'region:systems',
      systemsKeyDeps,
      layerCacheRef.current,
      () => {
        const off = createOffscreenLayer(canvas.width, canvas.height);
        drawToLayer(off, (rctx) => {
          drawSystemsInRegion(
            rctx,
            canvas.width,
            canvas.height,
            selectedCoordinate,
            regionSystems,
            showTerritories
          );
        });
        return off;
      }
    );

    // Compose cached layers: grid/background first, then dynamic systems
    composeLayers(ctx, [gridLayer, systemsLayer]);
  }, [canvas, selectedCoordinate, showTerritories, regionSystems]);

  // Cache hygiene on dimension changes
  useEffect(() => {
    clearLayerCache(layerCacheRef.current, (k) =>
      k.startsWith('region:grid') || k.startsWith('region:systems')
    );
  }, [canvas.width, canvas.height]);

  return null; // This component only renders to canvas
};

// ----------------- Rendering helpers -----------------

const drawStarField = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const time = Date.now() * 0.0001;

  // Twinkling stars
  for (let i = 0; i < 150; i++) {
    const x = (i * 43) % width;
    const y = (i * 71) % height;
    const brightness = 0.4 + 0.6 * Math.sin(time + i * 0.2);
    const size = 0.8 + 0.4 * Math.sin(time * 1.2 + i * 0.1);

    ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.8})`;
    ctx.fillRect(x, y, size, size);
  }

  // Nebula clouds
  for (let i = 0; i < 3; i++) {
    const x = (i * 200) % width;
    const y = (i * 150) % height;
    const radius = 80 + 40 * Math.sin(time + i);

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(200, 100, 255, ${0.08 * Math.sin(time + i)})`);
    gradient.addColorStop(1, 'rgba(200, 100, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
};

// Layout used by both draw and hit-tests
const calculateRegionGridLayout = (width: number, height: number) => {
  const gridX = 50;
  const gridY = 80;
  const gridW = width - 100;
  const gridH = height - 160;
  const cols = 10;
  const rows = 10;
  const cellW = gridW / cols;
  const cellH = gridH / rows;
  return { gridX, gridY, gridW, gridH, cols, rows, cellW, cellH };
};

// Cached static background + grid
const drawRegionGridLayer = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  // Background gradient (semi-transparent so starfield shows through)
  const gradient = ctx.createRadialGradient(
    width / 2,
    height / 2,
    0,
    width / 2,
    height / 2,
    Math.max(width, height) / 2
  );
  gradient.addColorStop(0, 'rgba(20, 20, 40, 0.3)');
  gradient.addColorStop(1, 'rgba(10, 10, 20, 0.1)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Grid lines
  const { gridX, gridY, gridW, gridH, cols, rows, cellW, cellH } = calculateRegionGridLayout(width, height);
  const gridStroke = 'rgba(100,150,255,0.25)';
  ctx.strokeStyle = gridStroke;
  ctx.lineWidth = 1;
  for (let c = 0; c <= cols; c++) {
    const x = gridX + c * cellW;
    ctx.beginPath();
    ctx.moveTo(x, gridY);
    ctx.lineTo(x, gridY + gridH);
    ctx.stroke();
  }
  for (let r = 0; r <= rows; r++) {
    const y = gridY + r * cellH;
    ctx.beginPath();
    ctx.moveTo(gridX, y);
    ctx.lineTo(gridX + gridW, y);
    ctx.stroke();
  }
};

// Dynamic systems/labels layer (composed above cached grid/background)
const drawSystemsInRegion = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  selectedCoordinate: CoordinateComponents,
  systems: UniverseRegionSystemsData['systems'],
  showTerritories: boolean
) => {
  const { gridX, gridY, gridH, cols, cellW, cellH } = calculateRegionGridLayout(width, height);

  // Draw stars at fixed 10x10 grid cell centers based on real system id (00–99)
  systems.forEach((sys) => {
    const col = sys.system % cols;
    const row = Math.floor(sys.system / cols);

    const systemX = gridX + col * cellW + cellW / 2;
    const systemY = gridY + row * cellH + cellH / 2;

    // Visual size consistent but slightly varied if desired (owned highlight could increase)
    const systemSize = 10;

    // Draw system with coordinate label using real system id
    const star = (sys as any).star;
    const spectralClass = (star?.spectralClass as any) || undefined;

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
    const coordForStar = sysCoord && sysCoord.split(':').length === 2 ? `${sysCoord}:00` : sysCoord;
    const starKind = coordForStar ? pickStarKindFromCoord(coordForStar, 101) : undefined;
    const baseHex = star?.color || (starKind ? kindColorMap[starKind] : undefined);

    const displayHex = baseHex ? enhanceStarColor(baseHex, spectralClass) : undefined;

    drawStarSystemAtPosition(
      ctx,
      systemX,
      systemY,
      systemSize,
      0.75,
      selectedCoordinate,
      sys.system,
      showTerritories,
      displayHex
    );
  });

  // Region title and coordinate
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'bold 20px monospace';
  ctx.textAlign = 'center';
  const coordString = `${selectedCoordinate.server}${selectedCoordinate.galaxy.toString().padStart(2, '0')}:${selectedCoordinate.region.toString().padStart(2, '0')}`;
  ctx.fillText(`Galaxy ${selectedCoordinate.galaxy} > Region ${selectedCoordinate.region}`, width / 2, 35);

  // Coordinate reference
  ctx.fillStyle = 'rgba(255, 255, 150, 0.8)';
  ctx.font = '14px monospace';
  ctx.fillText(`(${coordString})`, width / 2, 55);

  // Hint for empty regions
  if (!systems || systems.length === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '14px monospace';
    ctx.fillText('No star systems in this region (from DB).', width / 2, gridY + gridH / 2);
  }
};

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

const hexToRgb = (hex: string) => {
  const h = hex.replace('#', '');
  const normalized = h.length === 3 ? h.split('').map(ch => ch + ch).join('') : h;
  const bigint = parseInt(normalized, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
};

const rgbToHsl = (r: number, g: number, b: number) => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, l };
};

const hslToHex = (h: number, s: number, l: number) => {
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x: number) => {
    const v = Math.round(x * 255).toString(16).padStart(2, '0');
    return v;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

/**
 * Small, stable fingerprint for systems to use in cache keys
 */
const computeSystemsHash = (systems: UniverseRegionSystemsData['systems']): string => {
  try {
    let hash = systems.length;
    for (let i = 0; i < systems.length; i++) {
      const s = systems[i] as any;
      const id = (s?.system ?? 0) as number;
      const color = typeof s?.star?.color === 'string' ? s.star.color : '';
      const colorNibble = color.length >= 7 ? parseInt(color.slice(1, 3), 16) : 0;
      hash = ((hash << 5) - hash) + ((id & 0xffff) ^ (colorNibble & 0xff));
      hash |= 0; // keep in 32-bit range
    }
    return `${systems.length}:${hash >>> 0}`;
  } catch {
    return `${systems?.length ?? 0}:0`;
  }
};

const enhanceStarColor = (
  hex: string,
  spectralClass?: 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M'
) => {
  try {
    const { r, g, b } = hexToRgb(hex);
    let { h, s, l } = rgbToHsl(r, g, b);

    // Boost saturation and adjust lightness per class for contrast
    switch (spectralClass) {
      case 'O':
      case 'B':
        s = Math.min(1, s * 1.6 + 0.25);
        l = Math.min(0.88, l * 0.95 + 0.1);
        break;
      case 'A':
      case 'F':
        s = Math.min(1, s * 1.35 + 0.15);
        l = Math.min(0.86, l * 1.0 + 0.05);
        break;
      case 'G':
        s = Math.min(1, s * 1.25 + 0.12);
        l = Math.min(0.84, l * 1.0);
        break;
      case 'K':
      case 'M':
        s = Math.min(1, s * 1.45 + 0.2);
        l = Math.min(0.8, l * 0.95 + 0.02);
        break;
      default:
        s = Math.min(1, s * 1.3 + 0.15);
        l = Math.min(0.85, l);
    }

    return hslToHex(h, s, l);
  } catch {
    return hex;
  }
};

const drawStarSystemAtPosition = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  brightness: number,
  selectedCoordinate: CoordinateComponents,
  systemId: number,
  showTerritories: boolean,
  starColor?: string
) => {
  // Resolve star color from DB (or fallback to white)
  const resolvedColor = starColor ?? '#FFFFFF';

  // Color glow (use additive blend for intensity)
  ctx.save();
  const prevComposite = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2.4);
  const innerAlpha = Math.min(1, 0.75 + 0.25 * brightness);
  glowGradient.addColorStop(0, hexToRgba(resolvedColor, innerAlpha));
  glowGradient.addColorStop(1, hexToRgba(resolvedColor, 0));
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(x, y, size * 2.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = prevComposite;
  ctx.restore();

  // Main star
  ctx.fillStyle = resolvedColor;
  ctx.beginPath();
  ctx.arc(x, y, size, 0, Math.PI * 2);
  ctx.fill();

  // Colored inner core to reinforce hue
  ctx.fillStyle = hexToRgba(resolvedColor, Math.min(1, 0.85));
  ctx.beginPath();
  ctx.arc(x, y, size * 0.55, 0, Math.PI * 2);
  ctx.fill();

  // Small white sparkle for brightness (reduced so hue dominates)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.beginPath();
  ctx.arc(x, y, size * 0.18, 0, Math.PI * 2);
  ctx.fill();

  // Thin rim to accentuate color boundary
  ctx.strokeStyle = hexToRgba(resolvedColor, 0.9);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(x, y, size + 1.2, 0, Math.PI * 2);
  ctx.stroke();

  // Draw coordinate label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  const systemCoord = `${selectedCoordinate.server}${selectedCoordinate.galaxy.toString().padStart(2, '0')}:${selectedCoordinate.region.toString().padStart(2, '0')}:${systemId.toString().padStart(2, '0')}`;
  ctx.fillText(systemCoord, x, y + size + 15);

  // Show territory indicators if enabled (placeholder)
  if (showTerritories) {
    const hasTerritory = false;
    if (hasTerritory) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, size + 5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
};
  
export default RegionView;
