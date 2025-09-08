import * as React from 'react';
import { Empire, CoordinateComponents, formatCoord, pickStarKindFromCoord } from '@game/shared';
import { SystemBody, getBodyPositionAtTime, mapServerBodiesToSystemBodies, ServerBody } from './systemBodies';
import useUniverseMapStore from '../../../stores/universeMapStore';
import { STANDARD_ORBITS } from './mapConstants';
import { buildCachedLayer, createOffscreenLayer, drawToLayer, composeLayers, clearLayerCache, LayerCache } from './helpers/offscreenLayers';

interface SystemViewProps {
  canvas: HTMLCanvasElement;
  selectedCoordinate: CoordinateComponents | null;
  empire: Empire;
  showResources: boolean;
  serverBodies?: ServerBody[];
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
          console.debug(`[SystemView] ${this.fps} fps`);
        }
        if (this.fps < this.threshold) {
          this.belowThresholdCount++;
          if (this.belowThresholdCount >= this.warnStreakSeconds) {
            if (typeof console !== 'undefined' && typeof console.warn === 'function') {
              console.warn(
                `[SystemView] Sustained low FPS (${this.fps} < ${this.threshold}) for ${this.warnStreakSeconds}s`
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

const SystemView: React.FC<SystemViewProps> = ({
  canvas,
  selectedCoordinate,
  empire,
  showResources,
  serverBodies
}) => {
  const { setSystemTimeScalar } = useUniverseMapStore();

  // Offscreen cache for static-most background (orbit rings)
  const layerCacheRef = React.useRef<LayerCache>(new Map());
  const animationRef = React.useRef<number | null>(null);
  const enableFpsMonitor =
    (typeof window !== 'undefined') &&
    !!window.localStorage &&
    window.localStorage.getItem('enableFpsMonitor') === '1';
  const perfMonitorRef = React.useRef<PerformanceMonitor | null>(null);

  React.useEffect(() => {
    const ctx = canvas.getContext('2d');
    if (!ctx || !selectedCoordinate) return;

    let running = true;

    // Init performance monitor (dev-guarded via localStorage flag)
    perfMonitorRef.current = new PerformanceMonitor(enableFpsMonitor);

    const draw = () => {
      if (!running) return;

      // Clear canvas with space background
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Animated star field (dynamic, not cached)
      drawStarField(ctx, canvas.width, canvas.height);

      // Establish shared timebase for draw and click hit-testing
      const timeScalar = Date.now() * 0.0005;
      setSystemTimeScalar(timeScalar);

      // Cached background layer: standardized orbit rings only
      const bgDeps = {
        width: canvas.width,
        height: canvas.height
      };
      const bgLayer = buildCachedLayer('system:background', bgDeps, layerCacheRef.current, () => {
        const off = createOffscreenLayer(canvas.width, canvas.height);
        drawToLayer(off, (gctx) => {
          const centerX = off.width / 2;
          const centerY = off.height / 2;
          STANDARD_ORBITS.forEach((r) => drawOrbit(gctx, centerX, centerY, r));
        });
        return off;
      });

      // Compose cached background on top of starfield
      composeLayers(ctx, [bgLayer]);

      // Draw the star system bodies with discovery states (DB-backed)
      drawStarSystemDetail(ctx, canvas.width, canvas.height, selectedCoordinate, showResources, timeScalar, serverBodies);

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
  }, [canvas, selectedCoordinate, showResources, empire, serverBodies, setSystemTimeScalar, enableFpsMonitor]);

  // Cache hygiene: clear cached system background on dimension changes
  React.useEffect(() => {
    clearLayerCache(layerCacheRef.current, (k) => k.startsWith('system:background'));
  }, [canvas.width, canvas.height]);

  return null; // This component only renders to canvas
};

const drawStarField = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const time = Date.now() * 0.0001;

  // Draw distant stars
  for (let i = 0; i < 100; i++) {
    const x = (i * 47) % width;
    const y = (i * 83) % height;
    const brightness = 0.5 + 0.5 * Math.sin(time + i * 0.3);
    const size = 1 + 0.5 * Math.sin(time * 0.8 + i * 0.15);

    ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.9})`;
    ctx.fillRect(x, y, size, size);
  }

  // Draw cosmic dust
  for (let i = 0; i < 2; i++) {
    const x = (i * 300) % width;
    const y = (i * 200) % height;
    const radius = 120 + 60 * Math.sin(time + i);

    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(255, 200, 100, ${0.05 * Math.sin(time + i)})`);
    gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
};

const drawStarSystemDetail = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  selectedCoordinate: CoordinateComponents,
  showResources: boolean,
  timeScalar: number,
  serverBodies?: ServerBody[]
) => {
  const centerX = width / 2;
  const centerY = height / 2;

  // Determine deterministic star kind/color for this system's central star (body 0)
  const starCoordStr = formatCoord({ ...selectedCoordinate, body: 0 });
  const starKind = pickStarKindFromCoord(starCoordStr, 101);
  const starColorMap: Record<string, string> = {
    YELLOW: '#FFF4EA',
    ORANGE: '#FFD2A1',
    WHITE: '#CAD7FF',
    BLUE: '#9BB0FF',
    RED_GIANT: '#FF9E7B',
    SUPER_GIANT: '#FFE29A',
    WHITE_DWARF: '#E6F1FF',
    NEUTRON: '#AFBFFF'
  };
  const starType = { color: starColorMap[starKind] || '#FFF4EA' };

  // Prefer server bodies (DB truth) with deterministic fallback
  const bodies: SystemBody[] = (serverBodies && serverBodies.length)
    ? mapServerBodiesToSystemBodies(serverBodies)
    : [];

  // Draw central star (colored glow)
  drawCentralStar(ctx, centerX, centerY, starType);

  // Bodies at positions computed from shared timebase
  bodies.forEach((body) => {
    drawCelestialBody(ctx, centerX, centerY, body, showResources, timeScalar);
  });

  // Title and coordinate
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'bold 16px monospace';
  ctx.textAlign = 'center';
  const coordString = `${selectedCoordinate.server}${selectedCoordinate.galaxy
    .toString()
    .padStart(2, '0')}:${selectedCoordinate.region
    .toString()
    .padStart(2, '0')}:${selectedCoordinate.system.toString().padStart(2, '0')}`;
  ctx.fillText(`System ${selectedCoordinate.system}`, width / 2, 30);

  ctx.fillStyle = 'rgba(255, 255, 150, 0.8)';
  ctx.font = '12px monospace';
  ctx.fillText(`(${coordString})`, width / 2, 50);

  if (showResources) {
    drawResourceLegend(ctx, width, height);
  }
};

const drawCentralStar = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  starType: { color: string }
) => {
  // Helpers localized to this draw to avoid file-wide edits
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
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  };
  const enhanceStarColor = (hex: string) => {
    try {
      const { r, g, b } = hexToRgb(hex);
      let { h, s, l } = rgbToHsl(r, g, b);
      s = Math.min(1, s * 1.5 + 0.2);
      l = Math.min(0.86, l * 1.0 + 0.05);
      return hslToHex(h, s, l);
    } catch {
      return hex;
    }
  };

  const time = Date.now() * 0.001;
  const starRadius = 15 + 3 * Math.sin(time);
  const baseHex = starType.color;
  const displayHex = enhanceStarColor(baseHex);

  // Additive colored corona for dramatic hue
  ctx.save();
  const prevComposite = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = 'lighter';
  const coronaGrad = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, starRadius * 2.8);
  coronaGrad.addColorStop(0, hexToRgba(displayHex, 0.75));
  coronaGrad.addColorStop(1, hexToRgba(displayHex, 0));
  ctx.fillStyle = coronaGrad;
  ctx.beginPath();
  ctx.arc(centerX, centerY, starRadius * 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = prevComposite;
  ctx.restore();

  // Main star body (colored)
  ctx.fillStyle = displayHex;
  ctx.beginPath();
  ctx.arc(centerX, centerY, starRadius, 0, Math.PI * 2);
  ctx.fill();

  // Colored inner core to emphasize hue
  ctx.fillStyle = hexToRgba(displayHex, 0.9);
  ctx.beginPath();
  ctx.arc(centerX, centerY, starRadius * 0.6, 0, Math.PI * 2);
  ctx.fill();

  // Small white sparkle for brightness
  ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.beginPath();
  ctx.arc(centerX, centerY, starRadius * 0.22, 0, Math.PI * 2);
  ctx.fill();

  // Subtle colored rim
  ctx.strokeStyle = hexToRgba(displayHex, 0.95);
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(centerX, centerY, starRadius + 1.5, 0, Math.PI * 2);
  ctx.stroke();
};

const drawOrbit = (ctx: CanvasRenderingContext2D, centerX: number, centerY: number, radius: number) => {
  ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.stroke();
};

const drawCelestialBody = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  body: SystemBody,
  showResources: boolean,
  timeScalar: number
) => {
  const { x, y } = getBodyPositionAtTime(body, timeScalar, centerX, centerY);

  // Always draw DB-backed body (no placeholders)
  ctx.fillStyle = body.color;
  ctx.beginPath();
  ctx.arc(x, y, body.size, 0, Math.PI * 2);
  ctx.fill();

  // Draw body outline
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw colony indicator (if any)
  if (body.hasColony) {
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, body.size + 2, 0, Math.PI * 2);
    ctx.stroke();

    // Add empire name for colonized planets (from server)
    const ownerName = body.owner?.username ?? 'Unknown';
    ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ownerName, x, y - body.size - 8);
  }

  // Draw resource indicators if enabled
  if (showResources) {
    drawResourceIndicators(ctx, x, y, body);
  }

  // Draw body label
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(body.name, x, y + body.size + 12);

  // (Optional) body tooltip on hover (hover detection not implemented yet)
  const isHovered = false; // TODO: Implement hover detection
  if (isHovered) {
    drawBodyTooltip(ctx, x, y, body);
  }
};

const drawResourceIndicators = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  body: SystemBody
) => {
  const resources = [
    { value: body.resources.metal, color: '#C0C0C0', symbol: 'M' },
    { value: body.resources.energy, color: '#4169E1', symbol: 'E' }
  ];

  resources.forEach((resource, index) => {
    const intensity = resource.value / 10;
    const indicatorX = x - 10 + index * 10;
    const indicatorY = y - body.size - 8;

    ctx.fillStyle = `rgba(${hexToRgb(resource.color)}, ${intensity})`;
    ctx.fillRect(indicatorX, indicatorY, 8, 4);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.font = '8px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(resource.symbol, indicatorX + 4, indicatorY + 3);
  });
};

const drawBodyTooltip = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  body: SystemBody
) => {
  const tooltipWidth = 120;
  const tooltipHeight = 60;
  const tooltipX = x + 20;
  const tooltipY = y - tooltipHeight / 2;

  // Tooltip background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(tooltipX, tooltipY, tooltipWidth, tooltipHeight);

  // Tooltip content
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = '10px monospace';
  ctx.textAlign = 'left';

  ctx.fillText(body.name, tooltipX + 5, tooltipY + 15);
  ctx.fillText(`Type: ${body.type}`, tooltipX + 5, tooltipY + 25);
  ctx.fillText(`Fertility: ${body.fertility}`, tooltipX + 5, tooltipY + 35);
  ctx.fillText(`M:${body.resources.metal} E:${body.resources.energy}`, tooltipX + 5, tooltipY + 45);
};

const drawResourceLegend = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const legendX = width - 150;
  const legendY = height - 80;
  const legendWidth = 140;
  const legendHeight = 70;

  // Legend background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(legendX, legendY, legendWidth, legendHeight);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(legendX, legendY, legendWidth, legendHeight);

  // Legend title
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.font = 'bold 12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Resources', legendX + 5, legendY + 15);

  // Legend items
  const resources = [
    { color: '#C0C0C0', label: 'Metal (M)' },
    { color: '#4169E1', label: 'Energy (E)' }
  ];

  ctx.font = '10px monospace';
  resources.forEach((resource, index) => {
    const itemY = legendY + 25 + index * 12;

    ctx.fillStyle = resource.color;
    ctx.fillRect(legendX + 5, itemY, 8, 8);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillText(resource.label, legendX + 18, itemY + 7);
  });
};

const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `${r}, ${g}, ${b}`;
  }
  return '255, 255, 255';
};

/**
 * Handle clicks in SystemView using the SAME timeScalar and body positions as draw (click-parity).
 * Returns the index of the clicked body in the mapped SystemBody array, or null if none hit.
 */
export const handleSystemViewClick = (
  clickX: number,
  clickY: number,
  canvasWidth: number,
  canvasHeight: number,
  timeScalar: number,
  serverBodies?: ServerBody[]
): number | null => {
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const bodies: SystemBody[] = (serverBodies && serverBodies.length)
    ? mapServerBodiesToSystemBodies(serverBodies)
    : [];

  for (let i = 0; i < bodies.length; i++) {
    const body = bodies[i];
    const { x, y } = getBodyPositionAtTime(body, timeScalar, centerX, centerY);
    const dx = clickX - x;
    const dy = clickY - y;
    const dist2 = dx * dx + dy * dy;
    if (dist2 <= body.size * body.size) {
      return i;
    }
  }
  return null;
};

export default SystemView;
