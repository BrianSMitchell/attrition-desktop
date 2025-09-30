import * as React from 'react';
import * as PIXI from 'pixi.js'
import { MapEngine } from './MapEngine';
import { ViewManager } from './views/ViewManager';
import { ViewCoordinator } from './views/ViewCoordinator';
import { parseCoordinate } from './data/mapDataLoader';
import useUniverseMapStore, { type UniverseMapState } from '../../../stores/universeMapStore';
import type { MapLocation, MapViewLevel } from './types';
import spaceBackgroundAvifUrl from '../../../assets/images/space-background.avif';
import spaceBackgroundWebpUrl from '../../../assets/images/space-background.webp';
import spaceBackgroundPngUrl from '../../../assets/images/space-background.png';

export interface UniverseMapProps {
  initialView?: { level: MapViewLevel; coord?: string };
  renderOptions?: { backgroundEnabled?: boolean; effectsEnabled?: boolean };
  userRegions?: Array<{ region: number; type: 'base' | 'occupation' | 'home'; count?: number }>;
  onSelectLocation?: (location: MapLocation) => void;
  onHoverLocation?: (location: MapLocation | null) => void;
  onZoomChange?: (zoom: number) => void;
  onViewChange?: (level: MapViewLevel, coord?: string) => void;
}

export interface UniverseMapRef {
  centerOn: (x: number, y: number) => void;
  transitionTo: (level: MapViewLevel, x: number, y: number) => Promise<void>;
  setZoom: (zoom: number) => void;
}

/**
 * Thin React wrapper around the Pixi-based MapEngine.
 * - Initializes MapEngine on mount; destroys on unmount (no leaks)
 * - Wires viewport events to typed callbacks
 * - Exposes small imperative API via ref for navigation
 * - Drawing is owned by Pixi; React does not drive the render loop
 */
const UniverseMap = React.forwardRef<UniverseMapRef, UniverseMapProps>(
  (
    {
      initialView,
      // renderOptions, // Temporarily commented out
      userRegions,
      onSelectLocation,
      onHoverLocation,
      onZoomChange,
      onViewChange
    },
    ref
  ) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const engineRef = React.useRef<MapEngine | null>(null);
    const viewManagerRef = React.useRef<ViewManager | null>(null);
    const viewCoordinatorRef = React.useRef<ViewCoordinator | null>(null);

    // Handlers need stable identity for add/remove
    const zoomHandlerRef = React.useRef<(() => void) | null>(null);
    const movedHandlerRef = React.useRef<(() => void) | null>(null);
    const pointerMoveHandlerRef = React.useRef<((e: any) => void) | null>(null);
    const pointerTapHandlerRef = React.useRef<((e: any) => void) | null>(null);
    
    // Store callback functions in refs to avoid useEffect re-initialization
    const onSelectLocationRef = React.useRef(onSelectLocation);
    const onHoverLocationRef = React.useRef(onHoverLocation);
    const onViewChangeRef = React.useRef(onViewChange);
    const onZoomChangeRef = React.useRef(onZoomChange);

    // Removed geometry cache - handled by ViewCoordinator

    // Dev-only HUD flag
const DEBUG = false; // Disabled to avoid import.meta issues
  const Graphics = PIXI.Graphics;

// Lightweight profiler HUD state (updated on a throttled timer)
  const [hud, setHud] = React.useState<{
    fps?: number;
    zoom: number;
    center: { x: number; y: number };
    layers: { bg: number; entities: number; effects: number; ui: number };
  }>({
    zoom: 1,
    center: { x: 0, y: 0 },
    layers: { bg: 0, entities: 0, effects: 0, ui: 0 }
  });

  const samplerRef = React.useRef<number | null>(null);

  // Connect to the universe map store
  const storeZoomLevel = useUniverseMapStore((state: UniverseMapState) => state.zoomLevel);
  const storeSelectedCoordinate = useUniverseMapStore((state: UniverseMapState) => state.selectedCoordinate);

  // Handle userRegions updates separately
  React.useEffect(() => {
    if (viewCoordinatorRef.current && userRegions) {
      console.log('[UniverseMap] Updating user regions:', userRegions);
      viewCoordinatorRef.current.setUserRegions(userRegions);
    }
  }, [userRegions]);

 // Deduplicate and order store-driven updates to avoid flicker/race conditions
  const lastAppliedRef = React.useRef<{ level: MapViewLevel | null; coordKey: string | null }>({ level: null, coordKey: null });

  // Listen to store view level changes and update the coordinator
  React.useEffect(() => {
    const vc = viewCoordinatorRef.current;
    console.log('[UniverseMap] Store listener triggered:', {
      hasViewCoordinator: !!vc,
      storeZoomLevel,
      storeSelectedCoordinate
    });
    if (!vc || !storeZoomLevel) {
      console.log('[UniverseMap] Skipping store update - conditions not met');
      return;
    }

    const viewLevel: MapViewLevel = storeZoomLevel === 'universe' ? 'universe' :
                                   storeZoomLevel === 'galaxy' ? 'galaxy' :
                                   storeZoomLevel === 'region' ? 'region' : 'system';

    const coordKey = storeSelectedCoordinate
      ? `${storeSelectedCoordinate.server || 'A'}:${storeSelectedCoordinate.galaxy}:${storeSelectedCoordinate.region}:${storeSelectedCoordinate.system}`
      : 'none';

    const last = lastAppliedRef.current;
    const shouldUpdate = last.level !== viewLevel || last.coordKey !== coordKey;

    console.log('[UniverseMap] ===== STORE CHANGE ANALYSIS =====');
    console.log('[UniverseMap] Processing store change:', { 
      viewLevel, 
      coordKey, 
      shouldUpdate,
      lastLevel: last.level,
      lastCoordKey: last.coordKey,
      levelChanged: last.level !== viewLevel,
      coordChanged: last.coordKey !== coordKey
    });

    if (!shouldUpdate) {
      console.log('[UniverseMap] No update needed, skipping view change');
      console.log('[UniverseMap] ===== STORE CHANGE SKIPPED =====');
      return;
    }

    console.log('[UniverseMap] Update needed, proceeding with view change');
    // Update context first when coord present
    if (storeSelectedCoordinate) {
      console.log('[UniverseMap] Updating context with store coordinate:', storeSelectedCoordinate);
      vc.setContext(
        storeSelectedCoordinate.server || 'A',
        storeSelectedCoordinate.galaxy,
        storeSelectedCoordinate.region,
        storeSelectedCoordinate.system
      );
      console.log('[UniverseMap] Context updated successfully');
    } else {
      console.log('[UniverseMap] No store coordinate available, skipping context update');
    }

    console.log('[UniverseMap] Calling setCurrentView immediately for level:', viewLevel);
    console.log('[UniverseMap] ViewCoordinator current level before change:', vc.getCurrentViewLevel());
    
    // Execute view change immediately without debounce
    vc.setCurrentView(viewLevel)
      .then(() => {
        console.log('[UniverseMap] Successfully changed view to:', viewLevel);
        console.log('[UniverseMap] ViewCoordinator level after change:', vc.getCurrentViewLevel());
        lastAppliedRef.current = { level: viewLevel, coordKey };
        console.log('[UniverseMap] Updated lastAppliedRef to:', lastAppliedRef.current);
        console.log('[UniverseMap] ===== NAVIGATION SUCCESS =====');
      })
      .catch((error) => {
        console.error('[UniverseMap] Failed to change view:', error);
        console.log('[UniverseMap] ===== NAVIGATION FAILED =====');
      });
  }, [storeZoomLevel, storeSelectedCoordinate]);

  // Update callback refs on each render
  React.useEffect(() => {
    onSelectLocationRef.current = onSelectLocation;
    onHoverLocationRef.current = onHoverLocation;
    onViewChangeRef.current = onViewChange;
    onZoomChangeRef.current = onZoomChange;
  });

  // Initialize engine once on mount
  React.useEffect(() => {
    console.log('[UniverseMap] Initializing with callbacks:', {
      hasOnSelectLocation: !!onSelectLocationRef.current,
      hasOnHoverLocation: !!onHoverLocationRef.current
    });
    
    const el = containerRef.current;
    if (!el) {
      console.warn('[UniverseMap] Container element not found');
      return;
    }

    // Compute initial bounds
    const bounds = el.getBoundingClientRect();
    console.log('[UniverseMap] Initializing with bounds:', bounds);

    // Create engine
    try {
      const engine = new MapEngine({
        containerId: 'universe-map', // Note: requires unique usage per page; consider ID param for multiple instances
        width: bounds.width || 800,
        height: bounds.height || 600
      });
      engineRef.current = engine;

      // Initialize into the container element by id (engine API expects id)
      engine.initialize('universe-map');
      console.log('[UniverseMap] Engine initialized successfully');
    } catch (error) {
      console.error('[UniverseMap] Failed to initialize engine:', error);
      return;
    }

    const engine = engineRef.current!;

    // Create view manager
    try {
      const vm = new ViewManager({
        viewport: engine.getViewport(),
        width: bounds.width || 800,
        height: bounds.height || 600
      });
      viewManagerRef.current = vm;
      console.log('[UniverseMap] ViewManager created successfully');

      // Create view coordinator with wrapped callbacks OR update existing one
      const wrappedOnSelectLocation = (location: MapLocation) => {
        // Always forward to parent first
        if (onSelectLocationRef.current) {
          console.log('[UniverseMap] Location selected (forwarding to parent):', location);
          onSelectLocationRef.current(location);
        }

        // Proactively switch Pixi view so UI updates immediately on click
        try {
          const vcRef = viewCoordinatorRef.current;
          if (!vcRef) return;

          // Derive server from store (fallback to 'A')
          const storeState = useUniverseMapStore.getState();
          const server = storeState.selectedCoordinate?.server || 'A';

          if (location.level === 'galaxy' && typeof location.galaxy === 'number') {
            vcRef.setContext(server, location.galaxy, 0, 0);
            vcRef.setCurrentView('galaxy');
          } else if (location.level === 'region' && typeof location.galaxy === 'number' && location.region) {
            const regionNum = parseInt(location.region, 10) || 0;
            vcRef.setContext(server, location.galaxy, regionNum, 0);
            vcRef.setCurrentView('region');
          } else if (
            location.level === 'system' &&
            typeof location.galaxy === 'number' &&
            location.region &&
            location.system
          ) {
            const regionNum = parseInt(location.region, 10) || 0;
            const systemNum = parseInt(location.system, 10) || 0;
            vcRef.setContext(server, location.galaxy, regionNum, systemNum);
            vcRef.setCurrentView('system');
          }
        } catch (e) {
          console.warn('[UniverseMap] Immediate view switch failed:', e);
        }
      };
      
      const wrappedOnHoverLocation = onHoverLocationRef.current ? (location: MapLocation | null) => {
        console.log('[UniverseMap] Region hovered:', location);
        onHoverLocationRef.current!(location);
      } : undefined;
      
      // Check if we can reuse existing ViewCoordinator
      if (viewCoordinatorRef.current) {
        console.log('[UniverseMap] Reusing existing ViewCoordinator and updating engine references');
        const vc = viewCoordinatorRef.current;
        vc.updateAllEngines(engine);
        console.log('[UniverseMap] ViewCoordinator engine references updated successfully');
      } else {
        console.log('[UniverseMap] Creating new ViewCoordinator');
        const vc = new ViewCoordinator(engine, vm, wrappedOnSelectLocation, wrappedOnHoverLocation);
        viewCoordinatorRef.current = vc;
        console.log('[UniverseMap] ViewCoordinator created successfully with wrapped callbacks');
      }
    } catch (error) {
      console.error('[UniverseMap] Failed to initialize view managers:', error);
      return;
    }

    const vm = viewManagerRef.current!;
    const vc = viewCoordinatorRef.current!;

    // Set initial context if provided
    if (initialView?.coord) {
      console.log('[UniverseMap] Parsing initial coordinate:', initialView.coord);
      const components = parseCoordinate(initialView.coord);
      console.log('[UniverseMap] Parsed components:', components);
      if (components) {
        console.log('[UniverseMap] Setting context:', {
          server: components.server,
          galaxy: components.galaxy,
          region: components.region,
          system: components.system
        });
        vc.setContext(
          components.server,
          components.galaxy,
          components.region,
          components.system
        );
      }
    }
    
    // Set user regions for highlighting
    if (userRegions && userRegions.length > 0) {
      vc.setUserRegions(userRegions);
      console.log('[UniverseMap] Set user regions:', userRegions);
    }

    // Create enhanced cosmic background - FORCE ENABLED FOR TESTING
    const background = engine.getLayer('background');
    if (background) {
      console.log('[UniverseMap] ===== CREATING COSMIC BACKGROUND =====');
      console.log('[UniverseMap] Background layer found:', !!background);
      console.log('[UniverseMap] Canvas dimensions:', { width: bounds.width, height: bounds.height });
      
      try {
        // Force create enhanced cosmic background with new features
        console.log('[UniverseMap] Creating enhanced BackgroundManager...');
        const preferredBg = spaceBackgroundAvifUrl || spaceBackgroundWebpUrl || spaceBackgroundPngUrl;

        // Dynamically import BackgroundManager to further defer heavy effects
        (async () => {
          const bmPath = './effects/BackgroundManager';
          const mod = await import(/* @vite-ignore */ bmPath);
          const BackgroundManager = (mod.BackgroundManager ?? mod.default);
          const backgroundManager = new BackgroundManager({
            width: bounds.width,
            height: bounds.height,
            starCount: 180,  // Increased for multi-layer effect
            nebulaCount: 6,  // Enable nebula effects
            backgroundImagePath: preferredBg,
            enableParallax: true,
            enableAdvancedEffects: true
          });
          
          console.log('[UniverseMap] BackgroundManager created, getting container...');
          const bgContainer = backgroundManager.getContainer();
          console.log('[UniverseMap] Background container:', {
            exists: !!bgContainer,
            children: bgContainer?.children?.length || 0,
            visible: bgContainer?.visible,
            alpha: bgContainer?.alpha
          });
          
          // Add background container to the background layer
          background.addChild(bgContainer);
          console.log('[UniverseMap] Background container added to background layer');
          console.log('[UniverseMap] Background layer children count:', background.children.length);
          
          // Store reference on engine for ticker updates
          (engine as any).backgroundManager = backgroundManager;
          console.log('[UniverseMap] Background manager stored on engine:', !!(engine as any).backgroundManager);
          
          // Wait for background to fully initialize
          try {
            await backgroundManager.getInitializationPromise();
            console.log('[UniverseMap] ===== BACKGROUND FULLY INITIALIZED =====');
            const finalContainer = backgroundManager.getContainer();
            console.log('[UniverseMap] Final container state:', {
              children: finalContainer.children.length,
              visible: finalContainer.visible,
              alpha: finalContainer.alpha,
              position: { x: finalContainer.x, y: finalContainer.y }
            });
          } catch (error) {
            console.error('[UniverseMap] Background initialization failed:', error);
          }
          
          console.log('[UniverseMap] ===== COSMIC BACKGROUND SETUP COMPLETE =====');
        })().catch((error) => {
          console.error('[UniverseMap] ===== BACKGROUND CREATION FAILED =====');
          console.error('[UniverseMap] Error:', error);
          // Create a simple test background to verify the layer works
          console.log('[UniverseMap] Creating test background...');
          const testBg = new Graphics();
          testBg.beginFill(0x001122, 0.8); // Dark blue for visibility
          testBg.drawRect(0, 0, bounds.width, bounds.height);
          testBg.endFill();
          background.addChild(testBg);
          console.log('[UniverseMap] Test background created and added');
        });
      } catch (error) {
        console.error('[UniverseMap] ===== BACKGROUND CREATION FAILED (sync) =====');
        console.error('[UniverseMap] Error:', error);
        const testBg = new Graphics();
        testBg.beginFill(0x001122, 0.8);
        testBg.drawRect(0, 0, bounds.width, bounds.height);
        testBg.endFill();
        background.addChild(testBg);
      }
    } else {
      console.error('[UniverseMap] Background layer not found!');
    }

    // Start the engine
    try {
      engine.start();
      console.log('[UniverseMap] Engine started successfully');

      // Center the viewport on world origin initially  
      const vp = engine.getViewport();
      
      // Static maps: lock scale at 1 and center
      vp.setScale(1);
      vp.moveCenter(0, 0);
      
      // Log viewport state for debugging
      console.log('[UniverseMap] Viewport configured:', {
        center: { x: vp.center.x, y: vp.center.y },
        scale: vp.scale.x,
        // worldWidth/worldHeight not available in SimpleViewport
        screenWidth: vp.screenWidth,
        screenHeight: vp.screenHeight
      });

      // Set initial view level - ensure proper initialization
      const viewLevel = initialView?.level || 'universe';
      console.log('[UniverseMap] ===== INITIAL VIEW SETUP =====');
      console.log('[UniverseMap] Initial view prop:', initialView);
      console.log('[UniverseMap] Resolved view level:', viewLevel);
      console.log('[UniverseMap] Store selected coordinate at initialization:', storeSelectedCoordinate);
      console.log('[UniverseMap] Store zoom level at initialization:', storeZoomLevel);
      
      // Ensure viewport is properly sized before setting initial view
      const ensureViewportReady = () => {
        return new Promise<void>((resolve) => {
          const checkViewport = () => {
            const vp = engine.getViewport();
            const screenWidth = (vp as any)?.screenWidth ?? 0;
            const screenHeight = (vp as any)?.screenHeight ?? 0;
            if (screenWidth > 0 && screenHeight > 0) {
              console.log('[UniverseMap] Viewport ready with dimensions:', { screenWidth, screenHeight });
              resolve();
            } else {
              console.log('[UniverseMap] Viewport not ready, checking again in 50ms');
              setTimeout(checkViewport, 50);
            }
          };
          checkViewport();
        });
      };

      ensureViewportReady()
        .then(() => {
          console.log('[UniverseMap] Setting initial view:', viewLevel);
          // Force render by temporarily setting current view level to something else
          console.log('[UniverseMap] Forcing view render by temporarily changing level');
          const tempLevel = vc.getCurrentViewLevel() === 'universe' ? 'galaxy' : 'universe';
          (vc as any).currentViewLevel = tempLevel; // Temporarily change the level to force re-render
          console.log('[UniverseMap] Temporarily set level to:', tempLevel);
          return vc.setCurrentView(viewLevel);
        })
        .then(() => {
          console.log('[UniverseMap] Initial view set successfully');
          // Force center the viewport again after view is set
          try {
            const currentVp = engine.getViewport();
            if (currentVp) {
              currentVp.moveCenter(0, 0);
              console.log('[UniverseMap] Re-centered viewport after view initialization');
            }
          } catch (vpError) {
            console.warn('[UniverseMap] Could not re-center viewport:', vpError);
          }
        })
        .catch((error) => {
          console.error('[UniverseMap] Failed to set initial view:', error);
          // Fallback: try to set view anyway
          console.log('[UniverseMap] Attempting fallback view setup');
          vc.setCurrentView(viewLevel)
            .then(() => {
              console.log('[UniverseMap] Fallback view set successfully');
            })
            .catch((fallbackError) => {
              console.error('[UniverseMap] Fallback view setup also failed:', fallbackError);
            });
        });
    } catch (error) {
      console.error('[UniverseMap] Failed to start engine:', error);
    }

    // Wire viewport events (already have vp from above)

    // Dev-only: set up HUD sampling using MapEngine's ticker
    if (DEBUG) {
      engine.setHudSampleHandler(() => {
        try {
          const app = engine.getApp();
          const vp = engine.getViewport();
          
          const center = vp.center;
          const bg = engine.getLayer('background')?.children.length || 0;
          const en = engine.getLayer('entities')?.children.length || 0;
          const ef = engine.getLayer('effects')?.children.length || 0;
          const ui = engine.getLayer('ui')?.children.length || 0;
          const fps = (app as any)?.ticker?.FPS ?? undefined;

          setHud({
            zoom: vp.scale.x,
            center: { x: center.x, y: center.y },
            layers: { bg, entities: en, effects: ef, ui },
            fps: typeof fps === 'number' ? Math.round(fps) : undefined
          });
        } catch {
          // ignore sampling errors
        }
      });
    }

    // Zoom event
    const onZoomed = () => {
      try {
        const currentVp = engine.getViewport();
        onZoomChangeRef.current?.(currentVp.scale.x);
      } catch {
        // ignore if viewport not available
      }
    };
    // SimpleViewport does not emit 'zoomed' currently
    zoomHandlerRef.current = onZoomed;

    // Movement event - notify view change without coord mapping yet
    const onMoved = () => {
      // For now, propagate current level and undefined coord
      onViewChangeRef.current?.(vm.getCurrentLevel(), initialView?.coord);
    };
    // SimpleViewport does not emit 'moved' currently
    movedHandlerRef.current = onMoved;

    // Apply initial view (optional)
    if (initialView) {
      // We don't parse coord here; leave mapping to page container if needed
      onViewChangeRef.current?.(initialView.level, initialView.coord);
    }

    // Cleanup (resource lifecycle / disposal checklist)
    return () => {
      // Stop HUD sampler (if any)
      if (samplerRef.current) {
        clearTimeout(samplerRef.current);
        samplerRef.current = null;
      }
      if (DEBUG) {
        try {
          // eslint-disable-next-line no-console
          console.debug('UniverseMap destroyed');
        } catch {
          // noop
        }
      }
      try {
        // Clean up background manager
        const backgroundManager = (engine as any).backgroundManager;
        if (backgroundManager && typeof backgroundManager.destroy === 'function') {
          console.log('[UniverseMap] Destroying background manager');
          backgroundManager.destroy();
          (engine as any).backgroundManager = null;
        }
        
        // Remove viewport listeners
        try {
          const currentVp = engine.getViewport();
          if (zoomHandlerRef.current) currentVp.off('zoomed', zoomHandlerRef.current);
          if (movedHandlerRef.current) currentVp.off('moved', movedHandlerRef.current);
          if (pointerMoveHandlerRef.current) currentVp.off('pointermove', pointerMoveHandlerRef.current);
          if (pointerTapHandlerRef.current) currentVp.off('pointertap', pointerTapHandlerRef.current);
        } catch {
          // ignore if viewport not available
        }
      } catch {
        // noop
      }
      try {
        viewManagerRef.current?.destroy();
      } catch {
        // noop
      }
      try {
        viewCoordinatorRef.current?.destroy();
      } catch {
        // noop
      }
      try {
        engine.destroy();
      } finally {
        engineRef.current = null;
        viewManagerRef.current = null;
        viewCoordinatorRef.current = null;
        zoomHandlerRef.current = null;
        movedHandlerRef.current = null;
      }
    };
  }, []); // Empty deps to prevent re-initialization - callbacks are stored in refs and updated dynamically

    // Expose imperative API
    React.useImperativeHandle(
      ref,
      () => ({
        centerOn: (x: number, y: number) => {
          viewManagerRef.current?.centerOn(x, y, false);
        },
        transitionTo: async (level: MapViewLevel, x: number, y: number) => {
          await viewManagerRef.current?.transitionTo(level, x, y);
          await viewCoordinatorRef.current?.setCurrentView(level);
          onViewChange?.(level, undefined);
        },
        setZoom: (zoom: number) => {
          viewManagerRef.current?.setZoom(zoom, false);
          onZoomChange?.(zoom);
        }
      }),
      [onViewChange, onZoomChange]
    );

    return (
      <div
        id="universe-map"
        ref={containerRef}
        className="w-full h-full bg-gray-900"
        style={{ position: 'relative' }}
      >
        {DEBUG && (
          <div
            className="absolute top-2 left-2 z-50 text-xs bg-black/60 text-green-300 px-2 py-1 rounded shadow"
            style={{ pointerEvents: 'none', lineHeight: 1.35 }}
          >
            <div>Map-Next HUD</div>
            {typeof hud.fps === 'number' && <div>FPS: {hud.fps}</div>}
            <div>Zoom: {hud.zoom.toFixed(2)}</div>
            <div>
              Center: {hud.center.x.toFixed(1)}, {hud.center.y.toFixed(1)}
            </div>
            <div>
              Layers — bg:{hud.layers.bg} en:{hud.layers.entities} ef:{hud.layers.effects} ui:{hud.layers.ui}
            </div>
          </div>
        )}
      </div>
    );
  }
);

UniverseMap.displayName = 'UniverseMap';

export default UniverseMap;
