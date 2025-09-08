import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Empire, formatCoord } from '@game/shared';
import useUniverseMapStore from '../../stores/universeMapStore';
import LocationTooltip from './map/LocationTooltip';
import { handleUniverseViewClick } from './map/UniverseOverview';
import { handleGalaxyViewClick } from './map/GalaxyView';
import RegionView from './map/RegionView';
import SystemView from './map/SystemView';
import StarInfoPanel from './map/StarInfoPanel';
import {
  ZOOM_CONFIGS
} from './map/coordinateMapping';
import { generateSeedFromCoordinate } from '@game/shared';
import { getBodyPositionAtTime, mapServerBodiesToSystemBodies, SystemBody } from './map/systemBodies';
import universeService from '../../services/universeService';
import RegionSummaryQueue from '../../services/regionSummaryQueue';
import { GALAXY_LAYOUT, calculateFittedGridLayout, getClickedIndex } from './map/mapConstants';

interface UniverseMapProps {
  empire: Empire;
}

const UniverseMap: React.FC<UniverseMapProps> = ({ empire }) => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [hoveredLocation] = useState<any>(null);
  const [hoveredRegion, setHoveredRegion] = useState<number | null>(null);
  const [canvasReady, setCanvasReady] = useState(false);

  // Guard to prevent repeated galaxy prefetch bursts per (server, galaxy)
  const prefetchKeyRef = useRef<string | null>(null);
  // Queue for safe region summary fetching with backoff
  const queueRef = useRef<RegionSummaryQueue | null>(null);

  const {
    zoomLevel,
    selectedCoordinate,
    viewport,
    isLoading,
    error,
    showGrid,
    showTerritories,
    showFleets,
    showResources,
    navigateToGalaxy,
    navigateToRegion,
    navigateToSystem,
    zoomIn,
    zoomOut,
    setError,
    setLoading,
    systemData,
    setSystemData,
    setRegionData,
    systemTimeScalar,
    regionData,
    regionDataVersion
  } = useUniverseMapStore();

  // Handle canvas resize
  const handleResize = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const newSize = {
        width: Math.max(800, rect.width - 16), // Minimal padding for fullscreen
        height: Math.max(600, rect.height - 32) // Reduced padding since controls are hidden
      };
      setCanvasSize(newSize);
    }
  }, []);

  // Handle mouse events

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePosition({ x, y });

    // Galaxy view hover detection for region tooltip
    if (zoomLevel === 'galaxy') {
      const fitted = calculateFittedGridLayout(
        canvasSize.width,
        canvasSize.height,
        GALAXY_LAYOUT.regionSize,
        GALAXY_LAYOUT.padding,
        GALAXY_LAYOUT.cols,
        GALAXY_LAYOUT.rows
      );
      const idx = getClickedIndex(
        x,
        y,
        fitted.startX,
        fitted.startY,
        fitted.itemSize,
        fitted.padding,
        GALAXY_LAYOUT.cols,
        GALAXY_LAYOUT.rows,
        fitted.totalWidth,
        fitted.totalHeight
      );
      setHoveredRegion(idx);
    } else if (hoveredRegion !== null) {
      setHoveredRegion(null);
    }

  }, [zoomLevel, canvasSize, hoveredRegion]);



  const handleCanvasClick = useCallback((e: React.MouseEvent) => {

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Handle click based on current zoom level using view component functions
    switch (zoomLevel) {
      case 'universe':
        const galaxyId = handleUniverseViewClick(x, y, canvasSize.width, canvasSize.height);
        if (galaxyId !== null && galaxyId >= 0 && galaxyId < 40) {
          console.log(`Clicked galaxy ${galaxyId}`);
          navigateToGalaxy(galaxyId);
        }
        break;
        
      case 'galaxy':
        const regionId = handleGalaxyViewClick(x, y, canvasSize.width, canvasSize.height);
        if (regionId !== null && selectedCoordinate && regionId >= 0 && regionId < 100) {
          console.log(`Clicked region ${regionId}`);
          navigateToRegion(selectedCoordinate.galaxy, regionId);
        }
        break;
        
      case 'region':
        // Detect which system was clicked using the same 10x10 grid math as RegionView
        if (!selectedCoordinate) {
          console.log('No coordinate selected in region view');
          break;
        }
        try {
          const width = canvasSize.width;
          const height = canvasSize.height;

          // Match RegionView grid parameters exactly
          const gridX = 50;
          const gridY = 80;
          const gridW = width - 100;
          const gridH = height - 160;
          const cols = 10;
          const rows = 10;
          const cellW = gridW / cols;
          const cellH = gridH / rows;

          // Ensure click is within grid bounds
          if (x >= gridX && x <= gridX + gridW && y >= gridY && y <= gridY + gridH) {
            const col = Math.floor((x - gridX) / cellW);
            const row = Math.floor((y - gridY) / cellH);

            if (col >= 0 && col < cols && row >= 0 && row < rows) {
              // Require click to be near the star center to avoid padding clicks
              const cx = gridX + col * cellW + cellW / 2;
              const cy = gridY + row * cellH + cellH / 2;
              const dx = x - cx;
              const dy = y - cy;
              const r = 14; // ~starSize (10) + padding

              if (dx * dx + dy * dy <= r * r) {
                const systemId = row * cols + col;
                const key = `${selectedCoordinate.server}${selectedCoordinate.galaxy}:${selectedCoordinate.region}`;
                const summary = regionData.get(key);
                if (summary?.systemsWithStars?.includes(systemId)) {
                  console.log(`Clicked system ${systemId}`);
                  navigateToSystem(selectedCoordinate.galaxy, selectedCoordinate.region, systemId);
                } else {
                  // No-op: restrict clicks to real star systems only
                }
              }
            }
          }
        } catch (err) {
          console.error('Error handling region click:', err);
        }
        break;
        
      case 'system':
        // Detect planet click in system view using the same math as draw
        if (!selectedCoordinate) {
          console.log('No coordinate selected in system view');
          break;
        }
        try {
          const centerX = canvasSize.width / 2;
          const centerY = canvasSize.height / 2;

          // Seed bodies deterministically from star coordinate (body 0)
          const key = `${selectedCoordinate.server}${selectedCoordinate.galaxy}:${selectedCoordinate.region}:${selectedCoordinate.system}`;
          const cachedBodies = systemData.get(key) as any[] | undefined;
          const bodies = cachedBodies && cachedBodies.length
            ? mapServerBodiesToSystemBodies(cachedBodies as any)
            : [];

          const timeScalar = systemTimeScalar ?? Date.now() * 0.0005;

          let clickedBody: SystemBody | null = null;
          let nearestBody: SystemBody | null = null;
          let nearestDistSq = Number.POSITIVE_INFINITY;

          for (const body of bodies) {
            // Navigate for both planets and asteroids (star is body 0 and not in this list)
            const { x: bx, y: by } = getBodyPositionAtTime(body, timeScalar, centerX, centerY);
            const r = Math.max(8, Math.min(16, body.size + 4)); // slightly more forgiving to ensure reliable clicks
            const dx = x - bx;
            const dy = y - by;
            const distSq = dx * dx + dy * dy;

            if (distSq < nearestDistSq) {
              nearestDistSq = distSq;
              nearestBody = body;
            }
            if (distSq <= r * r) {
              clickedBody = body;
              break;
            }
          }

          // Fallback: if no body fell within its precise radius, use the nearest body within a global threshold
          if (!clickedBody && nearestBody) {
            const globalThreshold = 24; // pixels
            if (nearestDistSq <= globalThreshold * globalThreshold) {
              clickedBody = nearestBody;
            }
          }

          if (clickedBody) {
            // Debug highlight the detected body position to verify hit-testing
            try {
              const canvas = canvasRef.current;
              const ctx = canvas?.getContext('2d');
              if (ctx) {
                const { x: hx, y: hy } = getBodyPositionAtTime(clickedBody, timeScalar, centerX, centerY);
                ctx.save();
                ctx.strokeStyle = 'rgba(0, 255, 0, 0.9)';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(hx, hy, (clickedBody.size || 4) + 8, 0, Math.PI * 2);
                ctx.stroke();
                ctx.restore();
              }
            } catch (e) {
              console.warn('[SystemClick] Debug highlight failed:', e);
            }

            console.log('[SystemClick] Navigating to body', clickedBody.id, 'coord body=', clickedBody.id + 1, 'timeScalar=', timeScalar);

            // Star is body 0, generated bodies are 1..N by adding 1
            const planetBodyIndex = clickedBody.id + 1;
            const planetCoord = formatCoord({
              ...selectedCoordinate,
              body: planetBodyIndex,
            });
            navigate(`/planet/${planetCoord}`);
          } else {
            console.log('[SystemClick] No body matched. nearestDistSq=', nearestDistSq);
          }
        } catch (err) {
          console.error('Error handling system click:', err);
        }
        break;
    }
  }, [canvasSize, zoomLevel, selectedCoordinate, navigate, systemTimeScalar]);

  // Initialize canvas size
  useEffect(() => {
    handleResize();
    // Defer readiness to the next animation frame to ensure the canvas ref is set post-commit
    const rafId = requestAnimationFrame(() => setCanvasReady(true));
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleResize);
    };
  }, [handleResize]);

  // Fetch system bodies from server when entering system view (cached by system key)
  useEffect(() => {
    if (zoomLevel !== 'system' || !selectedCoordinate) return;
    const key = `${selectedCoordinate.server}${selectedCoordinate.galaxy}:${selectedCoordinate.region}:${selectedCoordinate.system}`;
    if (systemData.has(key)) return;

    setLoading(true);
    universeService
      .getSystemBodies(
        selectedCoordinate.server,
        selectedCoordinate.galaxy,
        selectedCoordinate.region,
        selectedCoordinate.system
      )
      .then((res) => {
        if (res.success && res.data) {
          setSystemData(key, res.data.bodies);
        } else {
          setError(res.error || 'Failed to load system bodies');
        }
      })
      .catch(() => setError('Network error loading system bodies'))
      .finally(() => setLoading(false));
  }, [zoomLevel, selectedCoordinate, systemData, setSystemData, setLoading, setError]);

  // Initialize RegionSummaryQueue
  useEffect(() => {
    if (!queueRef.current) {
      queueRef.current = new RegionSummaryQueue(setRegionData);
    }
    return () => {
      queueRef.current?.destroy();
      queueRef.current = null;
    };
  }, [setRegionData]);

  // Prefetch ALL region star colors in one batch when entering Galaxy view
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (zoomLevel !== 'galaxy' || !selectedCoordinate) return;

      const server = selectedCoordinate.server;
      const galaxy = selectedCoordinate.galaxy;
      const prefetchKey = `${server}${galaxy}`;

      // Run only once per (server, galaxy)
      if (prefetchKeyRef.current === prefetchKey) return;

      // Primary path: single batched colors payload for the entire galaxy
      try {
        const res = await universeService.getGalaxyRegionStarColors(server, galaxy);
        if (!cancelled && res.success && res.data) {
          for (const { region, systems } of res.data.regions || []) {
            const systemsWithStars = systems.map((s) => s.system);
            const starColors = Object.fromEntries(systems.map((s) => [s.system, s.color]));
            const key = `${server}${galaxy}:${region}`;
            setRegionData(key, { systemsWithStars, starColors });
          }

          prefetchKeyRef.current = prefetchKey;
          if ((import.meta as any).env?.DEV) {
            // eslint-disable-next-line no-console
            console.info(
              `[GalaxyPrefetch] Batched star colors for ${server}${galaxy.toString().padStart(2, '0')} (regions=${res.data.regions?.length ?? 0})`
            );
          }
          return;
        }
      } catch {
        // fall through to fallback
      }

      // Fallback path: batch positions only, then enqueue queue to fill colors progressively
      try {
        const res2 = await universeService.getGalaxyRegionSummaries(server, galaxy);
        if (!cancelled && res2.success && res2.data) {
          for (const { region, systemsWithStars } of res2.data.regions || []) {
            const key = `${server}${galaxy}:${region}`;
            setRegionData(key, { systemsWithStars });
          }
        }
      } catch {
        // ignore and proceed to queue regardless
      }

      const q = queueRef.current;
      if (!cancelled && q) {
        for (let r = 0; r < 100; r++) {
          const key = `${server}${galaxy}:${r}`;
          q.enqueue({ server, galaxy, region: r, key });
        }
        prefetchKeyRef.current = prefetchKey;
        if ((import.meta as any).env?.DEV) {
          // eslint-disable-next-line no-console
          console.info(
            `[GalaxyPrefetch:FALLBACK] Enqueued 100 regions for ${server}${galaxy.toString().padStart(2, '0')}`
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [zoomLevel, selectedCoordinate?.server, selectedCoordinate?.galaxy, setRegionData]);

  // High-priority fetch for hovered region in Galaxy view
  useEffect(() => {
    if (zoomLevel !== 'galaxy' || !selectedCoordinate) return;
    if (hoveredRegion === null || hoveredRegion < 0 || hoveredRegion >= 100) return;

    const server = selectedCoordinate.server;
    const galaxy = selectedCoordinate.galaxy;
    const key = `${server}${galaxy}:${hoveredRegion}`;

    if (!regionData.has(key)) {
      queueRef.current?.enqueue({ server, galaxy, region: hoveredRegion, key, priority: true });
    }
  }, [zoomLevel, selectedCoordinate?.server, selectedCoordinate?.galaxy, hoveredRegion, regionData]);

  // Draw realistic star field background with steady colors
  const drawStarField = (ctx: CanvasRenderingContext2D) => {
    // Draw deterministic background stars (cosmetic only; no MK dependency)
    for (let i = 0; i < 400; i++) {
      const x = (i * 37) % canvasSize.width;
      const y = (i * 73) % canvasSize.height;

      const seed = generateSeedFromCoordinate(`background-${x}-${y}`, i);
      const palette = ['#9BB0FF', '#CAD7FF', '#FFF4EA', '#FFD2A1', '#E6F1FF', '#AFBFFF'];
      const colorIdx = Math.abs(seed) % palette.length;
      const baseHex = palette[colorIdx];

      // Size between ~0.5 and 2.3 pixels, steady (no twinkling)
      const size = 0.5 + ((Math.abs(seed) % 1000) / 1000) * 1.8;

      ctx.fillStyle = baseHex;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw subtle nebula effects (reduced intensity, no animation)
    for (let i = 0; i < 6; i++) {
      const x = (i * 157) % canvasSize.width;
      const y = (i * 211) % canvasSize.height;
      const radius = 80 + (i * 20); // Static radius
      
      const colors = [
        [80, 40, 160], // Purple
        [160, 80, 40], // Orange
        [40, 160, 80], // Green
        [160, 40, 80], // Pink
        [40, 80, 160], // Blue
        [160, 160, 40], // Yellow
      ];
      const color = colors[i % colors.length];
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0.15)`); // Static opacity
      gradient.addColorStop(1, `rgba(${color[0]}, ${color[1]}, ${color[2]}, 0)`);
      
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  };

  // Draw universe overview (40 galaxies in 8x5 grid)
  const drawUniverseView = (ctx: CanvasRenderingContext2D) => {
    const galaxySize = 80;
    const padding = 20;
    const cols = 8;
    const rows = 5;
    
    const totalWidth = cols * galaxySize + (cols - 1) * padding;
    const totalHeight = rows * galaxySize + (rows - 1) * padding;
    
    const startX = (canvasSize.width - totalWidth) / 2;
    const startY = (canvasSize.height - totalHeight) / 2;

    // Draw grid lines if enabled
    if (showGrid) {
      ctx.strokeStyle = 'rgba(150, 150, 150, 0.6)';
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
    }

    // Draw galaxies
    for (let galaxyId = 0; galaxyId < 40; galaxyId++) {
      const row = Math.floor(galaxyId / cols);
      const col = galaxyId % cols;
      
      const x = startX + col * (galaxySize + padding);
      const y = startY + row * (galaxySize + padding);
      
      drawGalaxy(ctx, x, y, galaxySize, galaxyId, empire, showTerritories);
    }

    // Draw galaxy labels
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
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

  // Draw individual galaxy
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

    // Draw galaxy spiral arms with bright colors
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
    ctx.lineWidth = 3;
    
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

    // Draw bright galaxy core
    const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, 20);
    coreGradient.addColorStop(0, 'rgba(255, 255, 150, 1.0)');
    coreGradient.addColorStop(0.5, 'rgba(255, 200, 100, 0.8)');
    coreGradient.addColorStop(1, 'rgba(255, 150, 50, 0.2)');
    
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, 20, 0, Math.PI * 2);
    ctx.fill();

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
        // Draw bright territory indicator
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
        ctx.stroke();
        
        // Add empire flag
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x + size - 15, y + 3, 12, 8);
      }
    }

    // Draw galaxy border
    ctx.strokeStyle = 'rgba(150, 200, 255, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
  };

  // Draw galaxy view (100 regions in 10x10 grid) - Clean grid layout matching mockup
  const drawGalaxyView = (ctx: CanvasRenderingContext2D) => {
    if (!selectedCoordinate) return;

    const config = ZOOM_CONFIGS.galaxy;
    const fitted = calculateFittedGridLayout(
      canvasSize.width,
      canvasSize.height,
      config.itemSize,
      config.padding,
      config.cols,
      config.rows,
      16
    );

    // Draw clean blue grid lines like in mockup
    ctx.strokeStyle = 'rgba(100, 150, 255, 0.8)';
    ctx.lineWidth = 2;
    
    // Vertical lines
    for (let col = 0; col <= config.cols; col++) {
      const x = fitted.startX + col * (fitted.itemSize + fitted.padding);
      ctx.beginPath();
      ctx.moveTo(x, fitted.startY);
      ctx.lineTo(x, fitted.startY + fitted.totalHeight);
      ctx.stroke();
    }
    
    // Horizontal lines
    for (let row = 0; row <= config.rows; row++) {
      const y = fitted.startY + row * (fitted.itemSize + fitted.padding);
      ctx.beginPath();
      ctx.moveTo(fitted.startX, y);
      ctx.lineTo(fitted.startX + fitted.totalWidth, y);
      ctx.stroke();
    }

    // Draw regions with star clusters like in mockup
    for (let regionId = 0; regionId < 100; regionId++) {
      const row = Math.floor(regionId / config.cols);
      const col = regionId % config.cols;
      
      const x = fitted.startX + col * (fitted.itemSize + fitted.padding);
      const y = fitted.startY + row * (fitted.itemSize + fitted.padding);
      
      drawRegionInGalaxy(ctx, x, y, fitted.itemSize, selectedCoordinate.galaxy, regionId, empire, showTerritories);
    }

    // Draw galaxy title matching mockup format
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Galaxy ${selectedCoordinate.server}${selectedCoordinate.galaxy.toString().padStart(2, '0')}`, fitted.startX, fitted.startY - 20);
    
    // Add "Change" link like in mockup
    ctx.fillStyle = 'rgba(255, 200, 0, 0.9)';
    ctx.font = '14px monospace';
    const titleWidth = ctx.measureText(`Galaxy ${selectedCoordinate.server}${selectedCoordinate.galaxy.toString().padStart(2, '0')}`).width;
    ctx.fillText('Change', fitted.startX + titleWidth + 20, fitted.startY - 20);
  };

  // Helper to convert hex color to rgba
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

  // Draw individual region in galaxy view - matching mockup style
  const drawRegionInGalaxy = (
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    size: number,
    galaxyId: number,
    regionId: number,
    empire: Empire,
    showTerritories: boolean
  ) => {
    // Draw dark space background
    ctx.fillStyle = 'rgba(5, 5, 15, 0.8)';
    ctx.fillRect(x, y, size, size);

    // If we have a server-backed summary for this region, draw stars at mini 10x10 centers
    const server = selectedCoordinate?.server ?? 'A';
    const key = `${server}${galaxyId}:${regionId}`;
    const summary = regionData.get(key) as { systemsWithStars?: number[]; starColors?: Record<number, string> } | undefined;
    if (summary?.systemsWithStars?.length) {
      const mini = size / 10;
      summary.systemsWithStars.forEach((sys) => {
        const col = sys % 10;
        const row = Math.floor(sys / 10);
        const sx = x + (col + 0.5) * mini;
        const sy = y + (row + 0.5) * mini;

        const baseHex = summary.starColors?.[sys] ?? '#FFFFFF';
        const r = Math.max(1.4, Math.min(2.4, mini * 0.12));

        // colored glow
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 3);
        g.addColorStop(0, hexToRgba(baseHex, 0.65));
        g.addColorStop(1, hexToRgba(baseHex, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 3, 0, Math.PI * 2);
        ctx.fill();

        // colored dot
        ctx.fillStyle = baseHex;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.fill();
      });
    }

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
        // Draw bright territory indicator
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(x + 1, y + 1, size - 2, size - 2);
        
        // Add empire flag
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x + size - 10, y + 2, 8, 5);
      }
    }
  };

  // Main render function
  const renderCurrentView = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Only overpaint the canvas for universe/galaxy.
    // Region/System are fully rendered by their own components to avoid being wiped each frame.
    if (zoomLevel === 'universe' || zoomLevel === 'galaxy') {
      // Clear canvas with space background
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, canvasSize.width, canvasSize.height);

      // Draw star field background
      drawStarField(ctx);

      if (zoomLevel === 'universe') {
        drawUniverseView(ctx);
      } else {
        drawGalaxyView(ctx);

        // Hover tooltip for region index
        if (hoveredRegion !== null) {
          const label = `R${hoveredRegion.toString().padStart(2, '0')}`;
          ctx.font = '12px monospace';
          const padding = 4;
          const metrics = ctx.measureText(label);
          const boxW = metrics.width + padding * 2;
          const boxH = 18;
          let tx = mousePosition.x + 12;
          let ty = mousePosition.y - 12;
          if (tx + boxW > canvasSize.width) tx = canvasSize.width - boxW - 4;
          if (ty - boxH < 0) ty = boxH + 4;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(tx, ty - boxH, boxW, boxH);
          ctx.strokeStyle = 'rgba(255,255,255,0.8)';
          ctx.strokeRect(tx, ty - boxH, boxW, boxH);
          ctx.fillStyle = 'rgba(255,255,255,0.95)';
          ctx.fillText(label, tx + padding, ty - 5);
        }
      }
    }
  };

  // Animation loop
  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      renderCurrentView();
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [zoomLevel, viewport, selectedCoordinate, showGrid, showTerritories, showFleets, showResources, canvasSize, regionDataVersion]);

  // Star info panel derivation for system view
  let starPanel: React.ReactNode = null;
  if (zoomLevel === 'system' && selectedCoordinate) {
    const systemKey = `${selectedCoordinate.server}${selectedCoordinate.galaxy}:${selectedCoordinate.region}:${selectedCoordinate.system}`;
    const cachedBodies = systemData.get(systemKey) as any[] | undefined;
    const hasStar = cachedBodies ? cachedBodies.length > 0 : undefined;

    // Read server-provided starOverhaul from the star (body 00)
    let starOverhaul: any | undefined = undefined;
    if (Array.isArray(cachedBodies) && cachedBodies.length > 0) {
      const starBody = cachedBodies.find((b: any) => b?.type === 'star');
      if (starBody && starBody.starOverhaul) {
        starOverhaul = starBody.starOverhaul;
      }
    }

    const coordText = `${selectedCoordinate.server}${selectedCoordinate.galaxy.toString().padStart(2, '0')}:${selectedCoordinate.region.toString().padStart(2, '0')}:${selectedCoordinate.system.toString().padStart(2, '0')}`;
    // No MK spectral computation; show Overhaul kind only
    starPanel = (<StarInfoPanel coord={coordText} hasStar={hasStar} starOverhaul={starOverhaul} />);
  }

  return (
    <div ref={containerRef} className="relative w-full h-full bg-gray-900 overflow-hidden">


      {/* Main Canvas */}
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredRegion(null)}
        onClick={handleCanvasClick}
      />

      {/* Region View Component - renders to canvas */}
      {zoomLevel === 'region' && canvasReady && (
        <RegionView
          canvas={canvasRef.current!}
          selectedCoordinate={selectedCoordinate}
          showTerritories={showTerritories}
        />
      )}

      {/* System View Component - renders to canvas */}
      {zoomLevel === 'system' && canvasReady && (
        <SystemView
          canvas={canvasRef.current!}
          selectedCoordinate={selectedCoordinate}
          empire={empire}
          showResources={showResources}
          serverBodies={
            selectedCoordinate
              ? (systemData.get(`${selectedCoordinate.server}${selectedCoordinate.galaxy}:${selectedCoordinate.region}:${selectedCoordinate.system}`) as any[] | undefined)
              : undefined
          }
        />
      )}

      {starPanel}

      {/* Location Tooltip */}
      {hoveredLocation && (
        <LocationTooltip 
          location={hoveredLocation}
          position={mousePosition}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="text-white text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Loading universe data...</p>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="absolute top-32 left-1/2 transform -translate-x-1/2 bg-red-900 border border-red-700 text-red-200 px-4 py-2 rounded-md z-30">
          <div className="flex items-center gap-2">
            <span>⚠️ {error}</span>
            <button 
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-200"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <button
          onClick={zoomIn}
          className="w-10 h-10 bg-gray-800 border border-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center justify-center"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={zoomOut}
          className="w-10 h-10 bg-gray-800 border border-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center justify-center"
          title="Zoom Out"
        >
          −
        </button>
      </div>
    </div>
  );
};

export default UniverseMap;
