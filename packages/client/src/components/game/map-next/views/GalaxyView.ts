import * as PIXI from 'pixi.js';

type TContainer = InstanceType<typeof PIXI.Container>;
type TGraphics = InstanceType<typeof PIXI.Graphics>;
import { MapEngine } from '../MapEngine';
import { ViewManager } from './ViewManager';
import { MapLocation } from '../types';
import { loadGalaxyData } from '../data/mapDataLoader';
import type { GalaxyRegionSummariesData, UniverseRegionSystemsData } from '../data/mapDataLoader';
import universeService from '../../../../services/universeService';

export class GalaxyView {
  private engine: MapEngine;
  private container: TContainer;
  private starSystems: Map<string, TContainer> = new Map();
  private regionData: Map<number, UniverseRegionSystemsData> = new Map(); // Cache region data
  private server: string = 'default';
  private galaxy: number = 0;
  private isLoading: boolean = false;
  private onSelectLocation?: (location: MapLocation) => void;
  private onHoverLocation?: (location: MapLocation | null) => void;
  private userRegions: Map<number, { type: 'base' | 'occupation' | 'home'; count: number }> = new Map(); // Regions where user has presence

  constructor(
    engine: MapEngine, 
    _viewManager: ViewManager,
    onSelectLocation?: (location: MapLocation) => void,
    onHoverLocation?: (location: MapLocation | null) => void
  ) {
    this.engine = engine;
    this.container = new PIXI.Container();
    this.container.name = 'galaxy-view';
    this.container.visible = false;
    this.onSelectLocation = onSelectLocation;
    this.onHoverLocation = onHoverLocation;
    
    console.log('[GalaxyView] Initialized with callbacks:', {
      hasOnSelectLocation: !!onSelectLocation,
      hasOnHoverLocation: !!onHoverLocation
    });
  }

  public setGalaxyContext(server: string, galaxy: number): void {
    console.log('[GalaxyView] Setting galaxy context:', { server, galaxy });
    this.server = server;
    this.galaxy = galaxy;
  }

  /**
   * Updates the engine reference to prevent stale reference bugs when React re-mounts UniverseMap
   */
  public updateEngine(newEngine: MapEngine): void {
    console.log('[GalaxyView] Updating engine reference to new MapEngine instance');
    this.engine = newEngine;
    
    // Re-initialize the container with the new engine's entities layer if needed
    const currentParent = this.container.parent;
    if (currentParent) {
      console.log('[GalaxyView] Removing container from old engine layer');
      currentParent.removeChild(this.container);
    }
    
    // Add to new engine's entities layer
    const newLayer = newEngine.getLayer('entities');
    if (newLayer) {
      console.log('[GalaxyView] Adding container to new engine entities layer');
      newLayer.addChild(this.container);
    } else {
      console.warn('[GalaxyView] New engine entities layer not found');
    }
  }
  
  public setVisible(visible: boolean): void {
    console.log('[GalaxyView] ===== SETTING VISIBILITY =====');
    console.log('[GalaxyView] Current visibility:', this.container.visible);
    console.log('[GalaxyView] Requested visibility:', visible);
    console.log('[GalaxyView] Container children count:', this.container.children.length);
    console.log('[GalaxyView] Container has parent:', !!this.container.parent);
    
    this.container.visible = visible;
    console.log('[GalaxyView] Container visibility set to:', visible);
    
    if (visible) {
      // Ensure viewport is centered and properly scaled
      const viewport = this.engine.getViewport();
      viewport.moveCenter(0, 0);
      (viewport as any).setScale?.(1);
      
      // Ensure container positioning and rendering properties
      this.container.position.set(0, 0);
      this.container.renderable = true;
      this.container.alpha = 1.0;
      
      // Ensure all parent containers up the hierarchy are visible
      let parent = this.container.parent;
      while (parent) {
        if (!parent.visible) {
          parent.visible = true;
        }
        parent = parent.parent;
      }
    }
  }
  
  public setUserRegions(regions: Array<{ region: number; type: 'base' | 'occupation' | 'home'; count?: number }>): void {
    this.userRegions.clear();
    regions.forEach(({ region, type, count = 1 }) => {
      this.userRegions.set(region, { type, count });
    });
    console.log('[GalaxyView] User regions set:', Array.from(this.userRegions.entries()));
    
    // Re-render to apply highlighting immediately if we have regions rendered
    if (this.starSystems.size > 0) {
      console.log('[GalaxyView] Re-rendering to apply user region highlighting');
      this.render().catch(error => console.error('[GalaxyView] Re-render failed:', error));
    }
  }

  public initialize(): void {
    console.log('[GalaxyView] Initializing galaxy view');
    // Get the entities layer from engine (don't create new layers)
    console.log('[GalaxyView] Getting entities layer from engine...');
    const layer = this.engine.getLayer('entities');
    console.log('[GalaxyView] Got entities layer:', layer?.name, 'layer parent:', layer?.parent?.name);
    if (layer) {
      console.log('[GalaxyView] Adding container to entities layer...');
      layer.addChild(this.container);
      console.log('[GalaxyView] Added container to entities layer');
      console.log('[GalaxyView] Container parent after adding:', this.container.parent?.name);
      console.log('[GalaxyView] Layer children count after adding:', layer.children.length);
      
      // Ensure the container is properly configured for rendering
      this.container.visible = false; // Start hidden, ViewCoordinator will show it
      this.container.sortableChildren = true;
      this.container.position.set(0, 0); // Ensure proper positioning
      
      // Make container interactive
      ;(this.container as any).eventMode = 'auto';
      
    } else {
      console.error('[GalaxyView] Entities layer not found!');
    }
  }

  public async render(): Promise<void> {
    console.log('[GalaxyView] Starting render, server:', this.server, 'galaxy:', this.galaxy);
    
    // CRITICAL DEBUG: Check engine and its methods
    console.log('[GalaxyView] ===== ENGINE DEBUG =====');
    console.log('[GalaxyView] Engine exists:', !!this.engine);
    console.log('[GalaxyView] Engine getViewport method exists:', !!this.engine?.getViewport);
    console.log('[GalaxyView] Engine getApp method exists:', !!this.engine?.getApp);
    
    const viewport = this.engine.getViewport();
    const app = this.engine.getApp();
    
    console.log('[GalaxyView] Viewport exists:', !!viewport);
    console.log('[GalaxyView] App exists:', !!app);
    console.log('[GalaxyView] App.ticker exists:', !!app?.ticker);
    
    if (viewport) {
      console.log('[GalaxyView] Viewport properties:', {
        scale: viewport.scale,
        center: viewport.center,
        screenWidth: viewport.screenWidth,
        screenHeight: viewport.screenHeight,
        interactive: viewport.interactive
      });
    }
    
    if (app) {
      console.log('[GalaxyView] App properties:', {
        stage: !!app.stage,
        renderer: !!app.renderer,
        ticker: !!app.ticker,
        view: !!app.view
      });
    }
    console.log('[GalaxyView] ===== END ENGINE DEBUG =====');
    
    // Clear existing star systems
    this.container.removeChildren();
    this.starSystems.clear();

    // Load real galaxy data
    await this.loadGalaxyData();
    console.log('[GalaxyView] Render complete, star systems:', this.starSystems.size);
    
    // CRITICAL: Set container visible immediately after adding children
    // This ensures worldVisible is properly calculated for all children
    this.container.visible = true;
    this.container.renderable = true;
    this.container.alpha = 1.0;
    console.log('[GalaxyView] Container visibility set to true after render');
    
    // After rendering, ensure viewport is properly centered and force an update
    try {
      // Check if engine is still valid before accessing viewport
      try {
        const freshViewport = this.engine.getViewport();
        if (freshViewport && freshViewport.scale !== null && freshViewport.scale !== undefined) {
          console.log('[GalaxyView] Attempting to center viewport at (0,0)');
          freshViewport.moveCenter(0, 0);
          console.log('[GalaxyView] Viewport centered successfully');
        } else {
          console.warn('[GalaxyView] Viewport scale is null, skipping moveCenter');
          console.warn('[GalaxyView] Viewport scale value:', freshViewport?.scale);
          // Try alternative centering approach
          if (freshViewport && freshViewport.center) {
            console.log('[GalaxyView] Trying alternative viewport centering via center.set');
            freshViewport.center.set(0, 0);
          }
        }
      } catch (engineError) {
        console.warn('[GalaxyView] Cannot center viewport - engine is destroyed. Skipping centering.', engineError);
      }
    } catch (error) {
      console.error('[GalaxyView] Failed to center viewport:', error);
    }
    
    // Force a render cycle to ensure everything is drawn
    try {
      // Check if engine is still valid before accessing app
      try {
        const freshApp = this.engine.getApp();
        if (freshApp && freshApp.ticker) {
          console.log('[GalaxyView] Attempting to force ticker update');
          freshApp.ticker.update(); // Trigger a frame update
          console.log('[GalaxyView] Ticker update completed');
        } else {
          console.error('[GalaxyView] Cannot force ticker update - app or ticker is null:', {
            app: !!freshApp,
            ticker: !!freshApp?.ticker
          });
        }
      } catch (engineError) {
        console.warn('[GalaxyView] Cannot force ticker update - engine is destroyed. Skipping ticker update.', engineError);
      }
    } catch (error) {
      console.error('[GalaxyView] Failed to update ticker:', error);
    }
    
    try {
      console.log('[GalaxyView] Post-render viewport center:', viewport.center || 'undefined');
    } catch (e) {
      console.warn('[GalaxyView] Post-render viewport debug failed:', e);
    }
  }

  private async loadGalaxyData(): Promise<void> {
    if (this.isLoading) return;
    
    this.isLoading = true;

    console.log('[GalaxyView] ===== LOADING GALAXY DATA =====');
    console.log('[GalaxyView] Server:', this.server);
    console.log('[GalaxyView] Galaxy:', this.galaxy);

    try {
      // Load all star data for the entire galaxy in ONE API call
      const [regionsResponse, starsResponse] = await Promise.all([
        loadGalaxyData(this.server, this.galaxy),
        universeService.getGalaxyRegionStarColors(this.server, this.galaxy)
      ]);
      
      
      if (regionsResponse.success && regionsResponse.data && starsResponse.success && starsResponse.data) {
        // Pre-populate regionData with ALL 100 systems for each region
        // First, initialize all regions with all 100 systems (no star color yet)
        for (let regionNum = 0; regionNum < 100; regionNum++) {
          const allSystems = [];
          for (let systemNum = 0; systemNum < 100; systemNum++) {
            allSystems.push({
              system: systemNum,
              coord: `${this.server}${String(this.galaxy).padStart(2, '0')}:${String(regionNum).padStart(2, '0')}:${String(systemNum).padStart(2, '0')}:00`,
              star: null, // Will be set to full star object if star exists
              hasOwned: false
            });
          }
          this.regionData.set(regionNum, {
            region: {
              server: this.server,
              galaxy: this.galaxy,
              region: regionNum
            },
            systems: allSystems
          });
        }
        
        // Now overlay star color data from the API for systems that have stars
        for (const regionStars of starsResponse.data.regions) {
          const regionData = this.regionData.get(regionStars.region);
          if (regionData) {
            for (const starSystem of regionStars.systems) {
              // Find the matching system in our pre-initialized data and set its star data
              const system = regionData.systems.find(s => s.system === starSystem.system);
              if (system) {
                // Create full star object with color and default spectral class
                // API only provides color, so we default to G-type (like our sun)
                system.star = {
                  spectralClass: 'G' as 'O' | 'B' | 'A' | 'F' | 'G' | 'K' | 'M',
                  color: starSystem.color
                };
              }
            }
          }
        }
        console.log('[GalaxyView] Pre-loaded ALL systems (100 per region) for', this.regionData.size, 'regions, with star colors applied where available');
        await this.createGalaxyRegions(regionsResponse.data);
      } else {
        console.warn('Failed to load galaxy data:', regionsResponse.message, starsResponse.message);
        this.createStarSystems();
      }
    } catch (error) {
      console.error('Error loading galaxy data:', error);
      this.createStarSystems();
    } finally {
      this.isLoading = false;
    }
  }

  private async createGalaxyRegions(data: GalaxyRegionSummariesData): Promise<void> {
    const regions = data.regions;
    console.log('[GalaxyView] Creating enhanced galaxy regions with star systems, count:', regions.length);
    console.log('[GalaxyView] API regions data:', regions.map(r => ({ region: r.region, systems: r.systemsWithStars.length })));
    
    // Check if engine is still valid before proceeding
    let vp;
    try {
      vp = this.engine.getViewport();
    } catch (error) {
      console.error('[GalaxyView] Cannot create regions - engine is destroyed. This indicates a stale reference.', error);
      // Don't throw, just skip region creation gracefully
      console.warn('[GalaxyView] Skipping region creation due to stale engine reference');
      return;
    }
    
    // Always use 10x10 grid layout; compute spacing to fit viewport without zoom
    const gridSize = 10; // Fixed 10x10 grid
    const sw = (vp as any)?.screenWidth ?? 800;
    const sh = (vp as any)?.screenHeight ?? 600;
    const padding = 80; // pixels
    const spacing = Math.min(
      (sw - 2 * padding) / (gridSize - 1),
      (sh - 2 * padding) / (gridSize - 1)
    );
    const startX = -((gridSize - 1) * spacing) / 2;
    const startY = -((gridSize - 1) * spacing) / 2;
    
    // Create regions with proper positioning and embedded star systems
    // Star data was already pre-loaded in loadGalaxyData(), so no API calls needed here
    for (const region of regions) {
      const regionNumber = region.region;
      const regionId = `region_${regionNumber}`;
      
      // Calculate grid position based on region number (0-99)
      // Region 0-9 in top row, 10-19 in second row, etc.
      const row = Math.floor(regionNumber / gridSize);
      const col = regionNumber % gridSize;
      
      const worldX = startX + col * spacing; // col determines X position (left to right) 
      const worldY = startY + row * spacing; // row determines Y position (top to bottom)
      
      console.log('[GalaxyView] Creating enhanced region entity for region', regionNumber, 'at position:', { worldX, worldY });
      
      // Star data is already in this.regionData from pre-loading - no API call needed!
      const regionEntity = this.createEnhancedRegionEntity(regionId, worldX, worldY, regionNumber, region.systemsWithStars.length, spacing);
      regionEntity.position.set(worldX, worldY);
      console.log('[GalaxyView] Adding enhanced region', regionNumber, 'to container');
      this.container.addChild(regionEntity);
      this.starSystems.set(regionId, regionEntity);
      console.log('[GalaxyView] Enhanced region', regionNumber, 'added to container, container children count:', this.container.children.length);
    }
    
    console.log('[GalaxyView] Created', regions.length, 'enhanced regions with embedded star systems in 10x10 grid layout');
    
    // CRITICAL DEBUG: Verify container state after region creation
    console.log('[GalaxyView] ===== POST-RENDER CONTAINER STATE =====');
    console.log('[GalaxyView] Container children count:', this.container.children.length);
    console.log('[GalaxyView] Container visible:', this.container.visible);
    console.log('[GalaxyView] Container renderable:', this.container.renderable);
    console.log('[GalaxyView] Container alpha:', this.container.alpha);
    console.log('[GalaxyView] Container position:', this.container.position.x, this.container.position.y);
    console.log('[GalaxyView] Container parent:', this.container.parent?.name);
    console.log('[GalaxyView] Container parent visible:', this.container.parent?.visible);
    console.log('[GalaxyView] Container worldVisible:', this.container.worldVisible);
    
    // Check a sample region
    const firstRegion = this.container.children[0];
    if (firstRegion) {
      console.log('[GalaxyView] First region name:', firstRegion.name);
      console.log('[GalaxyView] First region visible:', (firstRegion as any).visible);
      console.log('[GalaxyView] First region position:', (firstRegion as any).position?.x, (firstRegion as any).position?.y);
      console.log('[GalaxyView] First region children count:', (firstRegion as any).children?.length);
      console.log('[GalaxyView] First region worldVisible:', (firstRegion as any).worldVisible);
    }
    console.log('[GalaxyView] ===== END POST-RENDER STATE =====');
    
    // Check PIXI app stage visibility
    try {
      const app = this.engine.getApp();
      if (app && app.stage) {
        console.log('[GalaxyView] PIXI App stage visible:', app.stage.visible);
        console.log('[GalaxyView] PIXI App stage children count:', app.stage.children.length);
        console.log('[GalaxyView] PIXI App renderer:', !!app.renderer);
        console.log('[GalaxyView] PIXI App view dimensions:', app.view?.width, 'x', app.view?.height);
      }
    } catch (e) {
      console.warn('[GalaxyView] Could not check PIXI app stage:', e);
    }
  }

  private createEnhancedRegionEntity(id: string, _x: number, _y: number, regionNumber: number, _systemCount: number, regionSpacing: number): any {
    const region = new PIXI.Container();
    region.name = id;
    
    // Create region boundary (square area with clear border)
    const regionSize = regionSpacing; // Fill entire grid space, no gaps
    const userPresence = this.userRegions.get(regionNumber);
    
    console.log('[GalaxyView] Creating enhanced region', regionNumber, 'with size:', regionSize, 'at position:', { _x, _y });
    
    // Determine colors based on user presence type
    let borderColor = 0x333333; // Very subtle dark gray border
    let fillColor = 0x000000; // Pure black fill to blend with space
    let glowColor = 0x444444;
    let borderWidth = 0.5; // Extremely thin border
    
    if (userPresence) {
      borderWidth = 1; // Still thin but slightly more visible for user regions
      switch (userPresence.type) {
        case 'home':
          borderColor = 0xFF8800; // Orange border for home base
          glowColor = 0xFF8C00;
          fillColor = 0x0A0500; // Very subtle orange tint in fill
          break;
        case 'base':
          borderColor = 0x0088FF; // Blue border for regular bases
          glowColor = 0x00BFFF;
          fillColor = 0x000A0A; // Very subtle blue tint in fill
          break;
        case 'occupation':
          borderColor = 0xFF4444; // Red border for occupations
          glowColor = 0xFF4444;
          fillColor = 0x0A0000; // Very subtle red tint in fill
          break;
      }
    }
    
    // Create region background square (minimal fill)
const background = new PIXI.Graphics();
    background.beginFill(fillColor, userPresence ? 0.3 : 0.05); // Very subtle fill
    background.drawRect(-regionSize/2, -regionSize/2, regionSize, regionSize); // Sharp 90-degree corners
    background.endFill();
    ;(background as any).eventMode = 'static'
    background.cursor = 'pointer';
    
    // Create region border (minimal boundary)
const border = new PIXI.Graphics();
    border.lineStyle(borderWidth, borderColor, 0.4); // Very subtle border
    border.drawRect(-regionSize/2, -regionSize/2, regionSize, regionSize); // Sharp corners
    ;(border as any).eventMode = 'static'
    border.cursor = 'pointer';
    
    // Create very subtle glow effect for user regions only
    if (userPresence) {
      // Single subtle glow - no extension beyond region boundary
const glow = new PIXI.Graphics();
      glow.beginFill(glowColor, 0.08); // Very subtle glow
      glow.drawRect(-regionSize/2, -regionSize/2, regionSize, regionSize); // Same size as region, sharp corners
      glow.endFill();
      
      region.addChild(glow);
    }
    
    region.addChild(background);
    region.addChild(border);
    
    // Add star systems within the region boundary
    const regionData = this.regionData.get(regionNumber);
    if (regionData) {
      this.addStarSystemsToRegion(region, regionData, regionSize);
    }
    
    // Add region label (at top of region)
    const label = new PIXI.Text(regionNumber.toString(), {
      fontSize: 11,
      fill: userPresence ? borderColor : 0xAAAAAA,
      align: 'center',
      fontFamily: 'Arial, sans-serif',
      fontWeight: userPresence ? 'bold' : 'normal'
    } as any);
    label.anchor.set(0.5);
    label.position.set(0, -regionSize/2 + 12); // Position at top of region
    
    // Add subtle background to label for better readability
const labelBg = new PIXI.Graphics();
    labelBg.beginFill(0x000000, 0.7);
    labelBg.drawRoundedRect(-12, -7, 24, 14, 3);
    labelBg.endFill();
    labelBg.position.set(0, -regionSize/2 + 12);
    
    region.addChild(labelBg);
    region.addChild(label);
    
    // Set up visibility and interactivity
    region.visible = true;
    region.renderable = true;
    region.alpha = 1.0;
    ;(region as any).eventMode = 'static'
    region.cursor = 'pointer';
    
    console.log('[GalaxyView] Enhanced region', regionNumber, 'created with visibility and', regionData?.systems?.length || 0, 'star systems');
    
    // Add click handler for region (background click)
region.on('pointerdown', (event: any) => {
      // Only handle region clicks, not star system clicks
      if (event.target === background || event.target === border) {
        console.log('[GalaxyView] Region', regionNumber, 'background clicked');
        if (this.onSelectLocation) {
          const locationData = {
            level: 'region' as const,
            galaxy: this.galaxy,
            region: regionNumber.toString(),
            x: _x,
            y: _y
          };
          console.log('[GalaxyView] Calling onSelectLocation with region data:', locationData);
          this.onSelectLocation(locationData);
        }
      }
    });
    
    // Add hover handlers for region - both background and border
    const addHoverHandlers = (element: TGraphics) => {
      element.on('pointerover', () => {
        if (this.onHoverLocation) {
          this.onHoverLocation({
            level: 'region',
            galaxy: this.galaxy,
            region: regionNumber.toString(),
            x: _x,
            y: _y
          });
        }
      });
      
      element.on('pointerout', () => {
        if (this.onHoverLocation) {
          this.onHoverLocation(null);
        }
      });
    };
    
    addHoverHandlers(background);
    addHoverHandlers(border);
    
    return region;
  }
  
  private addStarSystemsToRegion(regionContainer: any, regionData: UniverseRegionSystemsData, regionSize: number): void {
    const systems = regionData.systems;
    const regionNumber = regionData.region.region; // Extract region number from the region object
    
    // Filter to only systems that have actual stars (with color data)
    const systemsWithStars = systems.filter(s => s.star?.color);
    
    console.log('[GalaxyView] ===== STAR RENDERING DEBUG =====');
    console.log('[GalaxyView] Region', regionNumber, '- Total systems:', systems.length);
    console.log('[GalaxyView] Region', regionNumber, '- Systems with stars:', systemsWithStars.length);
    if (systems.length > 0) {
      const sampleSystem = systems[0];
      console.log('[GalaxyView] Region', regionNumber, '- Sample system:', { 
        system: sampleSystem.system, 
        hasStar: !!sampleSystem.star,
        starColor: sampleSystem.star?.color,
        starClass: sampleSystem.star?.spectralClass
      });
    }
    console.log('[GalaxyView] ===== END DEBUG =====');
    
    // Create a smaller grid within the square region boundary
    // Use the same 10x10 approach as RegionView but scaled to fit within regionSize
    const gridSize = 10;
    const systemSpacing = (regionSize * 0.8) / (gridSize - 1); // Use 80% of size for system grid
    const startX = -((gridSize - 1) * systemSpacing) / 2;
    const startY = -((gridSize - 1) * systemSpacing) / 2;
    
    systemsWithStars.forEach((system) => {
      // Position by system index (0..99): 0-9 first row, 10-19 second, etc.
      const row = Math.floor(system.system / gridSize);
      const col = system.system % gridSize;
      const systemX = startX + col * systemSpacing;
      const systemY = startY + row * systemSpacing;
      
      // Render all stars - they're already positioned within the 80% grid space
      const starColor = this.parseColor(system.star!.color!);
      const systemEntity = this.createGalaxyStarSystem(system.system, systemX, systemY, starColor, system.hasOwned, regionNumber);
      systemEntity.position.set(systemX, systemY);
      regionContainer.addChild(systemEntity);
    });
  }
  
  private parseColor(color: string): number {
    // Accept strings like "#FFAABB" or "rgb(...)"; here we only handle hex #RRGGBB
    if (color.startsWith('#')) {
      return parseInt(color.slice(1), 16) & 0xffffff;
    }
    // Fallback to white-green
    return 0x44ff44;
  }
  
  private createGalaxyStarSystem(systemNumber: number, systemX: number, systemY: number, starColor: number, hasOwned: boolean, regionNumber: number): any {
    const system = new PIXI.Container();
    system.name = `galaxy_star_system_${regionNumber}_${systemNumber}`;
    
    // Make stars more visible at galaxy zoom level
    const coreSize = hasOwned ? 1.5 : 1; // Slightly larger core
    const core = new PIXI.Graphics();
    core.beginFill(starColor);
    core.drawCircle(0, 0, coreSize);
    core.endFill();
    
    // More prominent glow for visibility
    const glow = new PIXI.Graphics();
    glow.beginFill(starColor, hasOwned ? 0.7 : 0.5); // Increased alpha for visibility
    glow.drawCircle(0, 0, coreSize + (hasOwned ? 2 : 1.5)); // Larger glow radius
    glow.endFill();
    system.addChild(glow);
    system.addChild(core);
    
    // Ensure star system is visible
    system.visible = true;
    system.renderable = true;
    system.alpha = 1.0;
    core.visible = true;
    glow.visible = true;
    
    // Make star system clickable for direct navigation to system view
    ;(system as any).eventMode = 'static'
    system.cursor = 'pointer';
    
system.on('pointerdown', (event: any) => {
      event.stopPropagation(); // Prevent region click from firing
      console.log('[GalaxyView] Star system', systemNumber, 'in region', regionNumber, 'clicked');
      if (this.onSelectLocation) {
        const locationData = {
          level: 'system' as const,
          galaxy: this.galaxy,
          region: regionNumber.toString(),
          system: systemNumber.toString(),
          x: systemX,
          y: systemY
        };
        console.log('[GalaxyView] Calling onSelectLocation with system data:', locationData);
        this.onSelectLocation(locationData);
      }
    });
    
    // Add hover handlers for star system
    if (this.onHoverLocation) {
system.on('pointerover', (event: any) => {
        event.stopPropagation();
        this.onHoverLocation!({
          level: 'system',
          galaxy: this.galaxy,
          region: regionNumber.toString(),
          system: systemNumber.toString(),
          x: systemX,
          y: systemY
        });
      });
      
      system.on('pointerout', () => {
        this.onHoverLocation!(null);
      });
    }
    
    return system;
  }
  
  private createRegionEntity(id: string, _x: number, _y: number, regionNumber: number, systemCount: number): any {
const region = new PIXI.Container();
    region.name = id;

    // Create a region core (MUCH larger to ensure visibility)
    const size = Math.max(30, Math.min(50, 30 + systemCount / 2)); // Increased from 10-20 to 30-50
    const userPresence = this.userRegions.get(regionNumber);
    
    console.log('[GalaxyView] Creating region', regionNumber, 'with size:', size, 'at position:', { _x, _y });
    
    
    // Determine colors based on user presence type
    let coreColor = 0x44FF44; // Default green
    let glowColor = 0x44FF44;
    let glowSize = size + 20; // Increased glow from +8 to +20
    
    if (userPresence) {
      switch (userPresence.type) {
        case 'home':
          coreColor = 0xFF8C00; // Orange for home base
          glowColor = 0xFF8C00;
          glowSize = size + 30; // Increased from +12
          break;
        case 'base':
          coreColor = 0x00BFFF; // Blue for regular bases
          glowColor = 0x00BFFF;
          glowSize = size + 25; // Increased from +10
          break;
        case 'occupation':
          coreColor = 0xFF4444; // Red for occupations (future use)
          glowColor = 0xFF4444;
          glowSize = size + 25; // Increased from +10
          break;
      }
    }
    
    const core = new PIXI.Graphics();
    core.beginFill(coreColor);
    core.drawCircle(0, 0, size);
    core.endFill();

    // Create a glow effect
    const glow = new PIXI.Graphics();
    glow.beginFill(glowColor, 0.3);
    glow.drawCircle(0, 0, glowSize);
    glow.endFill();

    // Add region label
    const label = new PIXI.Text(regionNumber.toString(), {
      fontSize: 12,
      fill: 0xFFFFFF,
      align: 'center'
    } as any);
    label.anchor.set(0.5);

    region.addChild(glow);
    region.addChild(core);
    region.addChild(label);
    
    // CRITICAL: Ensure region and all its children are visible
    region.visible = true;
    region.renderable = true;
    region.alpha = 1.0;
    glow.visible = true;
    core.visible = true;
    label.visible = true;
    
    console.log('[GalaxyView] Region', regionNumber, 'created with visibility:', {
      regionVisible: region.visible,
      regionRenderable: region.renderable,
      regionAlpha: region.alpha,
      glowVisible: glow.visible,
      coreVisible: core.visible,
      labelVisible: label.visible,
      coreSize: size,
      glowSize: glowSize
    });

    // Make region interactive for clicking
    console.log('[GalaxyView] Setting up region', regionNumber, 'as interactive');
    region.interactive = true;
    region.buttonMode = true;
    region.cursor = 'pointer';
    
    // Verify interactivity setup
    console.log('[GalaxyView] Region', regionNumber, 'interactivity setup:', {
      interactive: region.interactive,
      buttonMode: region.buttonMode,
      cursor: region.cursor,
      hasChildren: region.children.length
    });
    
    // Add click handler with extensive debugging
region.on('pointerdown', (event: any) => {
      console.log('[GalaxyView] ===== REGION CLICK EVENT =====');
      console.log('[GalaxyView] Region', regionNumber, 'clicked');
      console.log('[GalaxyView] Event details:', {
        type: event.type,
        target: event.target?.name,
        currentTarget: event.currentTarget?.name,
        global: event.global,
        local: event.data?.global
      });
      console.log('[GalaxyView] onSelectLocation callback exists:', !!this.onSelectLocation);
      
      if (this.onSelectLocation) {
        const locationData = {
          level: 'region' as const,
          galaxy: this.galaxy,
          region: regionNumber.toString(),
          x: _x,
          y: _y
        };
        console.log('[GalaxyView] Calling onSelectLocation with:', locationData);
        this.onSelectLocation(locationData);
        console.log('[GalaxyView] onSelectLocation call completed');
      } else {
        console.error('[GalaxyView] onSelectLocation callback is missing!');
      }
      console.log('[GalaxyView] ===== REGION CLICK EVENT END =====');
    });
    
    // Add hover handlers
    region.on('pointerover', () => {
      if (this.onHoverLocation) {
        this.onHoverLocation({
          level: 'region',
          galaxy: this.galaxy,
          region: regionNumber.toString(),
          x: _x,
          y: _y
        });
      }
    });
    
    region.on('pointerout', () => {
      if (this.onHoverLocation) {
        this.onHoverLocation(null);
      }
    });

    return region;
  }

  private createStarSystems(): void {
    console.log('[GalaxyView] Creating placeholder 10x10 region grid');
    // Create a 10x10 grid of regions (100 regions total) - proper galaxy view
    const gridSize = 10; // 10x10 = 100 regions
    
    // Check if engine is still valid before proceeding
    let vp;
    try {
      vp = this.engine.getViewport();
    } catch (error) {
      console.error('[GalaxyView] Cannot create star systems - engine is destroyed. This indicates a stale reference.', error);
      // Don't throw, just skip creation gracefully
      console.warn('[GalaxyView] Skipping star systems creation due to stale engine reference');
      return;
    }
    const sw = (vp as any)?.screenWidth ?? 800;
    const sh = (vp as any)?.screenHeight ?? 600;
    const padding = 80;
    const spacing = Math.min(
      (sw - 2 * padding) / (gridSize - 1),
      (sh - 2 * padding) / (gridSize - 1)
    );
    const startX = -((gridSize - 1) * spacing) / 2;
    const startY = -((gridSize - 1) * spacing) / 2;

    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const regionNumber = row * gridSize + col; // 0-99 region numbers (0-9 top row, 10-19 second row, etc.)
        const regionId = `region_${regionNumber}`;
        const worldX = startX + col * spacing; // col determines X position (left to right)
        const worldY = startY + row * spacing; // row determines Y position (top to bottom)

        // Use createRegionEntity instead of createStarSystem
        const regionEntity = this.createRegionEntity(regionId, worldX, worldY, regionNumber, 5);
        regionEntity.position.set(worldX, worldY);
        this.container.addChild(regionEntity);
        this.starSystems.set(regionId, regionEntity);
      }
    }
    console.log('[GalaxyView] Created', this.starSystems.size, 'placeholder regions in 10x10 grid');
  }


  public destroy(): void {
    // Remove container from parent
    console.log('[GalaxyView] Destroying galaxy view, current parent:', this.container.parent?.name);
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
      console.log('[GalaxyView] Container removed from parent');
    } else {
      console.log('[GalaxyView] Container had no parent during destroy');
    }
    this.container.removeChildren();
    this.starSystems.clear();
    this.regionData.clear();
 }
}
