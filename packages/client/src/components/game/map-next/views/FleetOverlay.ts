import * as PIXI from 'pixi.js'

type TContainer = InstanceType<typeof PIXI.Container>;
type TTexture = InstanceType<typeof PIXI.Texture>;
type TGraphics = InstanceType<typeof PIXI.Graphics>;
import { MapEngine } from '../MapEngine';
import { loadFleetData } from '../data/mapDataLoader';
import type { FleetsListDTO } from '../data/mapDataLoader';

export class FleetOverlay {
  private engine: MapEngine;
  private container: TContainer;
  private fleets: Map<string, TContainer> = new Map();
  private visible: boolean = false;
  private isLoading: boolean = false;
  private fleetData: Array<{id: string, x: number, y: number, ownerColor: number, ownerName?: string}> = [];
  private updateInterval: NodeJS.Timeout | null = null;
  private socketCleanupFunctions: (() => void)[] = [];
  
  // Current region context (for movement paths)
  // (Kept via resolver; no direct fields needed to avoid unused warnings)
  private coordToWorldResolver: ((coord: string) => { x: number; y: number } | null) | null = null;
  private movementLinesContainer: TContainer;
  
  // Virtual rendering optimization
  private viewportBounds: { x: number, y: number, width: number, height: number } = { x: 0, y: 0, width: 800, height: 600 };
  
  // Level-of-Detail (LOD) thresholds
  private readonly LOD_HIGH_ZOOM = 2.0;    // Above this zoom: full detail
  private readonly LOD_MEDIUM_ZOOM = 0.5;  // Between medium and high: medium detail
  // private readonly LOD_LOW_ZOOM = 0.1;     // Below this: low detail // Unused for now
  private currentLOD: 'high' | 'medium' | 'low' = 'high';
  
  // Batching optimization
  private batchedContainers: Map<string, TContainer> = new Map(); // Key: LOD+Color
  private readonly BATCH_SIZE_THRESHOLD = 50; // Use batching when more than this many fleets
  private fleetTextures: Map<string, TTexture> = new Map(); // Cached textures for sprites

  constructor(engine: MapEngine) {
    this.engine = engine;
    this.container = new PIXI.Container();
    this.container.name = 'fleet-overlay';
    this.container.visible = false;
    
    // Container for movement lines
    this.movementLinesContainer = new PIXI.Container();
    this.movementLinesContainer.name = 'fleet-movement-lines';
    this.container.addChild(this.movementLinesContainer);
  }

  public setServerContext(_server: string): void {
    // Server context not used in current implementation
  }

  public setRegionContext(server: string, galaxy: number, region: number): void {
    // Currently not used directly; context is conveyed via resolver and engine state
    void server; void galaxy; void region;
  }

  public setCoordToWorldResolver(resolver: (coord: string) => { x: number; y: number } | null): void {
    this.coordToWorldResolver = resolver;
  }

  /**
   * Updates the engine reference to prevent stale reference bugs when React re-mounts UniverseMap
   */
  public updateEngine(newEngine: MapEngine): void {
    console.log('[FleetOverlay] Updating engine reference to new MapEngine instance');
    this.engine = newEngine;
    
    // Re-initialize the container with the new engine's effects layer if needed
    const currentParent = this.container.parent;
    if (currentParent) {
      console.log('[FleetOverlay] Removing container from old engine layer');
      currentParent.removeChild(this.container);
    }
    
    // Add to new engine's effects layer
    const newLayer = newEngine.getLayer('effects');
    if (newLayer) {
      console.log('[FleetOverlay] Adding container to new engine effects layer');
      newLayer.addChild(this.container);
    } else {
      console.warn('[FleetOverlay] New engine effects layer not found');
    }
  }

  public initialize(): void {
    // Get the effects layer from engine for fleet overlay
    const layer = this.engine.getLayer('effects');
    if (layer) {
      layer.addChild(this.container);
    }
    
    // Initialize real-time updates
    this.initializeRealTimeUpdates();
  }

private initializeRealTimeUpdates(): void {
    // Set up periodic fleet updates (fallback for socket)
    this.updateInterval = setInterval(() => {
      if (this.visible) {
        this.loadFleets();
      }
    }, 5000); // Update every 5 seconds

    // Integrate with existing socket.io infrastructure
    this.connectToGameSocket();
  }

  private connectToGameSocket(): void {
    // TODO: Re-enable socket connection when socket service is available
    /*
    try {
      const socket = getSocket();
      if (!socket) {
        console.warn('[FleetOverlay] Socket not available, using polling fallback');
        return;
      }

      console.log('[FleetOverlay] Connecting to real-time fleet updates');

      // Listen for fleet movement events
      const cleanupFleetMoved = socket.on('fleet:moved', (data: any) => {
        this.handleFleetMovement(data);
      });
      this.socketCleanupFunctions.push(() => cleanupFleetMoved());

      // Listen for fleet creation events  
      const cleanupFleetCreated = socket.on('fleet:created', (data: any) => {
        this.handleFleetCreated(data);
      });
      this.socketCleanupFunctions.push(() => cleanupFleetCreated());

      // Listen for fleet destruction events
      const cleanupFleetDestroyed = socket.on('fleet:destroyed', (data: any) => {
        this.handleFleetDestroyed(data);
      });
      this.socketCleanupFunctions.push(() => cleanupFleetDestroyed());

      // Listen for batch fleet updates
      const cleanupFleetBatch = socket.on('fleet:batch_update', (data: any) => {
        this.handleBatchFleetUpdate(data);
      });
      this.socketCleanupFunctions.push(() => cleanupFleetBatch());

      console.log('[FleetOverlay] Real-time fleet updates connected');
    } catch (error) {
      console.error('[FleetOverlay] Failed to connect to socket:', error);
    }
    */
  }

  // TODO: Re-enable when socket service is available
  // private handleFleetMovement(data: any): void {
  //   // Handle individual fleet movement
  //   if (data.fleetId && data.x !== undefined && data.y !== undefined) {
  //     this.updateFleetPositions([{
  //       id: data.fleetId,
  //       x: data.x,
  //       y: data.y
  //     }]);
  //   }
  // }

  // private handleFleetCreated(data: any): void {
  //   // Handle new fleet creation - reload all fleets to include the new one
  //   console.log('[FleetOverlay] Fleet created:', data.fleetId);
  //   this.loadFleets();
  // }

  // private handleFleetDestroyed(data: any): void {
  //   // Handle fleet destruction - remove from display and reload
  //   console.log('[FleetOverlay] Fleet destroyed:', data.fleetId);
  //   if (data.fleetId && this.fleets.has(data.fleetId)) {
  //     const fleetContainer = this.fleets.get(data.fleetId);
  //     if (fleetContainer && fleetContainer.parent) {
  //       fleetContainer.parent.removeChild(fleetContainer);
  //     }
  //     this.fleets.delete(data.fleetId);
  //   }
  //   // Also reload to ensure consistency
  //   this.loadFleets();
  // }

  // private handleBatchFleetUpdate(data: any): void {
  //   // Handle batch updates for efficiency
  //   if (data.fleets && Array.isArray(data.fleets)) {
  //     const updates = data.fleets.map((fleet: any) => ({
  //       id: fleet.fleetId || fleet.id,
  //       x: fleet.x,
  //       y: fleet.y
  //     })).filter((update: any) => update.id && update.x !== undefined && update.y !== undefined);
  //     
  //     if (updates.length > 0) {
  //       this.updateFleetPositions(updates);
  //     }
  //   }
  // }

  public async loadFleets(baseCoord?: string): Promise<void> {
    if (this.isLoading) return;
    
    this.isLoading = true;
    // Reset error state (no error property for now)

    try {
      const response = await loadFleetData(baseCoord);
      
      if (response.success && response.data) {
        this.fleetData = this.convertFleetData(response.data, baseCoord);
        if (this.visible) {
          this.renderFleets(this.fleetData);
        }
      } else {
        console.warn('Failed to load fleet data:', response.message);
      }
    } catch (error) {
      console.error('Error loading fleet data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  private convertFleetData(data: FleetsListDTO, _baseCoord?: string): Array<{id: string, x: number, y: number, ownerColor: number, ownerName?: string}> {
    // Only include current player's fleets
    let currentUser: string | undefined;
    try {
      const store = require('../../../../stores/enhancedAppStore');
      const state = store.useEnhancedAppStore.getState();
      currentUser = state?.auth?.user?.username;
    } catch {}

    const rows = currentUser ? data.fleets.filter(f => f.ownerName === currentUser) : data.fleets;

    // Convert to placeholder positions for now
    return rows.map((fleet, index) => ({
      id: fleet._id,
      x: index * 50, // Placeholder; positions not tracked yet at region view
      y: index * 30,
      ownerColor: this.getFleetColor(fleet.ownerName),
      ownerName: fleet.ownerName
    }));
 }

  private getFleetColor(ownerName: string): number {
    // Simple hash-based color generation
    let hash = 0;
    for (let i = 0; i < ownerName.length; i++) {
      hash = ownerName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const color = (hash & 0x00FFFFFF) | 0xFF000000;
    return color & 0xFFFFFF; // Ensure it's a valid RGB color
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.container.visible = visible;
    
    // Render fleets when made visible
    if (visible && this.fleetData.length > 0) {
      this.renderFleets(this.fleetData);
      // Also render movement lines
      this.loadAndRenderMovements().catch(() => {});
    } else if (!visible) {
      this.clearMovementLines();
    }
 }

  public isVisible(): boolean {
    return this.visible;
  }

  public renderFleets(fleetData: Array<{id: string, x: number, y: number, ownerColor: number}>): void {
    if (!this.visible) return;

    // Update viewport bounds for virtual rendering
    // Temporarily render all fleets without viewport culling during migration
    this.viewportBounds = { x: -1e9, y: -1e9, width: 2e9, height: 2e9 };

    // Use virtual rendering for large fleets
    if (fleetData.length > 100) {
      this.renderFleetsVirtually(fleetData);
    } else {
      this.renderAllFleets(fleetData);
    }
  }


  private renderFleetsVirtually(fleetData: Array<{id: string, x: number, y: number, ownerColor: number}>): void {
    // Update LOD based on current zoom level
    this.updateLOD();

    // Filter fleets to only those visible in the viewport
    const visibleFleets = fleetData.filter(fleet => {
      return fleet.x >= this.viewportBounds.x &&
             fleet.x <= this.viewportBounds.x + this.viewportBounds.width &&
             fleet.y >= this.viewportBounds.y &&
             fleet.y <= this.viewportBounds.y + this.viewportBounds.height;
    });

    // Use batched rendering for better performance with many fleets
    if (visibleFleets.length > this.BATCH_SIZE_THRESHOLD) {
      this.renderFleetsBatched(visibleFleets);
    } else {
      this.renderFleetsIndividually(visibleFleets);
    }

    console.log(`[FleetOverlay] Virtual rendering: ${visibleFleets.length}/${fleetData.length} fleets visible (LOD: ${this.currentLOD}, Batched: ${visibleFleets.length > this.BATCH_SIZE_THRESHOLD})`);
  }

  private renderAllFleets(fleetData: Array<{id: string, x: number, y: number, ownerColor: number, ownerName?: string}>): void {
    // Update LOD based on current zoom level
    this.updateLOD();

    // Clear existing fleets
    this.container.removeChildren();
    this.fleets.clear();

    // Use batched rendering for better performance with many fleets
    if (fleetData.length > this.BATCH_SIZE_THRESHOLD) {
      this.renderFleetsBatched(fleetData);
    } else {
      this.renderFleetsIndividually(fleetData);
    }
  }

  private renderFleetsIndividually(fleetData: Array<{id: string, x: number, y: number, ownerColor: number, ownerName?: string}>): void {
    // Track which fleets should be rendered
    const shouldRender = new Set(fleetData.map(f => f.id));

    // Remove fleets that are no longer visible
    for (const [fleetId, fleetContainer] of this.fleets) {
      if (!shouldRender.has(fleetId)) {
        this.container.removeChild(fleetContainer);
        this.fleets.delete(fleetId);
      }
    }

    // Add new fleets with appropriate LOD
    fleetData.forEach(fleet => {
      if (!this.fleets.has(fleet.id)) {
        const fleetMarker = this.createFleetMarkerWithLOD(fleet.id, fleet.x, fleet.y, fleet.ownerColor);
        fleetMarker.position.set(fleet.x, fleet.y);
        this.container.addChild(fleetMarker);
        this.fleets.set(fleet.id, fleetMarker);
      }
    });
  }

  private renderFleetsBatched(fleetData: Array<{id: string, x: number, y: number, ownerColor: number, ownerName?: string}>): void {
    // Clear existing individual fleet markers
    this.container.removeChildren();
    this.fleets.clear();
    
    // Clear existing batched containers
    this.batchedContainers.clear();

    // Group fleets by color and LOD for batching
    const batchGroups = new Map<string, Array<{id: string, x: number, y: number, ownerColor: number}>>();
    
    fleetData.forEach(fleet => {
      const batchKey = `${this.currentLOD}_${fleet.ownerColor.toString(16)}`;
      if (!batchGroups.has(batchKey)) {
        batchGroups.set(batchKey, []);
      }
      batchGroups.get(batchKey)!.push(fleet);
    });

    // Create batched containers for each group
    batchGroups.forEach((fleets, batchKey) => {
      const batchContainer = this.createBatchedFleetContainer(batchKey, fleets);
      this.container.addChild(batchContainer);
      this.batchedContainers.set(batchKey, batchContainer);
    });

    console.log(`[FleetOverlay] Batched rendering: ${batchGroups.size} batches for ${fleetData.length} fleets`);
  }

  private createBatchedFleetContainer(batchKey: string, fleets: Array<{id: string, x: number, y: number, ownerColor: number, ownerName?: string}>): TContainer {
    const batchContainer = new PIXI.Container();
    batchContainer.name = `batch_${batchKey}`;

    // Get texture for this LOD and color combination
    const texture = this.getOrCreateFleetTexture(batchKey, fleets[0].ownerColor);
    
    if (texture) {
      // Use sprites for better batching performance
      fleets.forEach(fleet => {
        const sprite = new PIXI.Sprite(texture);
        sprite.name = fleet.id;
        sprite.anchor.set(0.5, 0.5);
        sprite.position.set(fleet.x, fleet.y);
        
        // Disable per-sprite interactivity for better performance
        (sprite as any).interactive = false;
        
        batchContainer.addChild(sprite);
        
        // Track individual fleet sprites for updates
        this.fleets.set(fleet.id, sprite as any);
      });
    } else {
      // Fallback to individual graphics if texture creation fails
      fleets.forEach(fleet => {
        const fleetMarker = this.createFleetMarkerWithLOD(fleet.id, fleet.x, fleet.y, fleet.ownerColor);
        fleetMarker.position.set(fleet.x, fleet.y);
        batchContainer.addChild(fleetMarker);
        this.fleets.set(fleet.id, fleetMarker);
      });
    }

    return batchContainer;
  }

  private getOrCreateFleetTexture(batchKey: string, color: number): TTexture | null {
    if (this.fleetTextures.has(batchKey)) {
      return this.fleetTextures.get(batchKey)!;
    }

    try {
      // Create a temporary graphics object to generate texture
      const tempGraphics = new PIXI.Graphics();
      
      switch (this.currentLOD) {
        case 'high':
          this.drawHighDetailFleetToGraphics(tempGraphics, color);
          break;
        case 'medium':
          this.drawMediumDetailFleetToGraphics(tempGraphics, color);
          break;
        case 'low':
          this.drawLowDetailFleetToGraphics(tempGraphics, color);
          break;
      }

      // Generate texture from graphics
      const texture = this.engine.getApp().renderer.generateTexture(tempGraphics as any);
      
      // Cache the texture
      this.fleetTextures.set(batchKey, texture);
      
      // Clean up temporary graphics
      tempGraphics.destroy();
      
      return texture;
    } catch (error) {
      console.error('[FleetOverlay] Failed to create fleet texture:', error);
      return null;
    }
  }

  private drawHighDetailFleetToGraphics(graphics: TGraphics, color: number): void {
    // High detail: Triangle with glow and outline
    graphics.beginFill(color, 0.3);
    graphics.drawCircle(0, 0, 10);
    graphics.endFill();

    graphics.lineStyle(1, 0xFFFFFF, 0.8);
    graphics.beginFill(color);
    graphics.moveTo(0, -8);
    graphics.lineTo(6, 6);
    graphics.lineTo(-6, 6);
    graphics.closePath();
    graphics.endFill();

    graphics.lineStyle(0);
    graphics.beginFill(color);
    graphics.moveTo(0, -6);
    graphics.lineTo(5, 4);
    graphics.lineTo(-5, 4);
    graphics.closePath();
    graphics.endFill();
  }

  private drawMediumDetailFleetToGraphics(graphics: TGraphics, color: number): void {
    // Medium detail: Simple triangle with glow
    graphics.beginFill(color, 0.3);
    graphics.drawCircle(0, 0, 8);
    graphics.endFill();

    graphics.beginFill(color);
    graphics.moveTo(0, -6);
    graphics.lineTo(5, 4);
    graphics.lineTo(-5, 4);
    graphics.closePath();
    graphics.endFill();
  }

  private drawLowDetailFleetToGraphics(graphics: TGraphics, color: number): void {
    // Low detail: Simple colored dot
    graphics.beginFill(color);
    graphics.drawCircle(0, 0, 3);
    graphics.endFill();
  }

  private updateLOD(): void {
    const viewport = this.engine.getViewport();
    if (!viewport) return;

    const currentZoom = viewport.scale.x || 1.0;
    let newLOD: 'high' | 'medium' | 'low';

    if (currentZoom >= this.LOD_HIGH_ZOOM) {
      newLOD = 'high';
    } else if (currentZoom >= this.LOD_MEDIUM_ZOOM) {
      newLOD = 'medium';
    } else {
      newLOD = 'low';
    }

    // If LOD changed, we need to recreate all visible fleet markers
    if (newLOD !== this.currentLOD) {
      console.log(`[FleetOverlay] LOD changed from ${this.currentLOD} to ${newLOD} (zoom: ${currentZoom.toFixed(2)})`);
      this.currentLOD = newLOD;
      
      // Recreate all visible fleet markers with new LOD
      this.recreateFleetMarkersWithNewLOD();
    }
  }

  private recreateFleetMarkersWithNewLOD(): void {
    // Store current fleet data
    const fleetPositions = new Map<string, {x: number, y: number, color: number}>();
    
    this.fleets.forEach((container, fleetId) => {
      fleetPositions.set(fleetId, {
        x: container.position.x,
        y: container.position.y,
        color: (container.children[1] as any).tint || 0xFFFFFF
      });
    });

    // Clear existing fleets
    this.container.removeChildren();
    this.fleets.clear();

    // Recreate with new LOD
    fleetPositions.forEach((data, fleetId) => {
      const fleetMarker = this.createFleetMarkerWithLOD(fleetId, data.x, data.y, data.color);
      fleetMarker.position.set(data.x, data.y);
      this.container.addChild(fleetMarker);
      this.fleets.set(fleetId, fleetMarker);
    });
  }

  private createFleetMarkerWithLOD(_id: string, _x: number, _y: number, color: number): TContainer {
    // Use _ prefix for unused parameters to avoid TS6133 errors
    switch (this.currentLOD) {
      case 'high':
        return this.createHighDetailFleetMarker(color);
      case 'medium':
        return this.createMediumDetailFleetMarker(color);
      default:
        return this.createLowDetailFleetMarker(color);
    }
  }

  // ============================
  // Movement paths (region-only)
  // ============================

  public async loadAndRenderMovements(): Promise<void> {
    if (!this.visible) return;
    if (!this.coordToWorldResolver) return; // Require resolver from RegionView

    // Clear previous lines
    this.clearMovementLines();

    try {
      // Load details for each fleet (only a few expected for current user)
      const statuses = await Promise.all(
        this.fleetData.map(async (f) => {
          try {
            const { loadFleetStatus } = require('../data/mapDataLoader');
            const res = await loadFleetStatus(f.id);
            return res.success ? res.data : null;
          } catch {
            return null;
          }
        })
      );

      statuses.forEach((s: any, idx: number) => {
        if (!s || !s.movement) return;
        const mv = s.movement;
        // Filter to current region
        if (!mv.originCoord || !mv.destinationCoord) return;
        const a = this.coordToWorldResolver!(mv.originCoord);
        const b = this.coordToWorldResolver!(mv.destinationCoord);
        if (!a || !b) return; // Ignore movements outside current region

        const color = this.fleetData[idx]?.ownerColor || 0x00ffff;
        this.drawMovementLine(a, b, color);
      });
    } catch (error) {
      console.warn('[FleetOverlay] Movement load failed:', error);
    }
  }

  private clearMovementLines(): void {
    this.movementLinesContainer.removeChildren();
  }

  private drawMovementLine(a: { x: number; y: number }, b: { x: number; y: number }, color: number): void {
    const g = new PIXI.Graphics();
    g.lineStyle(2, color, 0.85);
    g.moveTo(a.x, a.y);
    g.lineTo(b.x, b.y);

    // Add subtle moving dash effect by overlaying faded line
    const faded = new PIXI.Graphics();
    faded.lineStyle(4, color, 0.15);
    faded.moveTo(a.x, a.y);
    faded.lineTo(b.x, b.y);

    this.movementLinesContainer.addChild(faded);
    this.movementLinesContainer.addChild(g);
  }

  private createHighDetailFleetMarker(color: number): TContainer {
    const container = new PIXI.Container();

    // High detail: Triangle with glow, outline, and pulse effect
    const glow = new PIXI.Graphics();
    glow.beginFill(color, 0.3);
    glow.drawCircle(0, 0, 10);
    glow.endFill();

    const outline = new PIXI.Graphics();
    outline.lineStyle(1, 0xFFFFFF, 0.8);
    outline.beginFill(color);
    outline.moveTo(0, -8);
    outline.lineTo(6, 6);
    outline.lineTo(-6, 6);
    outline.closePath();
    outline.endFill();

    const marker = new PIXI.Graphics();
    marker.beginFill(color);
    marker.moveTo(0, -6);
    marker.lineTo(5, 4);
    marker.lineTo(-5, 4);
    marker.closePath();
    marker.endFill();

    container.addChild(glow);
    container.addChild(outline);
    container.addChild(marker);

    // Disable per-object interactivity
    (container as any).interactive = false;
    (container as any).cursor = 'default';

    return container;
  }

  private createMediumDetailFleetMarker(color: number): TContainer {
    const container = new PIXI.Container();

    // Medium detail: Simple triangle with glow
    const glow = new PIXI.Graphics();
    glow.beginFill(color, 0.3);
    glow.drawCircle(0, 0, 8);
    glow.endFill();

    const marker = new PIXI.Graphics();
    marker.beginFill(color);
    marker.moveTo(0, -6);
    marker.lineTo(5, 4);
    marker.lineTo(-5, 4);
    marker.closePath();
    marker.endFill();

    container.addChild(glow);
    container.addChild(marker);

    // Disable per-object interactivity
    (container as any).eventMode = 'none';
    (container as any).cursor = 'default';

    return container;
  }

  private createLowDetailFleetMarker(color: number): TContainer {
    const container = new PIXI.Container();

    // Low detail: Simple colored dot
    const marker = new PIXI.Graphics();
    marker.beginFill(color);
    marker.drawCircle(0, 0, 3);
    marker.endFill();

    container.addChild(marker);

    // Disable per-object interactivity
    (container as any).interactive = false;
    (container as any).cursor = 'default';

    return container;
  }

  public updateFleetPositions(fleetUpdates: Array<{id: string, x: number, y: number}>): void {
    fleetUpdates.forEach(update => {
      const fleet = this.fleets.get(update.id);
      if (fleet) {
        // Animate fleet movement
        this.animateFleetMovement(fleet, update.x, update.y);
      }
    });
  }

  private animateFleetMovement(fleet: TContainer, targetX: number, targetY: number): void {
    // Simple linear interpolation for smooth movement
    const startX = fleet.position.x;
    const startY = fleet.position.y;
    const duration = 500; // ms
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const currentX = startX + (targetX - startX) * progress;
      const currentY = startY + (targetY - startY) * progress;
      
      fleet.position.set(currentX, currentY);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  // TODO: Re-enable when needed
  // private createFleetMarker(_id: string, _x: number, _y: number, color: number): PIXI.Container {
  //   const marker = new PIXI.Graphics();
  //   marker.name = _id;
  // 
  //   // Create a triangle marker for fleets
  //   marker.beginFill(color);
  //   marker.moveTo(0, -6);
  //   marker.lineTo(5, 4);
  //   marker.lineTo(-5, 4);
  //   marker.closePath();
  //   marker.endFill();
  // 
  //   // Add a glow effect
  //   const glow = new PIXI.Graphics();
  //   glow.beginFill(color, 0.3);
  //   glow.drawCircle(0, 0, 8);
  //   glow.endFill();
  // 
  //   const container = new PIXI.Container();
  //   container.addChild(glow);
  //   container.addChild(marker);
  // 
  //   // Follow the same pattern as other views - disable per-object interactivity
  //   (container as any).interactive = false;
  //   (container as any).cursor = 'default';
  // 
  //   return container;
  // }

  public destroy(): void {
    // Clean up socket event listeners
    this.socketCleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.error('[FleetOverlay] Error cleaning up socket listener:', error);
      }
    });
    this.socketCleanupFunctions = [];
    
    // Clean up update interval
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    // Remove container from parent
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.removeChildren();
    this.fleets.clear();
  }
}
