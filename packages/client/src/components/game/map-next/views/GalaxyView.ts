import * as PIXI from 'pixi.js';

type TContainer = InstanceType<typeof PIXI.Container>;
type TGraphics = InstanceType<typeof PIXI.Graphics>;
import { MapEngine } from '../MapEngine';
import { ViewManager } from './ViewManager';
import { MapLocation } from '../types';
import { loadGalaxyData, loadRegionData } from '../data/mapDataLoader';
import type { GalaxyRegionSummariesData, UniverseRegionSystemsData } from '../data/mapDataLoader';

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
    // Reset loading state

    try {
      const response = await loadGalaxyData(this.server, this.galaxy);
      
      if (response.success && response.data) {
        await this.createGalaxyRegions(response.data);
      } else {
        console.warn('Failed to load galaxy data:', response.message);
        // Fallback to placeholder data
        this.createStarSystems();
      }
    } catch (error) {
      console.error('Error loading galaxy data:', error);
      // Fallback to placeholder data
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
      
      // Load region data to get star system positions
      try {
        const regionDataResponse = await loadRegionData(this.server, this.galaxy, regionNumber);
        if (regionDataResponse.success && regionDataResponse.data) {
          this.regionData.set(regionNumber, regionDataResponse.data);
        }
      } catch (error) {
        console.warn('[GalaxyView] Failed to load region data for region', regionNumber, ':', error);
      }
      
      const regionEntity = this.createEnhancedRegionEntity(regionId, worldX, worldY, regionNumber, region.systemsWithStars.length, spacing);
      regionEntity.position.set(worldX, worldY);
      console.log('[GalaxyView] Adding enhanced region', regionNumber, 'to container');
      this.container.addChild(regionEntity);
      this.starSystems.set(regionId, regionEntity);
      console.log('[GalaxyView] Enhanced region', regionNumber, 'added to container, container children count:', this.container.children.length);
    }
    
    console.log('[GalaxyView] Created', regions.length, 'enhanced regions with embedded star systems in 10x10 grid layout');
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
    
    // Add region label (outside the boundary)
    const label = new PIXI.Text(regionNumber.toString(), {
      fontSize: 12,
      fill: userPresence ? borderColor : 0xAAAAAA,
      align: 'center',
      fontFamily: 'Arial, sans-serif',
      fontWeight: userPresence ? 'bold' : 'normal'
    } as any);
    label.anchor.set(0.5);
    label.position.set(0, regionSize/2 + 16); // Position below the square region
    
    // Add subtle background to label for better readability
const labelBg = new PIXI.Graphics();
    labelBg.beginFill(0x000000, 0.6);
    labelBg.drawRoundedRect(-12, -8, 24, 16, 4);
    labelBg.endFill();
    labelBg.position.set(0, regionSize/2 + 16);
    
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
    
    console.log('[GalaxyView] Adding', systems.length, 'star systems to region', regionNumber);
    
    // Create a smaller grid within the square region boundary
    // Use the same 10x10 approach as RegionView but scaled to fit within regionSize
    const gridSize = 10;
    const systemSpacing = (regionSize * 0.8) / (gridSize - 1); // Use 80% of size for system grid
    const startX = -((gridSize - 1) * systemSpacing) / 2;
    const startY = -((gridSize - 1) * systemSpacing) / 2;
    
    systems.forEach((system) => {
      // Position by system index (0..99): 0-9 first row, 10-19 second, etc.
      const row = Math.floor(system.system / gridSize);
      const col = system.system % gridSize;
      const systemX = startX + col * systemSpacing;
      const systemY = startY + row * systemSpacing;
      
      // Only render systems that fall within the square region boundary
      const halfSize = regionSize / 2;
      if (Math.abs(systemX) <= halfSize * 0.85 && Math.abs(systemY) <= halfSize * 0.85) { // Leave some padding from edge
        const starColor = system.star?.color ? this.parseColor(system.star.color) : 0x44ff44;
        const systemEntity = this.createGalaxyStarSystem(system.system, systemX, systemY, starColor, system.hasOwned, regionNumber);
        systemEntity.position.set(systemX, systemY);
        regionContainer.addChild(systemEntity);
        
        console.log('[GalaxyView] Added star system', system.system, 'to region', regionNumber, 'at local position:', { systemX, systemY });
      }
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
    
    // Small star core (scaled down for galaxy view)
    const coreSize = hasOwned ? 3 : 2;
const core = new PIXI.Graphics();
    core.beginFill(starColor);
    core.drawCircle(0, 0, coreSize);
    core.endFill();
    
    // Subtle glow for owned systems or brighter colored stars
const glow = new PIXI.Graphics();
    glow.beginFill(starColor, hasOwned ? 0.5 : 0.25);
    glow.drawCircle(0, 0, coreSize + (hasOwned ? 3 : 2));
    glow.endFill();
    system.addChild(glow);
    
    system.addChild(core);
    
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
