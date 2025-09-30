import * as PIXI from 'pixi.js';

type TContainer = InstanceType<typeof PIXI.Container>;
import { MapEngine } from '../MapEngine';
import { ViewManager } from './ViewManager';
// import { MapLocation } from '../types'; // Unused for now
import { loadRegionData } from '../data/mapDataLoader';
import type { UniverseRegionSystemsData } from '../data/mapDataLoader';

export class RegionView {
  private engine: MapEngine;
  private container: TContainer;
  private systems: Map<string, TContainer> = new Map();
  private systemPositions: Map<number, { x: number; y: number }> = new Map();
  private server: string = 'default';
  private galaxy: number = 0;
  private region: number = 0;
  private isLoading: boolean = false;
  private onSelectLocation?: (location: { level: 'system'; galaxy: number; region: string; system: string; x?: number; y?: number }) => void;
  private onHoverLocation?: (location: { level: 'system'; galaxy: number; region: string; system: string; x?: number; y?: number } | null) => void;

  constructor(engine: MapEngine, _viewManager: ViewManager, onSelectLocation?: (location: { level: 'system'; galaxy: number; region: string; system: string; x?: number; y?: number }) => void, onHoverLocation?: (location: { level: 'system'; galaxy: number; region: string; system: string; x?: number; y?: number } | null) => void) {
    this.engine = engine;
    this.container = new PIXI.Container();
    this.container.name = 'region-view';
    this.container.visible = false;
    this.onSelectLocation = onSelectLocation;
    this.onHoverLocation = onHoverLocation;
  }

  public setRegionContext(server: string, galaxy: number, region: number): void {
    this.server = server;
    this.galaxy = galaxy;
    this.region = region;
  }

  /**
   * Updates the engine reference to prevent stale reference bugs when React re-mounts UniverseMap
   */
  public updateEngine(newEngine: MapEngine): void {
    console.log('[RegionView] Updating engine reference to new MapEngine instance');
    this.engine = newEngine;
    
    // Re-initialize the container with the new engine's entities layer if needed
    const currentParent = this.container.parent;
    if (currentParent) {
      console.log('[RegionView] Removing container from old engine layer');
      currentParent.removeChild(this.container);
    }
    
    // Add to new engine's entities layer
    const newLayer = newEngine.getLayer('entities');
    if (newLayer) {
      console.log('[RegionView] Adding container to new engine entities layer');
      newLayer.addChild(this.container);
    } else {
      console.warn('[RegionView] New engine entities layer not found');
    }
  }

  public initialize(): void {
    // Get the entities layer from engine
    const layer = this.engine.getLayer('entities');
    if (layer) {
      layer.addChild(this.container);
    }
  }
  
  public setVisible(visible: boolean): void {
    this.container.visible = visible;
  }

  public async render(): Promise<void> {
    // Clear existing systems
    this.container.removeChildren();
    this.systems.clear();
    this.systemPositions.clear();

    // Load real region data
    await this.loadRegionData();
  }

  private async loadRegionData(): Promise<void> {
    if (this.isLoading) return;
    
    this.isLoading = true;
    // Reset loading state

    try {
      const response = await loadRegionData(this.server, this.galaxy, this.region);
      
      if (response.success && response.data) {
        this.createRegionSystems(response.data);
      } else {
        console.warn('Failed to load region data:', response.message);
        // Fallback to placeholder data
        this.createSystems();
      }
    } catch (error) {
      console.error('Error loading region data:', error);
      // Fallback to placeholder data
      this.createSystems();
    } finally {
      this.isLoading = false;
    }
  }

  private createRegionSystems(data: UniverseRegionSystemsData): void {
    const systems = data.systems;

    // Fixed 10x10 grid; compute spacing to fit viewport without zoom
    const gridSize = 10;
    const vp = this.engine.getViewport();
    const sw = (vp as any)?.screenWidth ?? 800;
    const sh = (vp as any)?.screenHeight ?? 600;
    const padding = 80;
    const spacing = Math.min(
      (sw - 2 * padding) / (gridSize - 1),
      (sh - 2 * padding) / (gridSize - 1)
    );
    const startX = -((gridSize - 1) * spacing) / 2;
    const startY = -((gridSize - 1) * spacing) / 2;

    systems.forEach((system) => {
      const systemId = `system_${system.system}`;

      // Position by system index (0..99): 0-9 first row, 10-19 second, etc.
      const row = Math.floor(system.system / gridSize);
      const col = system.system % gridSize;
      const worldX = startX + col * spacing;
      const worldY = startY + row * spacing;

      // Record position for fleet overlays
      this.systemPositions.set(system.system, { x: worldX, y: worldY });

      const color = system.star?.color ? this.parseColor(system.star.color) : 0x44ff44;
      const systemEntity = this.createSystemEntity(systemId, worldX, worldY, system.system, color, system.hasOwned);
      systemEntity.position.set(worldX, worldY);
      this.container.addChild(systemEntity);
      this.systems.set(systemId, systemEntity);
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

  private createSystemEntity(id: string, worldX: number, worldY: number, systemNumber: number, starColor: number, hasOwned: boolean): any {
    const system = new PIXI.Container();
    system.name = id;

    // Star core using server-provided color
    const core = new PIXI.Graphics();
    core.beginFill(starColor);
    core.drawCircle(0, 0, 8);
    core.endFill();

    // Glow ring (stronger if owned anywhere in system)
    const glow = new PIXI.Graphics();
    glow.beginFill(starColor, hasOwned ? 0.45 : 0.25);
    glow.drawCircle(0, 0, hasOwned ? 18 : 14);
    glow.endFill();

    // Label with system number (small)
    const label = new PIXI.Text(systemNumber.toString(), {
      fontSize: 10,
      fill: 0xffffff,
      align: 'center'
    } as any);
    label.anchor.set(0.5);

    system.addChild(glow);
    system.addChild(core);
    system.addChild(label);

    // Make system clickable to navigate to system view
    ;(system as any).eventMode = 'static'
    system.cursor = 'pointer';

    system.on('pointerdown', () => {
      console.log('[RegionView] Star clicked!', {
        systemNumber,
        galaxy: this.galaxy,
        region: this.region,
        hasCallback: !!this.onSelectLocation
      });
      if (this.onSelectLocation) {
        const locationData = {
          level: 'system' as const,
          galaxy: this.galaxy,
          region: this.region.toString(),
          system: systemNumber.toString(),
          x: worldX,
          y: worldY
        };
        console.log('[RegionView] Calling onSelectLocation with:', locationData);
        this.onSelectLocation(locationData);
      } else {
        console.warn('[RegionView] No onSelectLocation callback available!');
      }
    });

    if (this.onHoverLocation) {
      system.on('pointerover', () => {
        this.onHoverLocation!({
          level: 'system',
          galaxy: this.galaxy,
          region: this.region.toString(),
          system: systemNumber.toString(),
          x: worldX,
          y: worldY
        });
      });
      system.on('pointerout', () => this.onHoverLocation!(null));
    }

    return system;
  }

 private createSystems(): void {
    // Create a grid of systems for demonstration (fallback)
    const gridSize = 8;
    const spacing = 120;
    const startX = -(gridSize * spacing) / 2;
    const startY = -(gridSize * spacing) / 2;

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        const systemId = `system_${x}_${y}`;
        const worldX = startX + x * spacing;
        const worldY = startY + y * spacing;

        const system = this.createSystem(systemId, worldX, worldY);
        system.position.set(worldX, worldY);
        this.container.addChild(system);
        this.systems.set(systemId, system);
      }
    }
  }

  private createSystem(id: string, _x: number, _y: number): any {
    const system = new PIXI.Container();
    system.name = id;

    // Create a system core
    const core = new PIXI.Graphics();
    core.beginFill(0x44FF44);
    core.drawCircle(0, 0, 6);
    core.endFill();

    // Create a system glow
    const glow = new PIXI.Graphics();
    glow.beginFill(0x44FF44, 0.2);
    glow.drawCircle(0, 0, 12);
    glow.endFill();

    system.addChild(glow);
    system.addChild(core);

    // Follow the same pattern as UniverseMap - disable per-object interactivity
    ;(system as any).eventMode = 'none'
    system.cursor = 'default';

    return system;
  }

  public getWorldPositionForCoord(coord: string): { x: number; y: number } | null {
    // Expected coord format "A00:RG:SS:BB" but we only need server, galaxy, region, system
    try {
      const parts = coord.split(':');
      if (parts.length < 3) return null;

      const serverGalaxy = parts[0];
      const server = serverGalaxy.charAt(0);
      const galaxy = parseInt(serverGalaxy.slice(1), 10);
      const region = parseInt(parts[1], 10);
      const system = parseInt(parts[2], 10);

      if (server !== this.server || galaxy !== this.galaxy || region !== this.region) return null;

      const pos = this.systemPositions.get(system);
      return pos ? { x: pos.x, y: pos.y } : null;
    } catch {
      return null;
    }
  }

  public destroy(): void {
    // Remove container from parent
    if (this.container.parent) {
      this.container.parent.removeChild(this.container);
    }
    this.container.removeChildren();
    this.systems.clear();
    this.systemPositions.clear();
  }
}
